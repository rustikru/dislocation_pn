import { applicationState, setActiveDraft } from '../state.js'
import { navigateTo } from '../app.js'

export function drawNav() {
  const navigationItems = [
    { page: 'new', icon: '＋', label: 'Создать акт' },
    { page: 'archive', icon: '', label: 'Реестр актов' },
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
  const $logout = $(`
    <form method="post" action="index.php" style="margin-top:8px">
      <input type="hidden" name="logout" value="1">
      <button type="submit" class="navbtn" style="color:var(--rej);width:100%">
        <span class="ic">⏏</span>
        <span>Выход</span>
      </button>
    </form>
  `)
  $foot.append($logout)
  $nav.append($foot)
}
