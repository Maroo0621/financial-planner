// Tambahan tampilan: ikon, donat, sapaan, toast "Urungkan", tombol + melayang.
// Dimuat setelah app.js (dan tema.js). Tidak mengubah data apa pun.
(function () {
  const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const IKON = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    transaksi: '<path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/>',
    anggaran: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    tabungan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    utang: '<path d="M12 2v20M17 6.5C16 5 14.5 4 12 4S8 5.3 8 7s1.5 2.5 4 3 4 1.3 4 3-1.5 3-4 3-4-1-5-2.5"/>',
    rutin: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    rekening: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14.5" r="1"/>',
    laporan: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
    pengaturan: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    keluar: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  };
  const EMOJI = { "Belanja rumah": "🛒", Makan: "🍽️", Transportasi: "🚗", Hiburan: "🎬", Kesehatan: "💊", Pendidikan: "📚", Tagihan: "🧾", Lainnya: "📦", Pemasukan: "💰" };
  const WARNA = ["#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#ef4444", "#94a3b8"];
  const FAB = { dashboard: "add-tx", transaksi: "add-tx", anggaran: "add-bud", tabungan: "add-goal", utang: "add-debt", rutin: "add-rec", rekening: "add-acc" };
  const NAMA = { tx: "Transaksi", budgets: "Anggaran", goals: "Target tabungan", debts: "Catatan utang/piutang", rec: "Transaksi rutin", accounts: "Rekening" };
  const view = () => document.getElementById("view");
  let obs = null, lastSnap = null, lastUser = null, undoing = false, tTimer = null;

  /* ---- percantik halaman ---- */
  function menu() {
    document.querySelectorAll(".menu a").forEach((a) => {
      if (a.querySelector(".ic")) return;
      const k = a.id === "menu-logout" ? "keluar" : a.dataset.page;
      if (!IKON[k]) return;
      const s = document.createElement("span");
      s.className = "ic"; s.innerHTML = svg(IKON[k]);
      a.insertBefore(s, a.firstChild);
    });
  }
  function emoji() {
    view().querySelectorAll("td, .item .row > span:first-child").forEach((el) => {
      if (el.dataset.ce) return;
      const e = EMOJI[el.textContent.trim()];
      if (!e) return;
      el.dataset.ce = "1";
      el.insertAdjacentHTML("afterbegin", `<span class="ce">${e}</span>`);
    });
  }
  function kosongRamah() {
    view().querySelectorAll("td[colspan]").forEach((td) => {
      if (td.dataset.ce || !/Belum ada data/.test(td.textContent)) return;
      td.dataset.ce = "1"; td.className = "kosong";
      td.innerHTML = '<div class="empty"><div class="empty-ic">🗂️</div><strong>Belum ada data</strong><small class="muted">Tekan tombol “+” untuk mulai mencatat.</small></div>';
    });
  }
  function dashboard() {
    const v = view();
    if (v.querySelector("#hias-dash")) return;
    const stats = v.querySelector(".stats");
    if (!stats) return;
    const jam = new Date().getHours();
    const salam = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam";
    const user = sessionStorage.getItem("pf-session");
    const sub = v.querySelector(".page-head p.muted");
    if (sub) sub.textContent = salam + (user ? ", " + user : "") + " 👋";

    const m = mo();
    const semua = [...new Set([...KAT, ...state.tx.filter((t) => t.type === "expense").map((t) => t.cat)])];
    const data = semua.map((c, i) => [c, used(c, m), WARNA[i % WARNA.length]]).filter((x) => x[1] > 0);
    const total = data.reduce((a, x) => a + x[1], 0), masuk = tot(m, "income"), sisa = masuk - total;
    const kalimat = !masuk && !total ? "Belum ada transaksi bulan ini. Yuk catat yang pertama!"
      : sisa >= 0 ? `Bulan ini kamu menyisihkan <strong class="green">${rp(sisa)}</strong> dari pemasukan.`
      : `Pengeluaran bulan ini melebihi pemasukan sebesar <strong class="red">${rp(-sisa)}</strong>.`;
    let cum = 0;
    const seg = data.map(([, val, col]) => {
      const p = (val / total) * 100;
      const c = `<circle cx="21" cy="21" r="15.9155" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${p} ${100 - p}" stroke-dashoffset="${25 - cum}"/>`;
      cum += p; return c;
    }).join("");
    const legend = data.map(([c, val, col]) => `<div><i style="background:${col}"></i><span>${EMOJI[c] || "🏷️"} ${esc(c)}</span><b>${rp(val)}</b><small class="muted">${Math.round((val / total) * 100)}%</small></div>`).join("");
    const sec = document.createElement("section");
    sec.className = "card donut-card"; sec.id = "hias-dash";
    sec.innerHTML = total
      ? `<div class="donut"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--line)" stroke-width="5"/>${seg}</svg><div class="donut-mid"><small class="muted">Pengeluaran</small><b>${rp(total)}</b></div></div>
         <div class="donut-info"><h2>Pengeluaran per kategori</h2><p class="muted">${kalimat}</p><div class="legend">${legend}</div></div>`
      : `<div class="donut-empty"><h2>Pengeluaran per kategori</h2><p class="muted">${kalimat}</p></div>`;
    stats.insertAdjacentElement("afterend", sec);
  }
  function fab() {
    let f = document.getElementById("fab");
    if (!f) {
      f = document.createElement("button");
      f.id = "fab"; f.type = "button"; f.className = "fab"; f.textContent = "+";
      f.setAttribute("aria-label", "Tambah data");
      document.body.appendChild(f);
    }
    const a = FAB[page];
    f.hidden = !a;
    if (a) f.dataset.act = a;
  }
  function enhance() {
    if (document.getElementById("login") || !view()) return;
    if (obs) obs.disconnect();
    try { menu(); emoji(); kosongRamah(); if (page === "dashboard") dashboard(); fab(); } catch (e) { console.error(e); }
    if (obs) obs.observe(view(), { childList: true, subtree: true });
  }

  /* ---- notifikasi + urungkan ---- */
  function toast(msg, undo) {
    let t = document.getElementById("toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "toast"; t.setAttribute("role", "status");
      document.body.appendChild(t);
      t.addEventListener("click", (e) => {
        if (e.target.closest("[data-undo]") && t._undo) { const f = t._undo; t._undo = null; t.classList.remove("show"); f(); }
      });
    }
    t._undo = undo;
    t.innerHTML = `<span>${msg}</span>${undo ? '<button type="button" data-undo>Urungkan</button>' : ""}`;
    t.classList.add("show");
    clearTimeout(tTimer);
    tTimer = setTimeout(() => t.classList.remove("show"), 5000);
  }
  function notify(prevSnap, curSnap) {
    let a, b;
    try { a = JSON.parse(prevSnap); b = JSON.parse(curSnap); } catch (e) { return; }
    let msg = "Perubahan tersimpan ✓";
    for (const k of Object.keys(NAMA)) {
      const x = (a[k] || []).length, y = (b[k] || []).length;
      if (y > x) { msg = NAMA[k] + " ditambahkan ✓"; break; }
      if (y < x) { msg = NAMA[k] + " dihapus"; break; }
    }
    toast(msg, () => { undoing = true; state = JSON.parse(prevSnap); save(); render(); });
  }

  /* ---- sambungkan ke render() ---- */
  function setelahRender() {
    const user = sessionStorage.getItem("pf-session") || "";
    const snap = JSON.stringify(state);
    if (undoing) { undoing = false; lastSnap = snap; }
    else if (user !== lastUser) { lastUser = user; lastSnap = snap; }
    else if (snap !== lastSnap) { const prev = lastSnap; lastSnap = snap; notify(prev, snap); }
    enhance();
  }
  const renderSebelumnya = render;
  render = function () { renderSebelumnya(); setelahRender(); };

  obs = new MutationObserver(() => enhance());
  lastUser = sessionStorage.getItem("pf-session") || "";
  lastSnap = JSON.stringify(state);
  enhance();
})();
