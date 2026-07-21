import { sendApiRequest } from './api.js'
import { applicationState, references } from './state.js'
import { hasPerm } from './state.js'
import { drawNav } from './nav.js'
import { showArchive } from './registry.js'
import { showForm } from './form.js'
import { showCard } from './card.js'
import { showWagonSearch } from './wagonSearch.js'
import { showRefs } from './refs.js'
import { showRoles } from './roles.js'

// Функция навигации
export function navigateTo(pageName, selectedId = null) {
  if (pageName === 'card' && selectedId) {
    openPage(pageName, selectedId)
    setBrowserUrl(pageName, selectedId)
    return
  }

  openPage(pageName, selectedId)
  setBrowserUrl(pageName, selectedId)
}

function openPage(pageName, selectedId = null) {
  applicationState.currentPage = pageName

  // Сохраняем выбранный ID
  $('#view').data('selected-id', selectedId)

  showApplication()
}

function setBrowserUrl(pageName, selectedId = null, replace = false) {
  const url = getPageUrl(pageName, selectedId)
  const browserPage = { page: pageName, id: selectedId || null }

  if (replace) {
    window.history.replaceState(browserPage, '', url)
  } else {
    window.history.pushState(browserPage, '', url)
  }
}
//
function getPageUrl(pageName, selectedId = null) {
  if (pageName === 'card' && selectedId) {
    return `card.php?id=${encodeURIComponent(selectedId)}`
  }

  if (!pageName || pageName === 'archive') {
    return 'index.php?page=archive'
  }

  return `index.php?page=${encodeURIComponent(pageName)}`
}

function getPageFromLocation() {
  const params = new URLSearchParams(window.location.search)
  const path = window.location.pathname

  if (path.endsWith('/card.php') || path.endsWith('card.php')) {
    return {
      page: 'card',
      id: params.get('id') || null,
    }
  }

  return {
    page: params.get('page') || 'archive',
    id: null,
  }
}

// функция отрисовки интерфейса
export function showApplication() {
  drawNav()

  const container = $('#view')[0]
  if (!container) return

  const screens = {
    archive: showArchive, // Реестр
    new: showForm, // Новая форма
    card: showCard, // Карточка акта
    wsearch: showWagonSearch, // Поиск вагонов
    refs: showRefs, // Справочники
    roles: showRoles, // Роли и бла бла
  }
  // Если текущая страница не найдена, показываем реестр
  const showCurrentScreen = screens[applicationState.currentPage] || showArchive
  showCurrentScreen(container)
}

$(document).ready(() => {
  sendApiRequest('gu23_get_refs').done((response) => {
    // Загружаем глобальные справочники данными
    references.departmentsList = (response && response.cexes) || [] // Цеха
    references.reasonsList = (response && response.reasons) || [] // Причины
    references.stationsList = (response && response.stations) || [] // Станции
    references.stationsFromList = (response && response.stations_from) || [] // Станции отправления
    references.ownersList = (response && response.owners) || [] // Владельцы
    references.wagonKindsList = (response && response.kinds) || [] // Виды вагонов
    references.cargosList = (response && response.cargos) || [] // Грузы
    references.signersOwnList = (response && response.signersOwn) || [] // Подписанты (собственные)
    references.signersRzdList = (response && response.signersRzd) || [] // Подписанты (РЖД)
    references.signersManualList = (response && response.signersManual) || [] // Подписанты (ручные)
    references.reasonCategories = (response && response.reasonCategories) || [] // Кaтегории причин  // add 21.07.2026 BekmansurovRR

    applicationState.isAdmin = !!(response && response.isAdmin) // Админ или нет
    applicationState.userPerms = new Set((response && response.perms) || []) // Разрешения пользователя

    const start = window.GU23_START || {}
    if (start.page) {
      applicationState.currentPage = start.page
      if (start.id) {
        $('#view').data('selected-id', start.id)
      }
    }

    setBrowserUrl(
      applicationState.currentPage,
      $('#view').data('selected-id'),
      true,
    )

    window.addEventListener('popstate', () => {
      const next = getPageFromLocation()
      openPage(next.page, next.id)
    })

    // Показываем страничку
    showApplication() //
  })
})
