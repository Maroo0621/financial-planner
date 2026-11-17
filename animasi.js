// animasi.js — angka berjalan, batang terisi, donat bertahap, baris baru, konfeti, ripple,
// ikon sinkron berdenyut, latar login bergerak, getaran singkat, dan pilihan Penuh/Hemat/Mati.
// Dimuat paling akhir (setelah app.js, tema.js, hias.js, sinkron.js).
(function () {
  const KEY = "pf-animasi";
  const kurangiGerak = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const mode = () => { try { return localStorage.getItem(KEY) || (kurangiGerak ? "mati" : "penuh"); } catch (e) { return "penuh"; } };
  const terapkan = () => { document.documentElement.dataset.anim = mode(); };
  terapkan();

  const gaya = document.createElement("style");
  gaya.textContent = `
    [data-anim="mati"] *, [data-anim="mati"] *::before, [data-anim="mati"] *::after { animation: none !important; transition: none !important; }
    [data-anim="hemat"] #login::before, [data-anim="hemat"] #login::after { display: none; }
    [data-anim="hemat"] .donut svg { animation: none; }
    .btn, .chip { position: relative; overflow: hidden; }
    .ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,.35); transform: scale(0); animation: riak .6s ease-out forwards; pointer-events: none; }
    @keyframes riak { to { transform: scale(1); opacity: 0; } }
    .baru-baris td { animation: barisMasuk .8s ease both; }
    @keyframes barisMasuk { from { opacity: 0; transform: translateX(-16px); background: color-mix(in srgb, var(--green) 28%, transparent); } to { opacity: 1; transform: none; background: transparent; } }
    .sync-status.sibuk { animation: denyut 1s ease-in-out infinite; }
    @keyframes denyut { 50% { opacity: .35; } }
    #login { overflow: hidden; }
    .login-card { position: relative; z-index: 1; }
    #login::before, #login::after { content: ""; position: absolute; width: 380px; height: 380px; border-radius: 50%; filter: blur(70px); opacity: .35; pointer-events: none; }
    #login::before { left: -120px; top: -100px; background: var(--blue); animation: melayang 14s ease-in-out infinite alternate; }
    #login::after { right: -120px; bottom: -100px; background: var(--green); animation: melayang 17s ease-in-out infinite alternate-reverse; }
    @keyframes melayang { to { transform: translate(90px, 70px) scale(1.2); } }`;
  document.head.appendChild(gaya);

  const view = () => document.getElementById("view");
  const user = () => sessionStorage.getItem("pf-session") || "";
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  /* ---- angka berjalan ---- */
  function baca(el) {
    const t = el.textContent.trim();
    let m = t.match(/^([–-]?)Rp\s*([\d.]+)$/);
    if (m) return { nilai: (m[1] ? -1 : 1) * Number(m[2].replace(/\./g, "")), tipe: "rp", asli: t };
    m = t.match(/^(\d+)%$/);
    return m ? { nilai: Number(m[1]), tipe: "pct", asli: t } : null;
  }
  const format = (n, tipe) => tipe === "pct" ? Math.round(n) + "%" : (n < 0 ? "–" : "") + "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID");
  function hitung(el, p, dari) {
    const t0 = performance.now(), dur = 800, token = (el._tok = (el._tok || 0) + 1);
    (function f(t) {
      if (el._tok !== token) return;
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = k >= 1 ? p.asli : format(dari + (p.nilai - dari) * ease(k), p.tipe);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }
  let prevAngka = [];
  function angka(ganti, m) {
    const els = [...view().querySelectorAll(".stats .big")], now = els.map(baca);
    if (m === "penuh") els.forEach((el, i) => {
      if (!now[i]) return;
      const dari = ganti || prevAngka[i] === undefined ? 0 : prevAngka[i];
      if (dari !== now[i].nilai) hitung(el, now[i], dari);
    });
    prevAngka = now.map((p) => (p ? p.nilai : undefined));
  }

  /* ---- batang progres terisi ---- */
  function batang(m) {
    const dur = m === "penuh" ? 0.9 : 0.4;
    view().querySelectorAll(".bar span").forEach((el, i) => {
      const w = el.style.width;
      el.style.transition = "none"; el.style.width = "0%"; void el.offsetWidth;
      el.style.transition = `width ${dur}s cubic-bezier(.2,.8,.2,1) ${i * 0.06}s`; el.style.width = w;
    });
  }

  /* ---- donat tergambar bertahap ---- */
  function donat() {
    [...view().querySelectorAll("#hias-dash svg circle")].slice(1).forEach((c, i) => {
      c.animate([{ strokeDasharray: "0 100" }, { strokeDasharray: c.getAttribute("stroke-dasharray") }], { duration: 700, delay: 200 + i * 160, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
    });
  }

  /* ---- baris baru ---- */
  const kunciBaris = {};
  function barisBaru(ganti) {
    const rows = [...view().querySelectorAll("tbody tr")], keys = rows.map((r) => r.textContent.replace(/\s+/g, " ").trim()), lama = kunciBaris[page];
    if (!ganti && lama) rows.forEach((r, i) => { if (!lama.has(keys[i])) r.classList.add("baru-baris"); });
    kunciBaris[page] = new Set(keys);
  }

  /* ---- konfeti & getaran ---- */
  function kembang() {
    const c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:300";
    c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    const g = c.getContext("2d"), warna = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
    const p = Array.from({ length: 110 }, () => ({ x: c.width / 2 + (Math.random() - 0.5) * 160, y: c.height * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: warna[(Math.random() * warna.length) | 0] }));
    const t0 = performance.now();
    (function f(t) {
      const e = t - t0; g.clearRect(0, 0, c.width, c.height);
      p.forEach((q) => { q.vy += 0.35; q.x += q.vx; q.y += q.vy; q.vx *= 0.99; q.r += q.vr; g.save(); g.translate(q.x, q.y); g.rotate(q.r); g.globalAlpha = Math.max(0, 1 - e / 2400); g.fillStyle = q.c; g.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); g.restore(); });
      if (e < 2400) requestAnimationFrame(f); else c.remove();
    })(t0);
  }
  const getar = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };
  const hitungSelesai = () => new Set((state.goals || []).filter((g) => g.target > 0 && g.saved >= g.target).map((g) => String(g.id)));
  let lastUser = user(), lastSnap = JSON.stringify(state), prevSelesai = hitungSelesai(), lastPage = null;

  /* ---- setelah setiap render ---- */
  function sesudahRender() {
    if (!view() || document.getElementById("login")) return;
    const m = mode(), ganti = page !== lastPage, snap = JSON.stringify(state), selesai = hitungSelesai();
    if (user() !== lastUser) lastUser = user();
    else {
      if (snap !== lastSnap && m !== "mati") getar();
      if (m === "penuh") for (const id of selesai) if (!prevSelesai.has(id)) { kembang(); break; }
    }
    lastSnap = snap; prevSelesai = selesai;
    angka(ganti, m);
    if (m !== "mati") { if (ganti) batang(m); if (ganti && m === "penuh") donat(); barisBaru(ganti); }
    lastPage = page;
  }
  const renderLama = render;
  render = function () { renderLama(); try { sesudahRender(); } catch (e) { console.error(e); } };

  /* ---- ripple pada tombol ---- */
  document.addEventListener("pointerdown", (e) => {
    if (mode() !== "penuh") return;
    const b = e.target.closest(".btn, .chip");
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement("span");
    s.className = "ripple"; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 650);
  });

  /* ---- ikon/teks sinkron berdenyut ---- */
  new MutationObserver((muts) => muts.forEach((mu) => {
    const el = mu.target.nodeType === 1 ? mu.target : mu.target.parentElement;
    if (el && el.classList && el.classList.contains("sync-status")) el.classList.toggle("sibuk", /Menyinkronkan|Menunggu/.test(el.textContent));
  })).observe(document.body, { childList: true, subtree: true, characterData: true });

  /* ---- pilihan di Pengaturan ---- */
  const chip = (v, l) => `<button type="button" class="chip${mode() === v ? " on" : ""}" data-pilih-anim="${v}">${l}</button>`;
  const bagian = () => `<section class="card" id="anim-card"><div class="set-row"><h2>Animasi</h2><div class="chips">${chip("penuh", "Penuh")}${chip("hemat", "Hemat")}${chip("mati", "Mati")}</div><small class="muted">Hemat: tanpa efek besar (konfeti, angka berjalan, latar login bergerak). Mati: tanpa gerakan sama sekali. Berlaku di perangkat ini.</small></div></section>`;
  const pengaturanLama = V.pengaturan;
  if (pengaturanLama) V.pengaturan = () => { const h = pengaturanLama(), i = h.indexOf('<section class="card" id="akun-card"'); return i < 0 ? h + bagian() : h.slice(0, i) + bagian() + h.slice(i); };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pilih-anim]");
    if (!b) return;
    try { localStorage.setItem(KEY, b.dataset.pilihAnim); } catch (x) {}
    terapkan(); render();
  });
})();
