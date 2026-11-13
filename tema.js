// Pengaturan tampilan: tema, warna, ukuran teks, bentuk sudut.
// Dimuat setelah app.js. Pilihan tersimpan di browser (berlaku untuk semua akun).
(function () {
  const KEY = "pf-tema";
  const DEF = { mode: "dark", accent: "#3b6fd4", size: "16", radius: "14" };
  const WARNA = [["Biru", "#3b6fd4"], ["Hijau", "#2e9e78"], ["Ungu", "#7c5cff"], ["Oranye", "#e8801a"], ["Merah muda", "#e5558a"], ["Teal", "#14a3b8"]];

  let t;
  try { t = { ...DEF, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) { t = { ...DEF }; }
  const simpanTema = () => { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {} };

  const mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function terapkan() {
    const r = document.documentElement;
    const gelap = t.mode === "auto" ? (mq ? mq.matches : true) : t.mode === "dark";
    r.dataset.theme = gelap ? "dark" : "light";
    r.style.setProperty("--blue", t.accent);
    r.style.setProperty("--fs", t.size + "px");
    r.style.setProperty("--radius", t.radius + "px");
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = gelap ? "#0b0b0c" : "#f1f4f9";
  }
  if (mq && mq.addEventListener) mq.addEventListener("change", terapkan);
  terapkan();

  // Halaman Pengaturan
  const chip = (k, v, l) => `<button type="button" class="chip${t[k] === v ? " on" : ""}" data-set="${k}" data-val="${v}">${l}</button>`;
  V.pengaturan = () => `<header class="page-head"><div><p class="muted">Personalisasi</p><h1>Pengaturan</h1><p class="muted">Ubah tampilan aplikasi sesuai seleranmu.</p></div></header>
    <section class="card">
      <div class="set-row"><h2>Tema</h2><div class="chips">${chip("mode", "dark", "Gelap")}${chip("mode", "light", "Terang")}${chip("mode", "auto", "Ikuti perangkat")}</div></div>
      <div class="set-row"><h2>Warna utama</h2><div class="chips">${WARNA.map(([n, c]) => `<button type="button" class="swatch${t.accent === c ? " on" : ""}" style="background:${c}" data-set="accent" data-val="${c}" aria-label="${n}" aria-pressed="${t.accent === c}" title="${n}"></button>`).join("")}</div></div>
      <div class="set-row"><h2>Ukuran teks</h2><div class="chips">${chip("size", "14", "Kecil")}${chip("size", "16", "Sedang")}${chip("size", "18", "Besar")}</div></div>
      <div class="set-row"><h2>Bentuk sudut</h2><div class="chips">${chip("radius", "6", "Tajam")}${chip("radius", "14", "Sedang")}${chip("radius", "22", "Bulat")}</div></div>
      <div class="set-row"><button class="btn" type="button" data-set="reset">Kembalikan tampilan awal</button></div>
    </section>`;

  // Tautan menu "Pengaturan" (diletakkan sebelum tombol Keluar)
  const nav = document.querySelector(".menu");
  if (nav && !nav.querySelector('[data-page="pengaturan"]')) {
    const a = document.createElement("a");
    a.href = "#"; a.dataset.page = "pengaturan"; a.textContent = "Pengaturan";
    nav.insertBefore(a, document.getElementById("menu-logout"));
  }

  // Tandai halaman aktif di <body> (dipakai CSS untuk kartu utama dashboard)
  const renderAsli = render;
  render = function () { renderAsli(); document.body.dataset.page = page; };
  document.body.dataset.page = page;

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-set]");
    if (!b) return;
    if (b.dataset.set === "reset") t = { ...DEF }; else t[b.dataset.set] = b.dataset.val;
    simpanTema(); terapkan(); render();
  });
})();
