import { applicationState, setActiveDraft, hasPerm } from './state.js'
import { navigateTo } from './app.js'

const NAV_COLLAPSE_KEY = 'gu23_nav_collapsed'

export function drawNav() {
  const navigationItems = []

  if (hasPerm('CREATE_ACT')) {
    navigationItems.push({ page: 'new', icon: 'add.svg', label: 'Создать акт' })
  }

  navigationItems.push({
    page: 'archive',
    icon: 'archive.svg',
    label: 'Архив актов',
  })

  if (hasPerm('MANAGE_REFS')) {
    navigationItems.push({
      page: 'refs',
      icon: 'agenda.svg',
      label: 'Справочники',
    })
  }

  if (hasPerm('MANAGE_ROLES')) {
    navigationItems.push({ page: 'roles', icon: 'user.svg', label: 'Роли' })
  }

  const $nav = $('#nav').empty()

  //  «свёрнуто»
  const collapsed = localStorage.getItem(NAV_COLLAPSE_KEY) === '1'
  $nav.toggleClass('collapsed', collapsed)

  // кнопка-переключатель
  const $toggle = $(`
    <button class="navtoggle" title="${collapsed ? 'Развернуть меню' : 'Свернуть меню'}">
      <img src="/img/nav/sidebar.svg" alt="" width="22" height="22" style="flex-shrink:0">
    </button>
  `)
  $toggle.on('click', () => {
    const nowCollapsed = !$nav.hasClass('collapsed')
    $nav.toggleClass('collapsed', nowCollapsed)
    localStorage.setItem(NAV_COLLAPSE_KEY, nowCollapsed ? '1' : '0')
  })
  $nav.append($toggle)

  navigationItems.forEach((item) => {
    const isActive =
      applicationState.currentPage === item.page ||
      (item.page === 'archive' && applicationState.currentPage === 'card')

    const $button = $(`
      <button class="navbtn ${isActive ? 'active' : ''}" title="${item.label}">
        <span class="ic"> <img src="/img/nav/${item.icon}" alt="Word" width="18" height="18" style="flex-shrink:0"></span>
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
      <button type="submit" class="navbtn" title="Выход" style="color:var(--rej);width:100%">
        <span class="ic">⎋</span>
        <span>Выход</span>
      </button>
    </form>
  `)
  //$foot.append($logout)
  //$nav.append($foot)
}
