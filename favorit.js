// favorit.js — transaksi favorit (sekali ketuk) + tombol sembunyikan saldo (ikon mata).
// Dimuat paling akhir (setelah app.js, tema.js, hias.js, sinkron.js, animasi.js).
// Favorit disimpan di dalam data akunmu (state.fav), jadi ikut tersinkron dan ikut cadangan.
(function () {
  const KEY = "pf-privasi";
  const gaya = document.createElement("style");
  gaya.textContent = `
    .uang { display: inline-block; transition: filter .2s; }
    html[data-privasi="1"] .uang { filter: blur(8px); user-select: none; }
    .head-aksi { display: flex; gap: 8px; align-items: center; }
    .btn-intip { padding: 8px 10px; line-height: 0; }
    .btn-intip svg { width: 18px; height: 18px; }
    .fav-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .fav-item { display: flex; align-items: stretch; flex: none; border: 1px solid var(--line); border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--panel) 60%, transparent); }
    .fav-main { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border: 0; background: none; color: var(--text); font: inherit; font-size: .88rem; cursor: pointer; }
    .fav-main:hover { background: color-mix(in srgb, var(--text) 7%, transparent); }
    .fav-amt { font-size: .8rem; color: var(--red); }
    .fav-amt.masuk { color: var(--green); }
    .fav-ed, .fav-del { display: none; border: 0; border-left: 1px solid var(--line); background: none; color: var(--muted); padding: 0 11px; cursor: pointer; font: inherit; }
    .fav-box.kelola .fav-ed, .fav-box.kelola .fav-del { display: block; }
    .fav-box.kelola .fav-main { pointer-events: none; opacity: .7; }
    .fav-kosong { font-size: .9rem; }`;
  document.head.appendChild(gaya);

  const view = () => document.getElementById("view");
  const EMOJI = { "Belanja rumah": "🛒", Makan: "🍽️", Transportasi: "🚗", Hiburan: "🎬", Kesehatan: "💊", Pendidikan: "📚", Tagihan: "🧾", Lainnya: "📦", Pemasukan: "💰" };
  const daftar = () => state.fav || (state.fav = []);

  /* ================= A. SEMBUNYIKAN SALDO ================= */
  let privasi = "0";
  try { privasi = localStorage.getItem(KEY) || "0"; } catch (e) {}
  const terapkanPrivasi = () => { document.documentElement.dataset.privasi = privasi; };
  terapkanPrivasi();
  const IKON_MATA = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  const IKON_CORET = '<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.7C3.9 8.4 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>';
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  function isiMata(b) {
    b.innerHTML = svg(privasi === "1" ? IKON_CORET : IKON_MATA);
    b.setAttribute("aria-label", privasi === "1" ? "Tampilkan saldo" : "Sembunyikan saldo");
    b.setAttribute("aria-pressed", privasi === "1");
  }
  function setPrivasi(v) {
    privasi = v;
    try { localStorage.setItem(KEY, v); } catch (e) {}
    terapkanPrivasi();
    document.querySelectorAll("#btn-intip").forEach(isiMata);
    document.querySelectorAll("[data-pilih-privasi]").forEach((c) => c.classList.toggle("on", c.dataset.pilihPrivasi === v));
  }
  // Bungkus setiap nominal "Rp ..." agar bisa disamarkan lewat CSS
  const RE = /[–+-]?Rp\s*[\d.]+/g;
  function bungkus() {
    const w = document.createTreeWalker(view(), NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => n.parentElement && !n.parentElement.closest(".uang, script, style, textarea, option") && /Rp\s*\d/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const list = [];
    while (w.nextNode()) list.push(w.currentNode);
    list.forEach((n) => {
      const s = n.nodeValue, frag = document.createDocumentFragment();
      let last = 0, m; RE.lastIndex = 0;
      while ((m = RE.exec(s))) {
        frag.append(s.slice(last, m.index));
        const sp = document.createElement("span"); sp.className = "uang"; sp.textContent = m[0]; frag.append(sp);
        last = m.index + m[0].length;
      }
      frag.append(s.slice(last)); n.replaceWith(frag);
    });
  }
  function pasangMata() {
    const h = view().querySelector(".page-head");
    if (!h || h.querySelector("#btn-intip")) return;
    const b = document.createElement("button");
    b.type = "button"; b.id = "btn-intip"; b.className = "btn btn-intip"; isiMata(b);
    const aksi = document.createElement("div"); aksi.className = "head-aksi";
    const primer = h.querySelector(":scope > .btn");
    aksi.appendChild(b); if (primer) aksi.appendChild(primer);
    h.appendChild(aksi);
  }

  /* ================= B. TRANSAKSI FAVORIT ================= */
  let kelola = false;
  function htmlFav() {
    const isi = daftar().map((f) => `<div class="fav-item"><button class="fav-main" type="button" data-fav-add="${f.id}"><span>${EMOJI[f.cat] || "🏷️"}</span><span class="fav-nm">${esc(f.name)}</span><span class="fav-amt${f.type === "income" ? " masuk" : ""}">${f.type === "income" ? "+" : ""}${rp(f.amt)}</span></button><button class="fav-ed" type="button" data-fav-edit="${f.id}" aria-label="Ubah favorit">✎</button><button class="fav-del" type="button" data-fav-del="${f.id}" aria-label="Hapus favorit">✕</button></div>`).join("");
    return `<section class="card fav-box${kelola ? " kelola" : ""}" id="fav-box"><div class="card-head"><h2>⚡ Favorit</h2><div class="chips"><button class="btn btn-small" type="button" data-fav="baru">+ Favorit</button>${daftar().length ? `<button class="btn btn-small" type="button" data-fav="kelola">${kelola ? "Selesai" : "Kelola"}</button>` : ""}</div></div>${isi ? `<div class="fav-list">${isi}</div>` : '<p class="muted fav-kosong">Belum ada favorit. Tekan “+ Favorit”, atau tekan ☆ pada transaksi di halaman Transaksi. Setelah itu, satu ketukan langsung mencatatnya.</p>'}</section>`;
  }
  function panelFav() {
    const v = view();
    if (v.querySelector("#fav-box")) return;
    const target = page === "dashboard" ? v.querySelector(".stats") : v.querySelector(".card");
    if (target) target.insertAdjacentHTML("beforebegin", htmlFav());
  }
  function segarkanPanel() { const p = document.getElementById("fav-box"); if (p) { p.outerHTML = htmlFav(); enhance(); } }
  function bintang() {
    view().querySelectorAll('[data-act="edit-tx"]').forEach((e) => {
      const sel = e.closest("td"); if (!sel || sel.querySelector("[data-fav-from]")) return;
      sel.insertAdjacentHTML("beforeend", ` <button class="btn btn-small" type="button" data-fav-from="${e.dataset.id}" title="Simpan sebagai favorit" aria-label="Simpan sebagai favorit">☆</button>`);
    });
  }
  const bentuk = { n: "Favorit", f: () => E.tx.f().filter((f) => f.k !== "date") };
  const akunAda = (id) => state.accounts.some((a) => a.id === id);

  /* ---- sisip & amati ---- */
  let obs = null;
  function enhance() {
    if (document.getElementById("login") || !view()) return;
    if (obs) obs.disconnect();
    try { bungkus(); pasangMata(); if (page === "dashboard" || page === "transaksi") panelFav(); if (page === "transaksi") bintang(); } catch (e) { console.error(e); }
    if (obs) obs.observe(view(), { childList: true, subtree: true });
  }
  let halamanTerakhir = null;
  const renderLama = render;
  render = function () {
    renderLama();
    if (page !== halamanTerakhir) { kelola = false; halamanTerakhir = page; }   // mode Kelola berakhir saat pindah halaman
    if (!daftar().length) kelola = false;                                          // dan saat daftar favorit kosong
    const p = document.getElementById("fav-box");
    if (p && p.classList.contains("kelola") !== kelola) p.outerHTML = htmlFav();
    enhance();
  };
  obs = new MutationObserver(() => enhance());
  enhance();

  /* ---- klik ---- */
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-intip")) { setPrivasi(privasi === "1" ? "0" : "1"); return; }
    const pil = e.target.closest("[data-pilih-privasi]");
    if (pil) { setPrivasi(pil.dataset.pilihPrivasi); return; }

    const f = e.target.closest("[data-fav]");
    if (f) {
      if (f.dataset.fav === "kelola") { kelola = !kelola; segarkanPanel(); }
      else openForm(bentuk, { type: "expense", cat: "Makan", acc: state.accounts[0] && state.accounts[0].id }, (v) => daftar().push({ id: state.nid++, ...v }));
      return;
    }
    const tambah = e.target.closest("[data-fav-add]");
    if (tambah) {
      const it = daftar().find((x) => String(x.id) === tambah.dataset.favAdd);
      if (!it) return;
      const acc = akunAda(it.acc) ? it.acc : state.accounts[0] && state.accounts[0].id;
      if (!acc) { alert("Tambahkan rekening dulu di menu Rekening."); return; }
      state.tx.push({ id: state.nid++, date: today(), name: it.name, cat: it.cat, acc, type: it.type, amt: it.amt });
      commit();
      return;
    }
    const ubah = e.target.closest("[data-fav-edit]");
    if (ubah) {
      const it = daftar().find((x) => String(x.id) === ubah.dataset.favEdit);
      if (it) openForm(bentuk, it, (v) => Object.assign(it, v));
      return;
    }
    const hapus = e.target.closest("[data-fav-del]");
    if (hapus) {
      if (confirm("Hapus favorit ini?")) { state.fav = daftar().filter((x) => String(x.id) !== hapus.dataset.favDel); commit(); }
      return;
    }
    const dari = e.target.closest("[data-fav-from]");
    if (dari) {
      const t = state.tx.find((x) => String(x.id) === dari.dataset.favFrom);
      if (!t) return;
      if (daftar().some((x) => x.name === t.name && x.amt === t.amt && x.cat === t.cat && x.acc === t.acc && x.type === t.type)) { alert("Transaksi ini sudah ada di favorit."); return; }
      daftar().push({ id: state.nid++, name: t.name, amt: t.amt, cat: t.cat, acc: t.acc, type: t.type });
      commit();
    }
  });

  /* ---- Pengaturan: pilihan privasi ---- */
  const chip = (v, l) => `<button type="button" class="chip${privasi === v ? " on" : ""}" data-pilih-privasi="${v}">${l}</button>`;
  const bagian = () => `<section class="card" id="privasi-card"><div class="set-row"><h2>Privasi nominal</h2><div class="chips">${chip("0", "Tampilkan")}${chip("1", "Sembunyikan")}</div><small class="muted">Menyamarkan semua nominal Rp di layar. Berlaku di perangkat ini. Ikon mata di pojok kanan atas tiap halaman bisa mengubahnya dengan cepat.</small></div></section>`;
  const pengaturanLama = V.pengaturan;
  if (pengaturanLama) V.pengaturan = () => {
    const h = pengaturanLama(), i = [h.indexOf('<section class="card" id="anim-card"'), h.indexOf('<section class="card" id="akun-card"')].filter((x) => x >= 0).sort((a, b) => a - b)[0];
    return i === undefined ? h + bagian() : h.slice(0, i) + bagian() + h.slice(i);
  };
})();