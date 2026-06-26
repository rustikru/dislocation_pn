import { sendApiRequest } from '../api.js'
import { escapeHtml } from '../utils.js'
import { showToast, showConfirmBox } from './ui.js'

let allRoles = []        // все роли из справочника
let searchTimeout = null
let currentSearch = ''

export function showRoles(container) {
  currentSearch = ''
  allRoles = []

  $(container).html(`
    <div class="phead">
      <h1>Роли и доступ</h1>
      <div class="spacer"></div>
    </div>
    <div class="filters" id="roles-filters">
      <div class="searchbox">
        <input type="text" class="inp" id="roles-search" placeholder="Поиск по имени или логину…">
      </div>
    </div>
    <div id="roles-content"></div>
  `)

  $('#roles-search').on('input', function () {
    currentSearch = $(this).val().trim()
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(loadRoles, 250)
  })

  loadRoles()
}

function loadRoles() {
  sendApiRequest('gu23_roles_users', { search: currentSearch }).done((resp) => {
    if (!resp || !resp.ok) {
      $('#roles-content').html(
        '<div class="card cardpad" style="color:var(--err)">Нет доступа или ошибка загрузки.</div>',
      )
      return
    }
    allRoles = resp.roles || []
    renderRoles(resp.users || [], resp.roles || [])
  })
}

function renderRoles(users, roles) {
  const rolesChipsBar = roles.length
    ? `<div style="margin-bottom:14px">
        <span class="muted" style="font-size:12px">Доступные роли: </span>
        ${roles.map((r) => `<span class="chip st-draft" title="${escapeHtml(r.ROLE_CODE)}">${escapeHtml(r.ROLE_NAME)}</span>`).join(' ')}
       </div>`
    : '<div class="muted" style="margin-bottom:14px;font-size:12px">Роли не созданы. Добавьте роли в таблицу xx_disl_gu23_roles.</div>'

  if (!users.length) {
    $('#roles-content').html(
      `<div class="card cardpad">${rolesChipsBar}<div class="muted">Пользователи не найдены.</div></div>`,
    )
    return
  }

  const rowsHtml = users
    .map((u) => {
      const rolePills = u.roles.length
        ? u.roles
            .map(
              (r) =>
                `<span class="chip st-signed role-pill" style="cursor:pointer"
                        data-uid="${u.id}" data-rid="${r.role_id}" data-rname="${escapeHtml(r.role_name)}"
                        title="Нажмите, чтобы отозвать роль">
                  ${escapeHtml(r.role_name)} ✕
                </span>`,
            )
            .join(' ')
        : '<span class="muted" style="font-size:12px">нет ролей</span>'

      // Роли, которых у пользователя ещё нет
      const assignedIds = new Set(u.roles.map((r) => String(r.role_id)))
      const available = roles.filter((r) => !assignedIds.has(String(r.ROLE_ID)))
      const addBtn = available.length
        ? `<select class="inp role-add-select" data-uid="${u.id}" style="font-size:12px;padding:2px 6px;height:26px;width:auto;min-width:120px">
            <option value="">+ роль</option>
            ${available.map((r) => `<option value="${r.ROLE_ID}">${escapeHtml(r.ROLE_NAME)}</option>`).join('')}
           </select>`
        : ''

      return `<tr>
        <td class="muted" style="font-family:var(--mono);font-size:12px">${escapeHtml(u.login || '')}</td>
        <td><b>${escapeHtml(u.full_name || '')}</b></td>
        <td>${rolePills}</td>
        <td style="width:140px">${addBtn}</td>
      </tr>`
    })
    .join('')

  const html = `
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line)">
        ${rolesChipsBar}
        <b>Пользователи (${users.length})</b>
      </div>
      <div style="overflow:auto">
        <table class="tbl" id="roles-table">
          <thead>
            <tr>
              <th>Логин</th>
              <th>ФИО</th>
              <th>Роли</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `

  $('#roles-content').html(html)

  // Отозвать роль — клик по чипу
  $('#roles-table').on('click', '.role-pill', function () {
    const uid   = $(this).data('uid')
    const rid   = $(this).data('rid')
    const rname = $(this).data('rname')
    showConfirmBox(
      'Отозвать роль',
      `Убрать роль «${rname}» у этого пользователя?`,
      () => {
        sendApiRequest('gu23_role_revoke', { user_id: uid, role_id: rid }).done((r) => {
          if (r && r.ok) {
            showToast('Роль отозвана', 'ok')
            loadRoles()
          } else {
            showToast(r?.msg || 'Ошибка', 'err')
          }
        })
      },
    )
  })

  // Назначить роль — изменение select
  $('#roles-table').on('change', '.role-add-select', function () {
    const uid = $(this).data('uid')
    const rid = $(this).val()
    if (!rid) return
    $(this).val('')
    sendApiRequest('gu23_role_assign', { user_id: uid, role_id: rid }).done((r) => {
      if (r && r.ok) {
        showToast('Роль назначена', 'ok')
        loadRoles()
      } else {
        showToast(r?.msg || 'Ошибка', 'err')
      }
    })
  })
}
