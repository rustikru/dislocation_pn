// ====== Дислокация ПН — приложение ======
const DTREE = window.DISLOC.TREE;
const DREQUESTS = window.DISLOC.REQUESTS;
const DCTX_MENU = window.DISLOC.CTX_MENU;

// --- SVG иконки ---
const I = {
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 2v20M14 2v20"/><path d="M3 6h14M3 11h14M3 16h14M3 21h14" stroke-width="1.2"/><path d="M17 8l4 4-4 4"/></svg>',
  park: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18M9 21v-6h6v6"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  loupe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01" stroke-linecap="round"/></svg>',
  err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6" stroke-linecap="round"/></svg>',
  idle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  dot: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>'
};

const ctxIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.5"/></svg>';

// ------- состояние -------
let state = {
  selectedTrack: null,   // node
  selectedWagon: null,   // wagon num
  filter: null,          // строка поиска
  expanded: new Set(["parks", "parkA", "a12"])
};

// ------- helpers -------
const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function fmt(n, d = 3) { return n == null ? "" : n.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d }); }

function findTrackById(id, nodes = DTREE) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = findTrackById(id, n.children); if (f) return f; }
  }
  return null;
}
function allTracks(nodes = DTREE, acc = []) {
  for (const n of nodes) {
    if (n.wagons) acc.push(n);
    if (n.children) allTracks(n.children, acc);
  }
  return acc;
}

// ====== Дерево ======
function renderTree() {
  const root = $("#tree"); root.innerHTML = "";
  DTREE.forEach(n => root.appendChild(renderNode(n, 0)));
}

function renderNode(node, depth) {
  const wrap = el("div", "node");
  const hasChildren = !!node.children;
  const hasWagons = !!(node.wagons && node.wagons.length);
  const isOpen = state.expanded.has(node.id);

  const row = el("div", "row");
  if (node.group) row.classList.add("group");
  if (node.flag) row.classList.add("flag");
  if (hasWagons) row.classList.add("has-wagons");
  if (node.count === 0 && !hasChildren) row.classList.add("empty");
  if (isOpen) row.classList.add("open");
  if (state.selectedTrack && state.selectedTrack.id === node.id) row.classList.add("selected");

  // классический [+]/[−] бокс — рисуется через CSS
  const twisty = el("div", "twisty" + (hasChildren || hasWagons ? "" : " leaf"));
  row.appendChild(twisty);

  const ico = el("div", "tk-ico", node.group ? (node.id === "parks" ? I.layers : I.park) : I.track);
  row.appendChild(ico);

  row.appendChild(el("span", "row-label", node.label));

  // счётчик: группа → (N); путь с вместимостью → (N/<синяя cap>); путь без cap → (N)
  let cntHtml;
  if (node.group) cntHtml = `(${node.count})`;
  else if (node.cap) cntHtml = `(${node.count}/<span class="cap">${node.cap}</span>)`;
  else cntHtml = `(${node.count})`;
  row.appendChild(el("span", "row-count", cntHtml));
  wrap.appendChild(row);

  // expand/collapse
  const toggle = (e) => {
    e.stopPropagation();
    if (!hasChildren && !hasWagons) return;
    if (state.expanded.has(node.id)) state.expanded.delete(node.id);
    else state.expanded.add(node.id);
    renderTree();
  };
  twisty.addEventListener("click", toggle);

  row.addEventListener("click", () => {
    if (hasWagons) {
      selectTrack(node);
      if (!state.expanded.has(node.id)) { state.expanded.add(node.id); renderTree(); }
    } else if (hasChildren) {
      toggle({ stopPropagation() {} });
    }
  });

  if (isOpen && (hasChildren || hasWagons)) {
    const kids = el("div", "children");
    if (hasChildren) node.children.forEach(c => kids.appendChild(renderNode(c, depth + 1)));
    if (hasWagons) node.wagons.forEach((w, i) => kids.appendChild(renderWagonNode(node, w, i)));
    wrap.appendChild(kids);
  }
  return wrap;
}

function renderWagonNode(track, w, i) {
  const n = el("div", "wnode");
  if (state.selectedWagon === w.num && state.selectedTrack === track) n.classList.add("selected");
  n.innerHTML = `<span class="idx">${i + 1}</span><span>${w.num}</span>`;
  n.addEventListener("click", () => { selectTrack(track, w.num); });
  n.addEventListener("contextmenu", (e) => { e.preventDefault(); selectTrack(track, w.num); openCtx(e, w); });
  return n;
}

// ====== Выбор пути / вагона ======
function selectTrack(track, wagonNum = null) {
  state.selectedTrack = track;
  state.selectedWagon = wagonNum;
  state.filter = null;
  $("#searchInput").value = "";
  renderTree();
  renderTable();
}

// ====== Таблица ======
const COLS = [
  { k: "num",    t: "Вагон / Платформа" },
  { k: "type",   t: "Тип" },
  { k: "status", t: "Статус" },
  { k: "state",  t: "Сост." },
  { k: "cargo",  t: "Наим. груза" },
  { k: "gruz",   t: "Вес груза", num: true },
  { k: "tara",   t: "Тара", num: true },
  { k: "brutto", t: "Вес брутто", num: true },
  { k: "vesy",   t: "Вес с весов", num: true },
  { k: "nakl",   t: "№ накладной" },
  { k: "cont",   t: "№ контейнера" },
  { k: "consignee", t: "Пред." },
  { k: "arrive", t: "Дата прибытия (Угл, мск)" },
  { k: "lastOp", t: "Дата посл. опер." },
  { k: "siteOp", t: "Дата операций на произв. площадке" }
];

function currentRows() {
  if (state.filter) {
    const q = state.filter.trim();
    const out = [];
    allTracks().forEach(tr => tr.wagons.forEach(w => { if (w.num.includes(q)) out.push({ w, tr }); }));
    return out;
  }
  if (state.selectedTrack && state.selectedTrack.wagons) {
    let ws = state.selectedTrack.wagons;
    return ws.map(w => ({ w, tr: state.selectedTrack }));
  }
  return [];
}

function statusTag(s) {
  if (s.startsWith("Годен")) return `<span class="tag ok"><span class="d"></span>${s}</span>`;
  if (s.startsWith("Неиспр")) return `<span class="tag err"><span class="d"></span>${s}</span>`;
  return `<span class="tag warn"><span class="d"></span>${s}</span>`;
}

function renderTable() {
  const head = $("#contentHead");
  const wrap = $("#tableWrap");
  const rows = currentRows();

  // заголовок секции
  if (state.filter) {
    head.innerHTML = `<h1>Поиск: <span class="mono">${state.filter}</span></h1>
      <span class="sub">совпадений по номеру вагона</span>
      <span class="chip">Кол-во: ${rows.length}</span>`;
  } else if (state.selectedTrack) {
    const t = state.selectedTrack;
    head.innerHTML = `<h1>${t.label}</h1>
      <span class="sub">Станция Новая · вместимость ${t.cap}</span>
      <span class="chip">Кол-во: ${rows.length}</span>`;
  } else {
    head.innerHTML = `<h1>Дислокация вагонов</h1><span class="sub">выберите путь или парк слева</span>`;
  }

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-state">${I.track}<div>${state.filter ? "Вагон не найден" : "Нет вагонов на этом пути"}</div></div>`;
    return;
  }

  const table = el("table", "grid");
  const thead = el("thead");
  const htr = el("tr");
  COLS.forEach(c => { const th = el("th", c.num ? "num" : "", c.t); htr.appendChild(th); });
  thead.appendChild(htr); table.appendChild(thead);

  const tbody = el("tbody");
  let sumG = 0, sumT = 0, sumB = 0;
  rows.forEach(({ w, tr }) => {
    if (w.gruz) sumG += w.gruz;
    sumT += w.tara; sumB += w.brutto;
    const tr2 = el("tr");
    if (state.selectedWagon === w.num) tr2.classList.add("selected");
    tr2.innerHTML = `
      <td><span class="wno">${w.num}</span></td>
      <td>${w.type}</td>
      <td>${statusTag(w.status)}</td>
      <td><span class="state-pill ${w.state === "гр." ? "gr" : ""}">${w.state}</span></td>
      <td>${w.cargo || '<span class="muted">—</span>'}</td>
      <td class="num">${fmt(w.gruz)}</td>
      <td class="num">${fmt(w.tara, 1)}</td>
      <td class="num">${fmt(w.brutto)}</td>
      <td class="num">${w.vesy != null ? `<span class="weigh-hi">${fmt(w.vesy, 2)}</span>` : '<span class="muted">—</span>'}</td>
      <td class="mono">${w.nakl || '<span class="muted">—</span>'}</td>
      <td class="mono">${w.cont || '<span class="muted">—</span>'}</td>
      <td>${w.consignee}</td>
      <td class="mono muted">${w.arrive}</td>
      <td class="mono muted">${w.lastOp}</td>
      <td class="mono muted">${w.siteOp || '<span class="muted">—</span>'}</td>`;
    tr2.addEventListener("click", () => { state.selectedWagon = w.num; state.selectedTrack = tr; renderTree(); renderTable(); });
    tr2.addEventListener("contextmenu", (e) => { e.preventDefault(); state.selectedWagon = w.num; state.selectedTrack = tr; renderTree(); renderTable(); openCtx(e, w); });
    tbody.appendChild(tr2);
  });

  // строка итогов
  const tot = el("tr", "total-row");
  tot.innerHTML = `
    <td colspan="5">Кол-во: ${rows.length}</td>
    <td class="num">${fmt(sumG, 2)}</td>
    <td class="num">${fmt(sumT, 1)}</td>
    <td class="num">${fmt(sumB, 2)}</td>
    <td colspan="7"></td>`;
  tbody.appendChild(tot);

  table.appendChild(tbody);
  wrap.innerHTML = "";
  wrap.appendChild(table);
}

// ====== Заявки ======
function renderRequests() {
  const list = $("#reqList"); list.innerHTML = "";
  DREQUESTS.forEach(r => {
    const st = r.st === "idle" ? "" : r.st;
    const icoMap = { ok: I.ok, warn: I.warn, err: I.err, idle: I.idle };
    const item = el("div", "req " + st);
    item.innerHTML = `
      <span class="ico">${icoMap[r.st]}</span>
      <span class="body">
        <span class="no">№${r.no}<span class="date">от ${r.date}</span></span>
        <span class="desc">${r.text}</span>
      </span>
      <span class="look" title="Открыть">${I.loupe}</span>`;
    item.addEventListener("click", () => toast(`Заявка №${r.no} — ${r.text}`));
    list.appendChild(item);
  });
  $("#reqCount").textContent = DREQUESTS.length;
}

// ====== Контекстное меню ======
let ctxEl = null;
function openCtx(e, wagon) {
  closeCtx();
  const m = el("div", "ctx");
  m.appendChild(el("div", "ctx-head", `<div class="t">Вагон</div><div class="v">${wagon.num}</div>`));
  DCTX_MENU.forEach(it => {
    if (it.sep) { m.appendChild(el("div", "ctx-sep")); return; }
    const row = el("div", "ctx-item" + (it.danger ? " danger" : ""));
    row.innerHTML = `<span class="ci">${ctxIcon}</span><span>${it.label}</span>`;
    row.addEventListener("click", () => { closeCtx(); toast(`${it.label} · вагон ${wagon.num}`); });
    m.appendChild(row);
  });
  document.body.appendChild(m);
  // позиционирование в пределах окна
  const r = m.getBoundingClientRect();
  let x = e.clientX, y = e.clientY;
  if (x + r.width > window.innerWidth - 8) x = window.innerWidth - r.width - 8;
  if (y + r.height > window.innerHeight - 8) y = window.innerHeight - r.height - 8;
  m.style.left = x + "px"; m.style.top = y + "px";
  ctxEl = m;
}
function closeCtx() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }

// ====== Тост ======
function toast(msg) {
  let wrap = $("#toastWrap");
  if (!wrap) { wrap = el("div", "toast-wrap"); wrap.id = "toastWrap"; document.body.appendChild(wrap); }
  const t = el("div", "toast", `${I.check}<span>${msg}</span>`);
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .25s"; setTimeout(() => t.remove(), 260); }, 2200);
}

// ====== Поиск ======
function doSearch() {
  const v = $("#searchInput").value.trim();
  if (!v) { state.filter = null; renderTable(); return; }
  state.filter = v;
  state.selectedWagon = v;
  renderTable();
}

// ====== Инициализация ======
function init() {
  $("#tree").id = "tree";

  // селектор станций
  const sel = $("#stationSelect");
  window.DISLOC.STATIONS.forEach(s => {
    const o = document.createElement("option");
    o.value = s; o.textContent = s;
    if (s === "Новая") o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", () => {
    if (sel.value !== "Новая") toast(`Переключение на станцию «${sel.value}»`);
  });

  renderTree();
  renderRequests();

  // выбрать путь 12_Отстой по умолчанию
  const def = findTrackById("a12");
  if (def) selectTrack(def);

  $("#searchBtn").addEventListener("click", doSearch);
  $("#searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });

  $("#refreshBtn").addEventListener("click", () => { renderTree(); toast("Дерево станции обновлено"); });

  $("#reqCollapse").addEventListener("click", () => {
    const p = $("#requests");
    p.classList.toggle("collapsed");
    $("#reqCollapse").innerHTML = `<span class="ic">${p.classList.contains("collapsed") ? I.plus : I.minus}</span>`;
  });
  $("#reqAdd").addEventListener("click", () => toast("Создание новой заявки"));

  // навигация (декоративная)
  document.querySelectorAll(".mainnav a").forEach(a => a.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".mainnav a").forEach(x => x.classList.remove("active"));
    a.classList.add("active");
  }));

  // закрытие меню
  document.addEventListener("click", closeCtx);
  document.addEventListener("scroll", closeCtx, true);
  window.addEventListener("resize", closeCtx);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCtx(); });
}

document.addEventListener("DOMContentLoaded", init);
