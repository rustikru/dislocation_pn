import { sendApiRequest } from '../api.js'
import { escapeHtml } from '../utils.js'
import { showToast, showConfirmBox } from './ui.js'

const ROLES_PAGE_SIZE = 20

let searchTimeout = null
let rolesSearch = ''
let rolesPage = 1

// Данные, загруженные один раз
let matrixData = null // { roles, perms, cells: {perm_id: {role_id: 'Y'/'N'}} }

export function showRoles(container) {
  rolesSearch = ''
  rolesPage = 1
  matrixData = null

  $(container).html(`
    <div class="phead">
      <h1>Роли и доступ</h1>
    </div>
    <div id="roles-matrix-wrap"></div>
    <div id="roles-users-wrap" style="margin-top:22px"></div>
  `)

  loadMatrix()
  loadUsers()
}

/* ══════════════════════════════════════════════════════════
   Матрица полномочий
   ══════════════════════════════════════════════════════════ */

function loadMatrix() {
  $('#roles-matrix-wrap').html(
    '<div class="muted" style="font-size:13px">Загрузка матрицы…</div>',
  )
  sendApiRequest('gu23_role_perms', {}).done((resp) => {
    if (!resp || !resp.ok) {
      $('#roles-matrix-wrap').html(
        '<div class="card cardpad" style="color:var(--rej)">Ошибка загрузки матрицы полномочий.</div>',
      )
      return
    }
    buildMatrixData(resp.rows || [])
    renderMatrix()
  })
}

function buildMatrixData(rows) {
  const rolesMap = {}
  const permsMap = {}
  const cells = {} // cells[perm_id][role_id] = 'Y'/'N'

  rows.forEach((r) => {
    if (!rolesMap[r.ROLE_ID]) {
      rolesMap[r.ROLE_ID] = {
        id: r.ROLE_ID,
        code: r.ROLE_CODE,
        name: r.ROLE_NAME,
      }
    }
    if (!permsMap[r.PERM_ID]) {
      permsMap[r.PERM_ID] = { id: r.PERM_ID, code: r.PERM_CODE, descr: r.DESCR }
    }
    if (!cells[r.PERM_ID]) cells[r.PERM_ID] = {}
    cells[r.PERM_ID][r.ROLE_ID] = r.HAS_PERM
  })

  matrixData = {
    roles: Object.values(rolesMap),
    perms: Object.values(permsMap),
    cells,
  }
}

function renderMatrix() {
  if (!matrixData) return
  const { roles, perms, cells } = matrixData

  if (!roles.length || !perms.length) {
    $('#roles-matrix-wrap').html(
      '<div class="card cardpad muted">Роли или полномочия не заполнены. Выполните fill_roles.sql и fill_permissions.sql.</div>',
    )
    return
  }

  const thCols = roles
    .map(
      (r) =>
        `<th style="text-align:center;min-width:110px">
           <span class="chip st-draft" style="font-size:11px">${escapeHtml(r.name)}</span>
         </th>`,
    )
    .join('')

  const rows = perms
    .map((p) => {
      const tds = roles
        .map((r) => {
          const has = cells[p.id]?.[r.id] === 'Y'
          return `<td style="text-align:center">
            <label class="perm-cb-wrap" title="${has ? 'Убрать полномочие у роли' : 'Добавить полномочие роли'}">
              <input type="checkbox" class="perm-cb"
                     data-rid="${r.id}" data-pid="${p.id}"
                     data-rname="${escapeHtml(r.name)}" data-pname="${escapeHtml(p.descr)}"
                     ${has ? 'checked' : ''}>
            </label>
          </td>`
        })
        .join('')
      return `<tr>
        <td class="perm-label">${escapeHtml(p.descr)}</td>
        ${tds}
      </tr>`
    })
    .join('')

  $('#roles-matrix-wrap').html(`
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line);display:flex;align-items:center;cursor:pointer" id="matrix-toggle">
        <b style="font-size:13px">Полномочия</b>
        <span class="muted" style="margin-left:8px;font-size:12px">${roles.length} роли · ${perms.length} полномочий</span>
        <span class="muted" style="margin-left:auto;font-size:11px">Нажмите, чтобы свернуть</span>
        <span id="matrix-arrow" style="margin-left:12px;color:var(--muted);font-size:12px"></span>
      </div>
      <div id="matrix-body" style="overflow:auto">
        <table class="tbl perm-matrix" style="min-width:500px">
          <thead>
            <tr>
              <th style="min-width:240px">Полномочие</th>
              ${thCols}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `)

  // Свернуть / развернуть
  $('#matrix-toggle').on('click', function () {
    const body = $('#matrix-body')
    const arrow = $('#matrix-arrow')
    if (body.is(':visible')) {
      body.slideUp(160)
      arrow.text('▶')
    } else {
      body.slideDown(160)
      arrow.text('▼')
    }
  })

  // Чекбоксы матрицы
  $('#roles-matrix-wrap').on('change', '.perm-cb', function () {
    const cb = this
    const rid = $(cb).data('rid')
    const pid = $(cb).data('pid')
    const rname = $(cb).data('rname')
    const pname = $(cb).data('pname')
    const assign = cb.checked

    if (!assign) {
      cb.checked = true
      showConfirmBox(
        'Убрать полномочие',
        `Убрать «${pname}» у роли «${rname}»?`,
        () => doPermRevoke(rid, pid, cb),
      )
    } else {
      doPermAssign(rid, pid, cb)
    }
  })
}

function doPermAssign(rid, pid, cb) {
  $(cb).prop('disabled', true)
  sendApiRequest('gu23_perm_assign', { role_id: rid, perm_id: pid })
    .done((r) => {
      if (r && r.ok) {
        // обновляем локальный кеш
        if (matrixData?.cells[pid]) matrixData.cells[pid][rid] = 'Y'
        showToast('Полномочие добавлено', 'ok')
      } else {
        showToast(r?.msg || 'Ошибка', 'err')
        cb.checked = false
      }
    })
    .fail(() => {
      showToast('Ошибка сети', 'err')
      cb.checked = false
    })
    .always(() => $(cb).prop('disabled', false))
}

function doPermRevoke(rid, pid, cb) {
  cb.checked = false
  $(cb).prop('disabled', true)
  sendApiRequest('gu23_perm_revoke', { role_id: rid, perm_id: pid })
    .done((r) => {
      if (r && r.ok) {
        if (matrixData?.cells[pid]) matrixData.cells[pid][rid] = 'N'
        showToast('Полномочие убрано', 'ok')
      } else {
        showToast(r?.msg || 'Ошибка', 'err')
        cb.checked = true
      }
    })
    .fail(() => {
      showToast('Ошибка сети', 'err')
      cb.checked = true
    })
    .always(() => $(cb).prop('disabled', false))
}

/* ══════════════════════════════════════════════════════════
   Таблица пользователей (с пагинацией)
   ══════════════════════════════════════════════════════════ */

function loadUsers() {
  sendApiRequest('gu23_roles_users', {
    search: rolesSearch,
    page: rolesPage,
  }).done((resp) => {
    if (!resp || !resp.ok) {
      $('#roles-users-wrap').html(
        '<div class="card cardpad" style="color:var(--rej)">Нет доступа или ошибка загрузки.</div>',
      )
      return
    }
    renderUsers(
      resp.users || [],
      resp.roles || [],
      resp.total || 0,
      resp.page || 1,
      resp.page_size || ROLES_PAGE_SIZE,
    )
  })
}

function renderUsers(users, roles, total, page, pageSize) {
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const thRoles = roles
    .map(
      (r) =>
        `<th style="text-align:center;width:110px" title="${escapeHtml(r.ROLE_CODE)}">
          ${escapeHtml(r.ROLE_NAME)}
        </th>`,
    )
    .join('')

  const tbody = users.length
    ? users.map((u) => renderUserRow(u, roles)).join('')
    : `<tr><td colspan="${2 + roles.length}" class="muted" style="text-align:center;padding:30px">
        Пользователи не найдены
       </td></tr>`

  const pagination = renderPagination(page, pages, total)

  $('#roles-users-wrap').html(`
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px">
        <b style="font-size:13px">Пользователи</b>
        <div class="searchbox" style="flex:1;max-width:340px">
          <input type="text" class="inp" id="roles-search"
                 placeholder="Поиск по имени или логину…"
                 value="${escapeHtml(rolesSearch)}"
                 style="height:34px;font-size:13px">
        </div>
        <span class="muted" style="margin-left:auto;font-size:12px">Всего: ${total}</span>
      </div>
      <div style="overflow:auto">
        <table class="tbl" id="roles-table" style="min-width:560px">
          <thead>
            <tr>
              <th style="min-width:130px">Логин</th>
              <th>ФИО</th>
              ${thRoles}
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
      ${pagination}
    </div>
  `)

  // Поиск
  $('#roles-search').on('input', function () {
    rolesSearch = $(this).val().trim()
    rolesPage = 1
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(loadUsers, 250)
  })

  // Пагинация
  $('#roles-users-wrap').on('click', '.page-btn', function () {
    const p = parseInt($(this).data('page'), 10)
    if (!p || p === rolesPage) return
    rolesPage = p
    loadUsers()
  })

  // Чекбоксы ролей
  $('#roles-table').on('change', '.role-cb', function () {
    const cb = this
    const uid = $(cb).data('uid')
    const rid = $(cb).data('rid')
    const rname = $(cb).data('rname')
    const uname = $(cb).data('uname')

    if (!cb.checked) {
      cb.checked = true
      showConfirmBox(
        'Отозвать роль',
        `Убрать роль «${rname}» у пользователя ${uname}?`,
        () => doRevoke(uid, rid, cb),
      )
    } else {
      doAssign(uid, rid, cb)
    }
  })
}

function renderUserRow(u, roles) {
  const assignedIds = new Set(u.roles.map((r) => String(r.role_id)))
  const cells = roles
    .map((r) => {
      const checked = assignedIds.has(String(r.ROLE_ID))
      return `<td style="text-align:center">
        <label class="role-cb-wrap">
          <input type="checkbox" class="role-cb"
                 data-uid="${u.id}" data-rid="${r.ROLE_ID}"
                 data-rname="${escapeHtml(r.ROLE_NAME)}"
                 data-uname="${escapeHtml(u.full_name || u.login || '')}"
                 ${checked ? 'checked' : ''}>
        </label>
      </td>`
    })
    .join('')

  return `<tr>
    <td class="muted" style="font-family:var(--mono);font-size:12px">${escapeHtml(u.login || '')}</td>
    <td><b>${escapeHtml(u.full_name || '')}</b></td>
    ${cells}
  </tr>`
}

function renderPagination(page, pages, total) {
  if (pages <= 1) return ''

  const btns = []
  const delta = 2

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - delta && i <= page + delta)) {
      btns.push(
        `<button class="page-btn ${i === page ? 'page-btn-active' : ''}" data-page="${i}">${i}</button>`,
      )
    } else if (btns[btns.length - 1] !== '…') {
      btns.push('…')
    }
  }

  return `
    <div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:12px 16px;border-top:1px solid var(--line)">
      <button class="page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>
      ${btns.join('')}
      <button class="page-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>›</button>
    </div>
  `
}

function doAssign(uid, rid, cb) {
  $(cb).prop('disabled', true)
  sendApiRequest('gu23_role_assign', { user_id: uid, role_id: rid })
    .done((r) => {
      if (r && r.ok) {
        showToast('Роль назначена', 'ok')
      } else {
        showToast(r?.msg || 'Ошибка', 'err')
        cb.checked = false
      }
    })
    .fail(() => {
      showToast('Ошибка сети', 'err')
      cb.checked = false
    })
    .always(() => $(cb).prop('disabled', false))
}

function doRevoke(uid, rid, cb) {
  cb.checked = false
  $(cb).prop('disabled', true)
  sendApiRequest('gu23_role_revoke', { user_id: uid, role_id: rid })
    .done((r) => {
      if (r && r.ok) {
        showToast('Роль отозвана', 'ok')
      } else {
        showToast(r?.msg || 'Ошибка', 'err')
        cb.checked = true
      }
    })
    .fail(() => {
      showToast('Ошибка сети', 'err')
      cb.checked = true
    })
    .always(() => $(cb).prop('disabled', false))
}
