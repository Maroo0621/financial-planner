// sinkron.js — login online (Firebase), sinkronisasi data, ubah/hapus akun, pengingat cadangan.
// Dimuat paling akhir (setelah app.js, tema.js, hias.js).
// Selama dua baris di bawah belum diisi, bagian online TIDAK aktif dan login lokal tetap berjalan.
(function () {
  /* ======== ISI DUA BARIS INI DENGAN DATA DARI FIREBASE-MU ======== */
  const FB = Object.assign({
    apiKey: "AIzaSyDcoabTGXSf5z9bNrv24qbDD9AqUqtdfXg",
    projectId: "financial-44de1",
  }, window.PF_FB || {});
  /* ================================================================ */

  const AKTIF = !/^ISI_/.test(FB.apiKey) && !/^ISI_/.test(FB.projectId);
  const H = {
    auth: FB.authHost || "https://identitytoolkit.googleapis.com",
    token: FB.tokenHost || "https://securetoken.googleapis.com",
    fs: FB.fsHost || "https://firestore.googleapis.com",
  };
  const AUTH_KEY = "pf-fb-auth", HARI = 864e5;

  const gaya = document.createElement("style");
  gaya.textContent = `
    .banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; border-left: 4px solid #f59e0b; }
    .banner p { margin-top: 2px; font-size: .88rem; }
    .btn-danger { color: var(--red); border-color: color-mix(in srgb, var(--red) 45%, transparent); }
    .status-box .sync-status { display: block; margin-top: 8px; font-size: .75rem; }
    #akun-card .sync-status { font-size: .85rem; }
    .login-card label.show-pw { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .login-card label.show-pw input { width: auto; margin: 0; }
    .login-ok { color: var(--green) !important; }
    dialog .login-err { margin: 0 0 8px; }`;
  document.head.appendChild(gaya);

  let auth = null;
  try { auth = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { auth = null; }
  const simpanAuth = (a) => { try { a ? localStorage.setItem(AUTH_KEY, JSON.stringify(a)) : localStorage.removeItem(AUTH_KEY); } catch (e) {} };

  /* ================= A. PENGINGAT CADANGAN (selalu aktif) ================= */
  const pengguna = () => sessionStorage.getItem("pf-session") || "";
  const kunci = (n) => "pf-backup-" + n + "-" + pengguna();
  const ambilAngka = (k) => { try { return Number(localStorage.getItem(k)) || 0; } catch (e) { return 0; } };
  const taruhAngka = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };

  function teksCadangan() {
    const last = ambilAngka(kunci("last"));
    if (!last) return "Kamu belum pernah mengunduh cadangan.";
    const h = Math.floor((Date.now() - last) / HARI);
    return "Cadangan terakhir: " + (h < 1 ? "hari ini" : h + " hari lalu") + ".";
  }
  function perluIngatkan() {
    if (!pengguna() || !state || !state.tx || state.tx.length < 3) return false;
    const now = Date.now(), ambang = (auth ? 30 : 14) * HARI;
    if (now < ambilAngka(kunci("snooze"))) return false;
    let dasar = ambilAngka(kunci("last"));
    if (!dasar) {
      dasar = ambilAngka(kunci("since"));
      if (!dasar) { taruhAngka(kunci("since"), now); return false; }
    }
    return now - dasar > ambang;
  }
  function pasangBanner() {
    if (page !== "dashboard" || document.getElementById("login") || document.getElementById("banner-cadangan") || !perluIngatkan()) return;
    const h = document.querySelector("#view .page-head");
    if (!h) return;
    const pesan = auth
      ? "Datamu sudah tersinkron online, tetapi file cadangan tetap berguna sebagai arsip."
      : "Datamu hanya ada di perangkat ini. Unduh cadangan agar aman jika browser dibersihkan atau HP hilang.";
    h.insertAdjacentHTML("afterend", `<section class="card banner" id="banner-cadangan"><div><strong>💾 Waktunya mencadangkan data</strong><p class="muted">${pesan} ${teksCadangan()}</p></div><div class="chips"><button class="btn btn-primary btn-small" type="button" data-act="backup">Unduh cadangan</button><button class="btn btn-small" type="button" data-banner="nanti">Ingatkan nanti</button></div></section>`);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-act="backup"]')) {
      taruhAngka(kunci("last"), Date.now());
      const b = document.getElementById("banner-cadangan"); if (b) b.remove();
      const t = document.getElementById("akun-cadangan"); if (t) t.textContent = teksCadangan();
    }
    if (e.target.closest('[data-banner="nanti"]')) {
      taruhAngka(kunci("snooze"), Date.now() + 3 * HARI);
      const b = document.getElementById("banner-cadangan"); if (b) b.remove();
    }
  }, true);
  const renderA = render;
  render = function () { renderA(); pasangBanner(); };

  if (!AKTIF) { console.info("sinkron.js: Firebase belum diisi, memakai login lokal."); return; }

  /* ================= B. LOGIN ONLINE + SINKRONISASI ================= */
  const PESAN = {
    EMAIL_EXISTS: "Email sudah terdaftar. Silakan masuk.",
    INVALID_LOGIN_CREDENTIALS: "Email atau kata sandi salah.",
    EMAIL_NOT_FOUND: "Email atau kata sandi salah.",
    INVALID_PASSWORD: "Email atau kata sandi salah.",
    INVALID_EMAIL: "Format email tidak valid.",
    MISSING_PASSWORD: "Kata sandi belum diisi.",
    WEAK_PASSWORD: "Kata sandi terlalu lemah (minimal 6 karakter).",
    TOO_MANY_ATTEMPTS_TRY_LATER: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
    OPERATION_NOT_ALLOWED: "Login email/kata sandi belum diaktifkan di Firebase.",
    USER_DISABLED: "Akun ini dinonaktifkan.",
    PERMISSION_DENIED: "Akses ditolak. Periksa aturan keamanan Firestore.",
  };
  const teksError = (e) => {
    if (e.jaringan) return "Tidak ada koneksi internet.";
    const m = String(e.message || ""), k = Object.keys(PESAN).find((x) => m.startsWith(x));
    return k ? PESAN[k] : "Terjadi kesalahan (" + m + ").";
  };
  const sesiHabis = (e) => /TOKEN_EXPIRED|USER_NOT_FOUND|USER_DISABLED|INVALID_REFRESH_TOKEN|INVALID_GRANT/.test(String(e.message || ""));

  async function kirim(url, opsi) {
    let r;
    try { r = await fetch(url, opsi); } catch (e) { const x = new Error("NETWORK"); x.jaringan = true; throw x; }
    let j = null;
    try { j = await r.json(); } catch (e) {}
    if (!r.ok) {
      const x = new Error((j && j.error && (j.error.message || j.error.status)) || "HTTP_" + r.status);
      x.status = r.status; throw x;
    }
    return j;
  }
  const ident = (ep, body) => kirim(`${H.auth}/v1/${ep}?key=${FB.apiKey}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  function catatAuth(j, email) {
    auth = {
      email: email || j.email || (auth && auth.email),
      uid: j.localId || j.user_id || (auth && auth.uid),
      id: j.idToken || j.id_token,
      refresh: j.refreshToken || j.refresh_token,
      exp: Date.now() + Number(j.expiresIn || j.expires_in || 3600) * 1000,
    };
    simpanAuth(auth);
  }
  async function segarkan() {
    const j = await kirim(`${H.token}/v1/token?key=${FB.apiKey}`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(auth.refresh) });
    catatAuth(j);
  }
  async function tokenId() {
    if (!auth) throw new Error("NO_AUTH");
    if (Date.now() > auth.exp - 60000) await segarkan();
    return auth.id;
  }
  const urlDok = () => `${H.fs}/v1/projects/${FB.projectId}/databases/(default)/documents/users/${auth.uid}`;
  async function fs(metode, tubuh, query, ulang) {
    const t = await tokenId();
    try {
      return await kirim(urlDok() + (query || ""), { method: metode, headers: { Authorization: "Bearer " + t, "Content-Type": "application/json" }, body: tubuh ? JSON.stringify(tubuh) : undefined });
    } catch (e) {
      if (e.status === 401 && !ulang) { await segarkan(); return fs(metode, tubuh, query, true); }
      throw e;
    }
  }
  async function ambil() {
    try { const d = await fs("GET"); return JSON.parse(d.fields.json.stringValue); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  const dorongSekarang = () => fs("PATCH", { fields: { json: { stringValue: JSON.stringify(state) }, ts: { integerValue: String(state._ts || Date.now()) } } }, "?updateMask.fieldPaths=json&updateMask.fieldPaths=ts");

  /* ---------- status & jadwal sinkron ---------- */
  let status = "", timer = null, tertunda = false, sibuk = false, simpanLokal = null;
  const jam = () => new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  function setStatus(t) { status = t; document.querySelectorAll(".sync-status").forEach((e) => (e.textContent = t)); }
  function jadwal() { tertunda = true; setStatus("☁️ Menunggu sinkron…"); clearTimeout(timer); timer = setTimeout(dorong, 1500); }
  async function dorong() {
    if (!auth) return;
    if (sibuk) { clearTimeout(timer); timer = setTimeout(dorong, 1000); return; }
    sibuk = true;
    try { await dorongSekarang(); tertunda = false; setStatus("☁️ Tersinkron " + jam()); }
    catch (e) { tertunda = true; setStatus(e.jaringan ? "☁️ Offline, disinkronkan nanti" : "☁️ Gagal sinkron: " + teksError(e)); }
    sibuk = false;
  }
  function pasangSave() {
    simpanLokal = save;
    save = function () { state._ts = Date.now(); simpanLokal(); if (auth) jadwal(); };
  }
  function adopsi(c) {
    state = c; norm(); simpanLokal();
    if (window.hiasReset) window.hiasReset();
    render();
  }
  async function sinkronLengkap() {
    const c = await ambil();
    if (c && (c._ts || 0) > (state._ts || 0)) adopsi(c); else await dorongSekarang();
    tertunda = false; setStatus("☁️ Tersinkron " + jam());
  }
  async function tarik() {
    if (!auth || tertunda || sibuk) return;
    try { const c = await ambil(); if (c && (c._ts || 0) > (state._ts || 0)) adopsi(c); setStatus("☁️ Tersinkron " + jam()); }
    catch (e) { setStatus(e.jaringan ? "☁️ Offline" : "☁️ Gagal sinkron: " + teksError(e)); }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") tarik(); });
  window.addEventListener("online", () => { if (auth && tertunda) dorong(); });

  /* ---------- masuk ke aplikasi ---------- */
  function tawarkanDataLokal() {
    const milik = "pf-data-u-" + auth.email;
    let terbaik = null;
    Object.keys(localStorage).filter((k) => k.startsWith("pf-data-u-") && k !== milik).forEach((k) => {
      try { const s = JSON.parse(localStorage.getItem(k)); if (s && s.tx && (!terbaik || s.tx.length > terbaik.s.tx.length)) terbaik = { k, s }; } catch (e) {}
    });
    if (!terbaik || !terbaik.s.tx.length || (state.tx && state.tx.length)) return;
    if (confirm("Ditemukan data lokal akun lama \"" + terbaik.k.replace("pf-data-u-", "") + "\" (" + terbaik.s.tx.length + " transaksi). Pakai sebagai data awal akun online ini?")) {
      state = terbaik.s; norm(); if (window.hiasReset) window.hiasReset();
      save(); render();
    }
  }
  async function masuk(email, baru) {
    const renderAsli = render;
    render = function () {};            // tahan gambar ulang sampai data siap
    try { startSession(email); } finally { render = renderAsli; }
    if (window.hiasReset) window.hiasReset();
    pasangSave();
    const out = document.getElementById("menu-logout");
    if (out) out.textContent = "Keluar (" + email.split("@")[0] + ")";
    const kotak = document.querySelector(".status-box");
    if (kotak && !kotak.querySelector(".sync-status")) kotak.insertAdjacentHTML("beforeend", '<small class="sync-status muted"></small>');
    if (kotak) { const t = kotak.querySelector("strong"), p = kotak.querySelector("p"); if (t) t.textContent = "Tersimpan online"; if (p) p.textContent = "Disalin ke akunmu dan ke perangkat ini."; }
    render();
    if (baru) tawarkanDataLokal();
    setStatus("☁️ Menyinkronkan…");
    try { await sinkronLengkap(); }
    catch (e) {
      if (sesiHabis(e)) { auth = null; simpanAuth(null); sessionStorage.removeItem("pf-session"); location.reload(); return; }
      tertunda = true; setStatus(e.jaringan ? "☁️ Offline, disinkronkan nanti" : "☁️ Gagal sinkron: " + teksError(e));
    }
  }
  const logoutAsli = logout;
  logout = function () {
    if (auth && !tertunda) { try { localStorage.removeItem("pf-data-u-" + auth.email); } catch (e) {} }
    auth = null; simpanAuth(null); logoutAsli();
  };

  /* ---------- layar login (email + kata sandi) ---------- */
  function ubahForm() {
    const f = document.querySelector("#login form");
    if (!f) return;
    const reg = loginMode === "register";
    f.innerHTML = `<div class="logo">PF</div>
      <h1>${reg ? "Buat akun" : "Masuk"}</h1>
      <label>Email<input name="email" type="email" autocomplete="username" required></label>
      <label>Kata sandi<input name="pw" type="password" autocomplete="${reg ? "new-password" : "current-password"}" required></label>
      ${reg ? '<label>Ulangi kata sandi<input name="pw2" type="password" autocomplete="new-password" required></label>' : ""}
      <label class="show-pw"><input type="checkbox" id="show-pw"> Tampilkan kata sandi</label>
      <p class="login-err" role="alert"></p>
      <button class="btn btn-primary" type="submit">${reg ? "Daftar" : "Masuk"}</button>
      ${reg ? "" : '<button class="link-btn" type="button" id="lupa-pw">Lupa kata sandi?</button>'}
      <button class="link-btn" type="button" id="login-switch">${reg ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</button>`;
  }
  const showLoginAsli = typeof showLogin === "function" ? showLogin : null;
  if (showLoginAsli) showLogin = function () { showLoginAsli(); ubahForm(); };

  document.addEventListener("submit", async (ev) => {
    const f = ev.target;
    if (!f.closest || !f.closest("#login")) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const email = f.email.value.trim().toLowerCase(), pw = f.pw.value, reg = loginMode === "register";
    const err = f.querySelector(".login-err"), tombol = f.querySelector('[type="submit"]');
    err.className = "login-err";
    if (reg && pw.length < 6) { err.textContent = "Kata sandi minimal 6 karakter."; return; }
    if (reg && pw !== f.pw2.value) { err.textContent = "Ulangi kata sandi tidak sama."; return; }
    tombol.disabled = true; err.textContent = "";
    try {
      const j = await ident(reg ? "accounts:signUp" : "accounts:signInWithPassword", { email, password: pw, returnSecureToken: true });
      catatAuth(j, email);
      await masuk(email, reg);
    } catch (e) { err.textContent = teksError(e); tombol.disabled = false; }
  }, true);

  document.addEventListener("click", async (ev) => {
    if (ev.target.id === "lupa-pw") {
      const f = ev.target.closest("form"), err = f.querySelector(".login-err"), email = f.email.value.trim().toLowerCase();
      if (!email) { err.className = "login-err"; err.textContent = "Isi email dulu, lalu klik Lupa kata sandi."; return; }
      try { await ident("accounts:sendOobCode", { requestType: "PASSWORD_RESET", email }); } catch (e) { if (!/EMAIL_NOT_FOUND/.test(e.message)) { err.className = "login-err"; err.textContent = teksError(e); return; } }
      err.className = "login-err login-ok"; err.textContent = "Jika email terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim.";
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "show-pw") document.querySelectorAll('#login input[name="pw"], #login input[name="pw2"]').forEach((i) => { i.type = e.target.checked ? "text" : "password"; });
  });

  /* ---------- bagian "Akun" di halaman Pengaturan ---------- */
  function bagianAkun() {
    return `<section class="card" id="akun-card"><div class="card-head"><h2>Akun &amp; sinkronisasi</h2></div>
      <div class="set-row"><strong>${esc(auth.email)}</strong><small class="muted sync-status">${esc(status)}</small></div>
      <div class="set-row"><div class="chips">
        <button class="btn" type="button" data-akun="sync">Sinkronkan sekarang</button>
        <button class="btn" type="button" data-act="backup">Unduh cadangan</button>
        <button class="btn" type="button" data-akun="pass">Ubah kata sandi</button>
        <button class="btn btn-danger" type="button" data-akun="hapus">Hapus akun</button></div>
        <small class="muted" id="akun-cadangan">${teksCadangan()}</small></div></section>`;
  }
  const pengaturanAsli = V.pengaturan;
  V.pengaturan = () => (pengaturanAsli ? pengaturanAsli() : head("Pengaturan", "Akun")) + (auth ? bagianAkun() : "");

  function dialog(judul, isi, aksi) {
    let d = document.getElementById("dlg-akun");
    if (!d) { d = document.createElement("dialog"); d.id = "dlg-akun"; document.body.appendChild(d); }
    d.innerHTML = `<form><h2>${judul}</h2>${isi}<p class="login-err" role="alert"></p><div class="form-actions"><button class="btn" type="button" data-tutup>Batal</button><button class="btn btn-primary" type="submit">Lanjut</button></div></form>`;
    const f = d.querySelector("form");
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = f.querySelector('[type="submit"]'); b.disabled = true;
      const m = await aksi(f);
      if (m) { f.querySelector(".login-err").textContent = m; b.disabled = false; } else d.close();
    });
    d.querySelector("[data-tutup]").addEventListener("click", () => d.close());
    d.showModal();
  }
  const verifikasi = (pw) => ident("accounts:signInWithPassword", { email: auth.email, password: pw, returnSecureToken: true });

  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-akun]");
    if (!b || !auth) return;
    const aksi = b.dataset.akun;
    if (aksi === "sync") {
      setStatus("☁️ Menyinkronkan…");
      try { await sinkronLengkap(); } catch (e) { setStatus(e.jaringan ? "☁️ Offline" : "☁️ Gagal sinkron: " + teksError(e)); }
    }
    if (aksi === "pass") {
      dialog("Ubah kata sandi", `<label>Kata sandi lama<input name="lama" type="password" autocomplete="current-password" required></label>
        <label>Kata sandi baru<input name="baru" type="password" autocomplete="new-password" required></label>
        <label>Ulangi kata sandi baru<input name="baru2" type="password" autocomplete="new-password" required></label>`, async (f) => {
        if (f.baru.value.length < 6) return "Kata sandi baru minimal 6 karakter.";
        if (f.baru.value !== f.baru2.value) return "Ulangi kata sandi baru tidak sama.";
        try {
          const j = await verifikasi(f.lama.value);
          const k = await ident("accounts:update", { idToken: j.idToken, password: f.baru.value, returnSecureToken: true });
          catatAuth(k, auth.email);
          alert("Kata sandi berhasil diubah.");
          return null;
        } catch (e) { return teksError(e); }
      });
    }
    if (aksi === "hapus") {
      dialog("Hapus akun", `<p class="muted">Semua data keuanganmu di server dan di perangkat ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
        <p><button class="link-btn" type="button" data-act="backup">Unduh cadangan dulu</button></p>
        <label>Kata sandi<input name="pw" type="password" autocomplete="current-password" required></label>
        <label>Ketik HAPUS untuk melanjutkan<input name="kon" autocomplete="off" required></label>`, async (f) => {
        if (f.kon.value.trim() !== "HAPUS") return "Ketik HAPUS (huruf besar) untuk melanjutkan.";
        try {
          catatAuth(await verifikasi(f.pw.value), auth.email);
          try { await fs("DELETE"); } catch (e) { if (e.status !== 404) throw e; }
          await ident("accounts:delete", { idToken: auth.id });
          try { localStorage.removeItem("pf-data-u-" + auth.email); } catch (e) {}
          auth = null; simpanAuth(null); sessionStorage.removeItem("pf-session");
          alert("Akun dan datamu sudah dihapus.");
          location.reload();
          return null;
        } catch (e) { return teksError(e); }
      });
    }
  });

  /* ---------- mulai: pulihkan sesi bila ada ---------- */
  if (!auth && sessionStorage.getItem("pf-session")) { sessionStorage.removeItem("pf-session"); location.reload(); return; }
  const kotakLogin = document.getElementById("login");
  if (kotakLogin) {
    ubahForm();
    if (auth) {
      kotakLogin.style.visibility = "hidden";
      masuk(auth.email, false).then(() => { if (!sessionStorage.getItem("pf-session")) kotakLogin.style.visibility = "visible"; });
    }
  }
})();
