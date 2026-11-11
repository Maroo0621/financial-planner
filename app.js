/* ===== 1. DATA ===== */
const KEY = "pf-data-v2";
const KAT = ["Belanja rumah", "Makan", "Transportasi", "Hiburan", "Kesehatan", "Pendidikan", "Tagihan", "Lainnya"];
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rp = (n) => (n < 0 ? "–" : "") + "Rp " + Math.abs(Math.round(n)).toLocaleString("id-ID");
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

function seed() {
  const d = today();
  const t = (id, name, cat, acc, type, amt) => ({ id, date: d, name, cat, acc, type, amt });
  return {
    nid: 100,
    accounts: [{ id: "a1", name: "Rekening Utama", start: 3000000 }, { id: "a2", name: "E-Wallet", start: 500000 }, { id: "a3", name: "Tunai", start: 850000 }],
    tx: [t(1, "Gaji", "Pemasukan", "a1", "income", 7500000), t(2, "Belanja bulanan", "Belanja rumah", "a1", "expense", 1200000),
      t(3, "Makan keluarga", "Makan", "a3", "expense", 450000), t(4, "Bensin", "Transportasi", "a1", "expense", 350000), t(5, "Rekreasi", "Hiburan", "a2", "expense", 250000)],
    budgets: [{ id: 6, cat: "Belanja rumah", limit: 1800000 }, { id: 7, cat: "Makan", limit: 1000000 }, { id: 8, cat: "Transportasi", limit: 600000 }, { id: 9, cat: "Hiburan", limit: 500000 }],
    goals: [{ id: 10, name: "Dana darurat", target: 15000000, saved: 4500000 }, { id: 11, name: "Liburan keluarga", target: 5000000, saved: 1500000 }],
    debts: [], rec: [],
  };
}
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.tx) return s; } catch (e) {} return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
let state = load();
function norm() { ["accounts", "tx", "budgets", "goals", "debts", "rec"].forEach((k) => (state[k] = state[k] || [])); state.nid = state.nid || 1000; }
norm();

// Transaksi rutin: dibuat otomatis 1x per bulan saat tanggalnya tiba
function runRec() {
  const t = today(), m = t.slice(0, 7); let n = 0;
  state.rec.forEach((r) => {
    if (r.last !== m && +t.slice(8) >= r.day && state.accounts.some((a) => a.id === r.acc)) {
      state.tx.push({ id: state.nid++, date: m + "-" + String(r.day).padStart(2, "0"), name: r.name, cat: r.cat, acc: r.acc, type: r.type, amt: r.amt });
      r.last = m; n++;
    }
  });
  if (n) save();
}

/* ===== 2. PERHITUNGAN ===== */
const mo = () => today().slice(0, 7);
const tot = (m, type) => sum(state.tx.filter((t) => t.type === type && (!m || t.date.startsWith(m))), (t) => t.amt);
const used = (c, m) => sum(state.tx.filter((t) => t.type === "expense" && t.cat === c && t.date.startsWith(m)), (t) => t.amt);
const accBal = (a) => a.start + sum(state.tx.filter((t) => t.acc === a.id), (t) => (t.type === "income" ? t.amt : -t.amt));
const accName = (id) => (state.accounts.find((a) => a.id === id) || { name: "(dihapus)" }).name;
const sorted = () => [...state.tx].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

/* ===== 3. KOMPONEN HTML ===== */
const btn = (a, id, l) => `<button class="btn btn-small" type="button" data-act="${a}" data-id="${id}">${l}</button>`;
const head = (t, s, a, l) => `<header class="page-head"><div><p class="muted">${s}</p><h1>${t}</h1></div>${a ? `<button class="btn btn-primary" type="button" data-act="${a}">+ ${l}</button>` : ""}</header>`;
const stat = (l, v, c, n) => `<article class="card"><small>${l}</small><p class="big ${c || ""}">${v}</p><small class="muted">${n || ""}</small></article>`;
const bar = (p) => `<div class="bar${p >= 100 ? " over" : ""}"><span style="width:${Math.min(p, 100)}%"></span></div>`;
const empty = (n) => `<tr><td colspan="${n}" class="muted">Belum ada data.</td></tr>`;
const tbl = (h, r, id) => `<div class="table-wrap"><table><thead><tr>${h.map((x) => (x[0] === "~" ? `<th class="right">${x.slice(1)}</th>` : `<th>${x}</th>`)).join("")}</tr></thead><tbody${id ? ` id="${id}"` : ""}>${r}</tbody></table></div>`;
const card = (inner) => `<section class="card">${inner}</section>`;

const budItem = (b, act) => {
  const u = used(b.cat, mo()), p = pct(u, b.limit);
  return `<div class="item"><div class="row"><span>${esc(b.cat)}</span><span>${rp(u)} / ${rp(b.limit)}</span></div>${bar(p)}
  <div class="row foot"><small class="muted">${p}% digunakan</small><span>${act ? btn("edit-bud", b.id, "Ubah") + " " + btn("del-bud", b.id, "Hapus") : ""}</span></div></div>`;
};
const goalItem = (g, full) => {
  const p = pct(g.saved, g.target);
  return `<div class="item"><div class="row"><span>${esc(g.name)}</span><strong>${p}%</strong></div>${bar(p)}
  <div class="row foot"><small class="muted">${rp(g.saved)} dari ${rp(g.target)}</small><span>${btn("dep-goal", g.id, "+ Setor")}${full ? " " + btn("edit-goal", g.id, "Ubah") + " " + btn("del-goal", g.id, "Hapus") : ""}</span></div></div>`;
};
const txRow = (t, a) => `<tr><td>${esc(t.date)}</td><td><strong>${esc(t.name)}</strong></td><td>${esc(t.cat)}</td><td>${esc(accName(t.acc))}</td>
  <td class="right ${t.type === "income" ? "green" : "red"}">${t.type === "income" ? "+" : "–"}${rp(t.amt)}</td>${a ? `<td class="right nw">${btn("edit-tx", t.id, "Ubah")} ${btn("del-tx", t.id, "Hapus")}</td>` : ""}</tr>`;

/* ===== 4. HALAMAN ===== */
let page = "dashboard", rep = mo();
const flt = { q: "", ft: "", fm: "" };
const txList = () => sorted().filter((t) => (!flt.q || (t.name + " " + t.cat).toLowerCase().includes(flt.q.toLowerCase())) && (!flt.ft || t.type === flt.ft) && (!flt.fm || t.date.startsWith(flt.fm)));
const txInfo = (l) => `${l.length} transaksi · masuk ${rp(sum(l.filter((t) => t.type === "income"), (t) => t.amt))} · keluar ${rp(sum(l.filter((t) => t.type === "expense"), (t) => t.amt))}`;
const fillTx = () => { const l = txList(); $("#tx-body").innerHTML = l.map((t) => txRow(t, 1)).join("") || empty(6); $("#tx-n").textContent = txInfo(l); };

const V = {
  dashboard() {
    const m = mo(), i = tot(m, "income"), o = tot(m, "expense"), all = sum(state.accounts, (a) => a.start) + tot("", "income") - tot("", "expense");
    return head("Dashboard", "Ringkasan keuangan", "add-tx", "Transaksi") +
      `<section class="stats">${stat("Total saldo", rp(all), "", "Seluruh rekening")}${stat("Pemasukan bulan ini", rp(i), "green", "Bulan berjalan")}${stat("Pengeluaran bulan ini", rp(o), "red", "Bulan berjalan")}${stat("Selisih bulan ini", rp(i - o), i - o < 0 ? "red" : "green", "Surplus / defisit")}</section>
      <section class="two-col">
        ${card(`<div class="card-head"><h2>Anggaran bulan ini</h2><button class="btn" data-page="anggaran">Lihat semua</button></div>${state.budgets.map((b) => budItem(b)).join("") || '<p class="muted">Belum ada anggaran.</p>'}`)}
        ${card(`<div class="card-head"><h2>Target tabungan</h2><button class="btn" data-page="tabungan">Lihat semua</button></div>${state.goals.map((g) => goalItem(g)).join("") || '<p class="muted">Belum ada target.</p>'}`)}
      </section>` +
      card(`<div class="card-head"><h2>Transaksi terbaru</h2><button class="btn" data-page="transaksi">Semua transaksi</button></div>` +
        tbl(["Tanggal", "Transaksi", "Kategori", "Rekening", "~Jumlah"], sorted().slice(0, 5).map((t) => txRow(t)).join("") || empty(5)));
  },
  transaksi() {
    const l = txList(), o = (v, t) => `<option value="${v}"${flt.ft === v ? " selected" : ""}>${t}</option>`;
    return head("Transaksi", "Riwayat pemasukan dan pengeluaran", "add-tx", "Transaksi") +
      card(`<div class="filters"><input id="q" type="search" placeholder="Cari nama atau kategori" value="${esc(flt.q)}"><select id="ft">${o("", "Semua jenis")}${o("income", "Pemasukan")}${o("expense", "Pengeluaran")}</select><input id="fm" type="month" value="${flt.fm}"></div>
      <p class="muted" id="tx-n">${txInfo(l)}</p>` + tbl(["Tanggal", "Transaksi", "Kategori", "Rekening", "~Jumlah", ""], l.map((t) => txRow(t, 1)).join("") || empty(6), "tx-body"));
  },
  anggaran() {
    return head("Anggaran", "Batas pengeluaran per kategori, dihitung dari bulan ini", "add-bud", "Anggaran") +
      card(state.budgets.map((b) => budItem(b, 1)).join("") || '<p class="muted">Belum ada anggaran. Klik "+ Anggaran".</p>');
  },
  tabungan() {
    return head("Tabungan", "Target tabungan", "add-goal", "Target") +
      card(state.goals.map((g) => goalItem(g, 1)).join("") || '<p class="muted">Belum ada target. Klik "+ Target".</p>');
  },
  utang() {
    const u = sum(state.debts.filter((d) => !d.paid && d.kind === "utang"), (d) => d.amt), p = sum(state.debts.filter((d) => !d.paid && d.kind === "piutang"), (d) => d.amt);
    const rows = state.debts.map((d) => { const late = !d.paid && d.due && d.due < today();
      return `<tr><td><strong>${esc(d.who)}</strong></td><td>${d.kind === "utang" ? "Utang saya" : "Piutang"}</td><td>${esc(d.due || "-")}</td><td class="${d.paid ? "green" : late ? "red" : ""}">${d.paid ? "Lunas" : late ? "Terlambat" : "Belum lunas"}</td><td class="right">${rp(d.amt)}</td>
      <td class="right nw">${btn("pay-debt", d.id, d.paid ? "Batal lunas" : "Tandai lunas")} ${btn("edit-debt", d.id, "Ubah")} ${btn("del-debt", d.id, "Hapus")}</td></tr>`; }).join("");
    return head("Utang & Piutang", "Catat siapa berutang kepada siapa", "add-debt", "Catatan") +
      `<section class="stats">${stat("Utang saya (belum lunas)", rp(u), "red")}${stat("Piutang (belum diterima)", rp(p), "green")}</section>` +
      card(tbl(["Nama", "Jenis", "Jatuh tempo", "Status", "~Jumlah", ""], rows || empty(6)));
  },
  rutin() {
    const rows = state.rec.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td><td>${r.type === "income" ? "Pemasukan" : "Pengeluaran"}</td><td>${esc(r.cat)}</td><td>${esc(accName(r.acc))}</td><td>Tgl ${r.day}</td>
      <td class="right ${r.type === "income" ? "green" : "red"}">${rp(r.amt)}</td><td class="right nw">${btn("edit-rec", r.id, "Ubah")} ${btn("del-rec", r.id, "Hapus")}</td></tr>`).join("");
    return head("Transaksi Rutin", "Dicatat otomatis setiap bulan saat aplikasi dibuka pada atau setelah tanggalnya", "add-rec", "Rutin") +
      card(tbl(["Nama", "Jenis", "Kategori", "Rekening", "Jadwal", "~Jumlah", ""], rows || empty(7)));
  },
  rekening() {
    const rows = state.accounts.map((a) => `<tr><td><strong>${esc(a.name)}</strong></td><td class="right">${rp(a.start)}</td><td class="right">${rp(accBal(a))}</td><td class="right nw">${btn("edit-acc", a.id, "Ubah")} ${btn("del-acc", a.id, "Hapus")}</td></tr>`).join("");
    return head("Rekening", "Bank, e-wallet, dan tunai", "add-acc", "Rekening") +
      `<section class="stats">${stat("Total saldo", rp(sum(state.accounts, accBal)), "", state.accounts.length + " rekening")}</section>` + card(tbl(["Nama", "~Saldo awal", "~Saldo sekarang", ""], rows || empty(4)));
  },
  laporan() {
    const m = rep, i = tot(m, "income"), o = tot(m, "expense");
    const cats = KAT.map((c) => [c, used(c, m)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]), mx = cats[0] ? cats[0][1] : 1;
    const ms = [...Array(6)].map((_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + k); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); });
    const top = Math.max(1, ...ms.flatMap((x) => [tot(x, "income"), tot(x, "expense")]));
    return head("Laporan", "Ringkasan per bulan") +
      card(`<div class="filters"><label class="muted">Bulan <input id="rep-m" type="month" value="${m}"></label><button class="btn" type="button" data-act="csv">Unduh CSV bulan ini</button></div>`) +
      `<section class="stats">${stat("Pemasukan", rp(i), "green")}${stat("Pengeluaran", rp(o), "red")}${stat("Selisih", rp(i - o), i - o < 0 ? "red" : "green")}${stat("Rasio tabung", pct(i - o, i) + "%", "", "Selisih / pemasukan")}</section>
      <section class="two-col">
        ${card(`<div class="card-head"><h2>Pengeluaran per kategori</h2></div>${cats.map(([c, v]) => `<div class="item"><div class="row foot"><span>${esc(c)}</span><span>${rp(v)} (${pct(v, o)}%)</span></div>${bar((v / mx) * 100)}</div>`).join("") || '<p class="muted">Tidak ada pengeluaran di bulan ini.</p>'}`)}
        ${card(`<div class="card-head"><h2>6 bulan terakhir</h2><small class="muted"><span class="green">■</span> masuk <span class="red">■</span> keluar</small></div><div class="chart">${ms.map((x) => `<div class="col"><div class="pair"><i style="height:${(tot(x, "income") / top) * 100}%;background:var(--green)"></i><i style="height:${(tot(x, "expense") / top) * 100}%;background:var(--red)"></i></div><small class="muted">${BLN[+x.slice(5) - 1]}</small></div>`).join("")}</div>`)}
      </section>` +
      card(`<div class="card-head"><h2>Data</h2></div><div class="filters"><button class="btn" type="button" data-act="backup">Unduh cadangan (.json)</button><label class="btn">Pulihkan cadangan<input id="rf" type="file" accept=".json" hidden></label><button class="btn" type="button" data-act="reset">Reset ke data contoh</button></div>`);
  },
};

function render() {
  $("#view").innerHTML = V[page]();
  document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("active", a.dataset.page === page));
}
const commit = () => { runRec(); save(); render(); };

/* ===== 5. FORM TAMBAH / UBAH (satu form untuk semua data) ===== */
const accO = () => state.accounts.map((a) => [a.id, a.name]);
const katO = KAT.map((c) => [c, c]);
const TYP = [["expense", "Pengeluaran"], ["income", "Pemasukan"]];
const F = (k, l, t, extra) => ({ k, l, t, ...extra });
const E = {
  tx: { l: "tx", n: "Transaksi", f: () => [F("type", "Jenis", "select", { o: TYP }), F("name", "Nama transaksi", "text", { req: 1 }), F("amt", "Jumlah (Rp)", "number", { req: 1, min: 1 }), F("cat", "Kategori", "select", { o: [...katO, ["Pemasukan", "Pemasukan"]] }), F("acc", "Rekening", "select", { o: accO() }), F("date", "Tanggal", "date", { req: 1 })], d: () => ({ type: "expense", cat: "Makan", acc: state.accounts[0]?.id, date: today() }) },
  bud: { l: "budgets", n: "Anggaran", f: () => [F("cat", "Kategori", "select", { o: katO }), F("limit", "Batas per bulan (Rp)", "number", { req: 1, min: 1 })], d: () => ({ cat: KAT[0] }) },
  goal: { l: "goals", n: "Target tabungan", f: () => [F("name", "Nama target", "text", { req: 1 }), F("target", "Target (Rp)", "number", { req: 1, min: 1 }), F("saved", "Sudah terkumpul (Rp)", "number")], d: () => ({ saved: 0 }) },
  debt: { l: "debts", n: "Catatan utang/piutang", f: () => [F("kind", "Jenis", "select", { o: [["utang", "Utang saya"], ["piutang", "Piutang (orang lain berutang ke saya)"]] }), F("who", "Nama orang / pihak", "text", { req: 1 }), F("amt", "Jumlah (Rp)", "number", { req: 1, min: 1 }), F("due", "Jatuh tempo (opsional)", "date")], d: () => ({ kind: "utang" }) },
  rec: { l: "rec", n: "Transaksi rutin", f: () => [F("type", "Jenis", "select", { o: TYP }), F("name", "Nama", "text", { req: 1 }), F("amt", "Jumlah (Rp)", "number", { req: 1, min: 1 }), F("cat", "Kategori", "select", { o: [...katO, ["Pemasukan", "Pemasukan"]] }), F("acc", "Rekening", "select", { o: accO() }), F("day", "Tanggal tiap bulan (1-28)", "number", { req: 1, min: 1, max: 28 })], d: () => ({ type: "expense", cat: "Tagihan", acc: state.accounts[0]?.id, day: 1 }), fix: (v) => ({ ...v, day: Math.min(28, Math.max(1, v.day || 1)) }) },
  acc: { l: "accounts", n: "Rekening", f: () => [F("name", "Nama rekening", "text", { req: 1 }), F("start", "Saldo awal (Rp)", "number")], d: () => ({ start: 0 }) },
};

let submitCb = null;
function openForm(e, v, cb) {
  const fs = e.f();
  $("#form").innerHTML = `<h2>${v.id ? "Ubah" : "Tambah"} ${e.n.toLowerCase()}</h2>` + fs.map((f) => {
    const val = v[f.k] ?? "";
    const inp = f.t === "select"
      ? `<select name="${f.k}">${f.o.map(([a, b]) => `<option value="${esc(a)}"${String(a) === String(val) ? " selected" : ""}>${esc(b)}</option>`).join("")}</select>`
      : `<input name="${f.k}" type="${f.t}" value="${esc(val)}"${f.req ? " required" : ""}${f.t === "number" ? ` min="${f.min ?? 0}"${f.max ? ` max="${f.max}"` : ""} step="any" inputmode="decimal"` : ' maxlength="60"'}>`;
    return `<label>${f.l}${inp}</label>`;
  }).join("") + `<div class="form-actions"><button class="btn" type="button" data-cancel>Batal</button><button class="btn btn-primary" type="submit">Simpan</button></div>`;
  submitCb = () => {
    const fd = new FormData($("#form")), o = {};
    fs.forEach((f) => { const x = fd.get(f.k); o[f.k] = f.t === "number" ? Number(x || 0) : String(x ?? "").trim(); });
    cb(e.fix ? e.fix(o) : o);
  };
  $("#dlg").showModal();
}
$("#form").addEventListener("submit", (ev) => { ev.preventDefault(); if (submitCb) submitCb(); $("#dlg").close(); commit(); });

/* ===== 6. AKSI TOMBOL ===== */
function dl(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); }

document.addEventListener("click", (ev) => {
  if (ev.target.closest("[data-cancel]")) { $("#dlg").close(); return; }
  const p = ev.target.closest("[data-page]");
  if (p) { ev.preventDefault(); page = p.dataset.page; render(); window.scrollTo(0, 0); return; }
  const b = ev.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if (act === "reset") { if (confirm("Kembalikan semua data ke data contoh? Data Anda akan hilang.")) { state = seed(); commit(); } return; }
  if (act === "backup") { dl("cadangan-keuangan-" + today() + ".json", JSON.stringify(state), "application/json"); return; }
  if (act === "csv") {
    const q = (x) => '"' + String(x).replace(/"/g, '""') + '"';
    const rows = sorted().filter((t) => t.date.startsWith(rep)).map((t) => [t.date, t.name, t.cat, accName(t.acc), t.type === "income" ? "Pemasukan" : "Pengeluaran", t.amt].map(q).join(","));
    dl("transaksi-" + rep + ".csv", "\ufeff" + ["Tanggal,Transaksi,Kategori,Rekening,Jenis,Jumlah", ...rows].join("\n"), "text/csv");
    return;
  }
  const [verb, ent] = act.split("-"), e = E[ent];
  if (!e) return;
  if (verb === "add") return openForm(e, e.d(), (v) => state[e.l].push({ id: (ent === "acc" ? "a" : "") + state.nid++, ...v }));
  const list = state[e.l], item = list.find((x) => String(x.id) === id);
  if (!item) return;
  if (verb === "edit") return openForm(e, item, (v) => Object.assign(item, v));
  if (verb === "del") {
    if (ent === "acc" && (state.tx.some((t) => t.acc === item.id) || state.accounts.length < 2)) { alert("Rekening ini masih dipakai transaksi, atau satu-satunya rekening."); return; }
    if (confirm("Hapus data ini?")) { state[e.l] = list.filter((x) => x !== item); commit(); }
    return;
  }
  if (verb === "dep") {
    const n = Number(prompt('Setor berapa rupiah ke "' + item.name + '"? (angka negatif untuk menarik)'));
    if (n && !isNaN(n)) { item.saved = Math.max(0, item.saved + n); commit(); }
    return;
  }
  if (verb === "pay") { item.paid = !item.paid; commit(); }
});

// Pencarian & filter transaksi (hanya memperbarui tabel, supaya kursor tidak hilang)
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.id === "q" || t.id === "ft" || t.id === "fm") { flt[t.id] = t.value; fillTx(); }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.id === "rep-m" && t.value) { rep = t.value; render(); }
  if (t.id === "rf" && t.files[0]) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const s = JSON.parse(r.result);
        if (!Array.isArray(s.tx)) throw new Error("format");
        if (confirm("Timpa semua data dengan file cadangan ini?")) { state = s; norm(); commit(); }
      } catch (e) { alert("File cadangan tidak valid."); }
    };
    r.readAsText(t.files[0]);
  }
});

runRec();
render();

/* ===== LOGIN (tempel di paling bawah app.js) ===== */
const USERS_KEY = "pf-users", SESSION_KEY = "pf-session";
let loginMode = "login";

const getUsers = () => { try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; } catch (e) { return {}; } };
const putUsers = (u) => { try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch (e) {} };

// Kata sandi tidak disimpan polos, hanya hasil hash-nya
async function hashPw(pw, salt) {
  const text = salt + ":" + pw;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 5381; // cadangan jika browser tidak mendukung crypto (kurang aman)
  for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return String(h);
}

function startSession(name) {
  sessionStorage.setItem(SESSION_KEY, name);
  const dataKey = "pf-data-u-" + name; // setiap pengguna punya data sendiri
  save = function () { try { localStorage.setItem(dataKey, JSON.stringify(state)); } catch (e) {} };
  try { const s = JSON.parse(localStorage.getItem(dataKey)); state = s && s.tx ? s : seed(); } catch (e) { state = seed(); }
  norm(); page = "dashboard"; runRec(); save();

  const nav = document.querySelector(".menu");
  let out = document.getElementById("menu-logout");
  if (!out) {
    out = document.createElement("a");
    out.href = "#"; out.id = "menu-logout";
    out.addEventListener("click", (e) => { e.preventDefault(); logout(); });
    nav.appendChild(out);
  }
  out.textContent = "Keluar (" + name + ")";

  const box = document.getElementById("login");
  if (box) box.remove();
  render();
}

function logout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

async function onLoginSubmit(ev) {
  ev.preventDefault();
  const f = ev.target, name = f.usr.value.trim().toLowerCase(), pw = f.pw.value;
  const err = f.querySelector(".login-err"), users = getUsers();
  const fail = (m) => { err.textContent = m; };

  if (loginMode === "register") {
    if (!/^[a-z0-9_]{3,20}$/.test(name)) return fail("Nama pengguna 3-20 karakter: huruf kecil, angka, atau _.");
    if (pw.length < 6) return fail("Kata sandi minimal 6 karakter.");
    if (pw !== f.pw2.value) return fail("Ulangi kata sandi tidak sama.");
    if (users[name]) return fail("Nama pengguna sudah dipakai.");
    const first = Object.keys(users).length === 0;
    const salt = Math.random().toString(36).slice(2);
    users[name] = { salt, hash: await hashPw(pw, salt) };
    putUsers(users);
    if (first) { // akun pertama mengambil alih data lama yang sudah kamu isi
      const old = localStorage.getItem(KEY);
      if (old) { localStorage.setItem("pf-data-u-" + name, old); localStorage.removeItem(KEY); }
    }
    startSession(name);
  } else {
    const u = users[name];
    if (!u || (await hashPw(pw, u.salt)) !== u.hash) return fail("Nama pengguna atau kata sandi salah.");
    startSession(name);
  }
}

function showLogin() {
  let box = document.getElementById("login");
  if (!box) {
    box = document.createElement("div");
    box.id = "login";
    document.body.appendChild(box);
    box.addEventListener("submit", onLoginSubmit);
    box.addEventListener("click", (e) => {
      if (e.target.id === "login-switch") { loginMode = loginMode === "login" ? "register" : "login"; showLogin(); }
    });
  }
  const reg = loginMode === "register";
  box.innerHTML = `<form class="login-card">
    <div class="logo">PF</div>
    <h1>${reg ? "Buat akun" : "Masuk"}</h1>
    <label>Nama pengguna<input name="usr" autocomplete="username" required maxlength="20"></label>
    <label>Kata sandi<input name="pw" type="password" autocomplete="${reg ? "new-password" : "current-password"}" required></label>
    ${reg ? '<label>Ulangi kata sandi<input name="pw2" type="password" autocomplete="new-password" required></label>' : ""}
    <p class="login-err" role="alert"></p>
    <button class="btn btn-primary" type="submit">${reg ? "Daftar" : "Masuk"}</button>
    <button class="link-btn" type="button" id="login-switch">${reg ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}</button>
  </form>`;
}

// Gerbang: tampilkan login jika belum ada sesi aktif
const lastUser = sessionStorage.getItem(SESSION_KEY);
if (lastUser && getUsers()[lastUser]) {
  startSession(lastUser);
} else {
  loginMode = Object.keys(getUsers()).length ? "login" : "register";
  $("#view").innerHTML = ""; // kosongkan tampilan sampai berhasil masuk
  showLogin();
}