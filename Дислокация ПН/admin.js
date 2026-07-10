const A = window.ADMIN;

const I = {
  role: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 1-4.5 4.5 1 6.5L12 17l-5.5 3 1-6.5L3 9l6-1z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.6-4 5-6 8-6s6.4 2 8 6"/></svg>',
  track: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 2v20M14 2v20"/><path d="M3 6h14M3 11h14M3 16h14M3 21h14" stroke-width="1.2"/><path d="M17 8l4 4-4 4"/></svg>',
  station: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18M9 21v-6h6v6"/></svg>',
  container: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="11" rx="1"/><path d="M3 12h18M8 7v11M14 7v11"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>'
};

const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

let state = {
  tab: "roles",
  selectedRole: "Администратор",
  selectedUser: "user1",
  selectedPath: "a12",
  expandedPaths: new Set(["st-new", "parki", "parkA2"])
};

// ============ Вкладки ============
function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll(".admin-tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  render();
}

function render() {
  if (state.tab === "roles") renderRoles();
  else if (state.tab === "users") renderUsers();
  else if (state.tab === "paths") renderPaths();
  else renderStub();
}

// ============ Полномочия ============
function renderRoles() {
  const list = $("#adminList"); list.innerHTML = "";
  const head = el("div", "admin-list-head", `<button class="btn-add" id="addRole">+ Добавить</button>`);
  list.appendChild(head);
  const items = el("div", "admin-list-items");
  A.ROLES.forEach(r => {
    const it = el("div", "admin-item" + (r === state.selectedRole ? " selected" : ""), r);
    it.addEventListener("click", () => { state.selectedRole = r; renderRoles(); });
    items.appendChild(it);
  });
  list.appendChild(items);
  $("#addRole").addEventListener("click", () => toast("Новое полномочие"));

  const form = $("#adminForm"); form.innerHTML = "";
  const grid = el("div", "field-grid");
  grid.appendChild(fieldRow("Наименование", `<input type="text" value="${state.selectedRole}">`));
  form.appendChild(grid);

  const box = el("div", "panel-box grow");
  box.appendChild(el("div", "panel-box-head", "Права"));
  const body = el("div", "panel-box-body");
  A.PERMISSIONS.forEach((p, i) => {
    const checked = A.ROLE_PERMS_DEMO.has(p) && state.selectedRole === "Администратор";
    const row = el("label", "chk-row", `<input type="checkbox" ${checked ? "checked" : ""}><span>${p}</span>`);
    body.appendChild(row);
  });
  box.appendChild(body);
  form.appendChild(box);
}

// ============ Пользователи ============
function renderUsers() {
  const list = $("#adminList"); list.innerHTML = "";
  const head = el("div", "admin-list-head", `<button class="btn-add" id="addUser">+ Добавить</button>`);
  list.appendChild(head);
  const items = el("div", "admin-list-items");
  A.USERS_SYSTEM.forEach(u => {
    const it = el("div", "admin-item system" + (u === state.selectedUser ? " selected" : ""), u);
    it.addEventListener("click", () => { state.selectedUser = u; renderUsers(); });
    items.appendChild(it);
  });
  items.appendChild(el("div", "admin-item-group", "Сотрудники"));
  A.USERS_PEOPLE.forEach(u => {
    const it = el("div", "admin-item" + (u === state.selectedUser ? " selected" : ""), u);
    it.addEventListener("click", () => { state.selectedUser = u; renderUsers(); });
    items.appendChild(it);
  });
  list.appendChild(items);
  $("#addUser").addEventListener("click", () => toast("Новый пользователь"));

  const d = A.USER_DEMO;
  const isDemo = state.selectedUser === "user1";
  const form = $("#adminForm"); form.innerHTML = "";

  const grid = el("div", "field-grid");
  grid.appendChild(fieldRow("Логин", `<input type="text" value="${isDemo ? d.login : state.selectedUser}">`));
  grid.appendChild(fieldRow("Полное имя (Фамилия И.О.)", `<input type="text" value="${isDemo ? d.fullname : state.selectedUser}">`));
  grid.appendChild(fieldRow("Предприятие", selectHtml(A.ENTERPRISES, isDemo ? d.enterprise : "")));
  grid.appendChild(fieldRow("Подразделение", selectHtml(A.DEPARTMENTS, isDemo ? d.department : "")));
  grid.appendChild(fieldRow("Сменить пароль", selectHtml(["Да", "Нет"], isDemo ? d.changePassword : "Нет")));
  grid.appendChild(fieldRow("Станция по умолчанию", selectHtml(A.STATIONS_ADM, isDemo ? d.defaultStation : "")));
  grid.appendChild(fieldRow("Открыт", selectHtml(["Да", "Нет"], isDemo ? d.open : "Да")));
  grid.appendChild(fieldRow("Телефон", `<input type="tel" value="${isDemo ? d.phone : ""}">`));
  form.appendChild(grid);

  const stBox = el("div", "panel-box");
  stBox.appendChild(el("div", "panel-box-head", "Станции"));
  const stBody = el("div", "panel-box-body stations-row");
  A.STATIONS_ADM.forEach(s => {
    const checked = isDemo && d.stations.has(s);
    stBody.appendChild(el("label", "chk-row", `<input type="checkbox" ${checked ? "checked" : ""}><span>${s}</span>`));
  });
  stBox.appendChild(stBody);
  form.appendChild(stBox);

  const permBox = el("div", "panel-box grow");
  permBox.appendChild(el("div", "panel-box-head", "Полномочия"));
  const permBody = el("div", "panel-box-body");
  A.ROLES.forEach(r => {
    const checked = isDemo && d.perms.has(r);
    permBody.appendChild(el("label", "chk-row", `<input type="checkbox" ${checked ? "checked" : ""}><span>${r}</span>`));
  });
  permBox.appendChild(permBody);
  form.appendChild(permBox);
}

function selectHtml(options, current) {
  return `<select>${options.map(o => `<option ${o === current ? "selected" : ""}>${o}</option>`).join("")}</select>`;
}
function fieldRow(label, controlHtml) {
  return el("div", "field-row", `<label>${label}</label><div class="fw">${controlHtml}</div>`);
}

// ============ Пути ============
function renderPaths() {
  const list = $("#adminList"); list.innerHTML = "";
  list.appendChild(el("div", "admin-list-head", `<span style="font-size:12.5px;color:var(--ink-2);font-weight:600;">Станции и пути</span>`));
  const items = el("div", "admin-list-items admin-tree");
  A.PATHS_TREE.forEach(n => items.appendChild(renderPathNode(n)));
  list.appendChild(items);

  const form = $("#adminForm"); form.innerHTML = "";
  const d = A.PATH_DEMO;
  const isDemo = state.selectedPath === "a12";
  const grid = el("div", "field-grid");
  grid.appendChild(fieldRow("Путь", `<input type="text" value="${isDemo ? d.name : findPathLabel(state.selectedPath)}">`));
  grid.appendChild(fieldRow("Назначение", `<input type="text" value="${isDemo ? d.purpose : ""}">`));
  grid.appendChild(fieldRow("Стрелки огр-ие путь: от", `<input type="text" class="narrow" value="${isDemo ? d.switchFrom : ""}">`));
  grid.appendChild(fieldRow("Стрелки огр-ие путь: до", `<input type="text" class="narrow" value="${isDemo ? d.switchTo : ""}">`));
  grid.appendChild(fieldRow("Длина предельная (метры)", `<input type="text" class="narrow" value="${isDemo ? d.lenMax : ""}">`));
  grid.appendChild(fieldRow("Длина полезная (метры)", `<input type="text" class="narrow" value="${isDemo ? d.lenUseful : ""}">`));
  grid.appendChild(fieldRow("Вместимость", `<input type="text" class="narrow" value="${isDemo ? d.capacity : ""}">`));
  grid.appendChild(fieldRow("Доп. поле 1", `<input type="text" value="${isDemo ? d.extra1 : ""}">`));
  grid.appendChild(fieldRow("Доп. поле 2", `<input type="text" value="${isDemo ? d.extra2 : ""}">`));
  grid.appendChild(fieldRow("Доп. поле 3", `<input type="text" value="${isDemo ? d.extra3 : ""}">`));
  grid.appendChild(fieldRow("Не доступен", selectHtml(["Да", "Нет"], isDemo ? d.unavailable : "Нет")));
  grid.appendChild(fieldRow("Тип пути", selectHtml(["Отстойный", "Приемо-отправочный", "Сортировочный", "Вытяжной", "Погрузочно-разгрузочный"], isDemo ? d.type : "Приемо-отправочный")));
  form.appendChild(grid);
}

function findPathLabel(id, nodes = A.PATHS_TREE) {
  for (const n of nodes) {
    if (n.id === id) return n.label;
    if (n.children) { const f = findPathLabel(id, n.children); if (f) return f; }
  }
  return "";
}

function renderPathNode(node) {
  const wrap = el("div", "pt-node");
  const hasChildren = !!(node.children && node.children.length);
  const isOpen = state.expandedPaths.has(node.id);
  const row = el("div", "pt-row");
  if (node.station) row.classList.add("station");
  if (node.flagIcon) row.classList.add("flag");
  if (isOpen) row.classList.add("open");
  if (state.selectedPath === node.id) row.classList.add("selected");

  const twisty = el("div", "pt-twisty" + (hasChildren ? "" : " leaf"));
  row.appendChild(twisty);
  const ico = el("div", "pt-ico", node.station ? I.station : (node.flagIcon === "cont" ? I.container : (hasChildren ? I.folder : I.track)));
  row.appendChild(ico);
  row.appendChild(el("span", "pt-label", node.label));
  wrap.appendChild(row);

  const toggle = (e) => {
    e.stopPropagation();
    if (!hasChildren) return;
    if (state.expandedPaths.has(node.id)) state.expandedPaths.delete(node.id);
    else state.expandedPaths.add(node.id);
    renderPaths();
  };
  twisty.addEventListener("click", toggle);
  row.addEventListener("click", () => {
    if (node.leaf === true && !hasChildren) { state.selectedPath = node.id; renderPaths(); }
    else if (hasChildren) toggle({ stopPropagation() {} });
  });

  if (isOpen && hasChildren) {
    const kids = el("div", "pt-children");
    node.children.forEach(c => kids.appendChild(renderPathNode(c)));
    wrap.appendChild(kids);
  }
  return wrap;
}

// ============ Заглушки (Справочники / Периоды) ============
function renderStub() {
  $("#adminList").innerHTML = "";
  const form = $("#adminForm");
  form.innerHTML = "";
  const label = state.tab === "refs" ? "Справочники" : "Периоды";
  form.appendChild(el("div", "admin-empty", `Раздел «${label}» — в разработке`));
}

// ============ Тост ============
function toast(msg) {
  let wrap = $("#toastWrap");
  if (!wrap) { wrap = el("div", "toast-wrap"); wrap.id = "toastWrap"; document.body.appendChild(wrap); }
  const t = el("div", "toast", `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>${msg}</span>`);
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .25s"; setTimeout(() => t.remove(), 260); }, 2000);
}

function init() {
  document.querySelectorAll(".admin-tabs button").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  render();
}
document.addEventListener("DOMContentLoaded", init);
