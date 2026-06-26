import { applicationState, setActiveDraft } from '../state.js'
import { navigateTo } from '../app.js'

export function drawNav() {
  const navigationItems = [
    { page: 'new', icon: '＋', label: 'Создать акт' },
    { page: 'archive', icon: '', label: 'Реестр актов' },
  ]
  if (applicationState.isAdmin) {
    navigationItems.push({ page: 'refs', icon: '', label: 'Справочники' })
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

  $nav.append('<div class="foot"></div>')
}
