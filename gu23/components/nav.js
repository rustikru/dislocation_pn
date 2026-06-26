import { applicationState, setActiveDraft } from '../state.js'
import { navigateTo } from '../app.js'

export function drawNav() {
  const navigationItems = [
    { page: 'new', icon: '＋', label: 'Создать акт' },
    { page: 'archive', icon: '', label: 'Архив актов' },
  ]
  if (applicationState.isAdmin) {
    // Справочники
    navigationItems.push({ page: 'refs', icon: '', label: 'Справочники' })
  }

  if (applicationState.isAdmin) {
    // Роли
    navigationItems.push({ page: 'roles', icon: '', label: 'Роли' })
  }

  const $nav = $('#nav').empty()

  navigationItems.forEach((item) => {
    const isActive =
      applicationState.currentPage === item.page ||
      (item.page === 'archive' && applicationState.currentPage === 'card')

    const $button = $(`
      <button class="navbtn ${isActive ? 'active' : ''}">
        <span class="ic">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `)

    $button.on('click', () => {
      if (item.page === 'new') setActiveDraft(null)
      navigateTo(item.page)
    })
    $nav.append($button)
  })

  const $foot = $('<div class="foot"></div>')

  // Показываем текущего пользователя
  const sess = window.GU23_SESSION || {}
  if (sess.login) {
    const $user = $(`
      <div style="padding:8px 11px 4px;border-top:1px solid var(--line);margin-top:6px">
        <div style="font-size:11px;color:var(--muted);line-height:1.4">
          <div style="font-weight:600;color:var(--ink2);font-size:12px">${sess.full_name || sess.login}</div>
          <div style="font-family:var(--mono);font-size:10.5px">${sess.login}${sess.is_admin ? ' · admin' : ''}</div>
        </div>
      </div>
    `)
    $foot.append($user)
  }

  const $logout = $(`
    <form method="post" action="index.php" style="margin-top:4px">
      <input type="hidden" name="logout" value="1">
      <button type="submit" class="navbtn" style="color:var(--rej);width:100%">
        <span class="ic"></span>
        <span>Выход</span>
      </button>
    </form>
  `)
  $foot.append($logout)
  $nav.append($foot)
}
