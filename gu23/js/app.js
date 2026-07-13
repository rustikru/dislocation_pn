import { sendApiRequest } from './api.js'
import { applicationState, references, activeDraft } from './state.js'
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
    window.location.href = `card.php?id=${encodeURIComponent(selectedId)}`
    return
  }

  if (
    (window.GU23_START || {}).page === 'card' &&
    pageName !== 'card' &&
    !(pageName === 'new' && activeDraft)
  ) {
    window.location.href = `index.php?page=${encodeURIComponent(pageName)}`
    return
  }

  applicationState.currentPage = pageName

  // Сохраняем выбранный ID
  $('#view').data('selected-id', selectedId)

  showApplication()
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
    applicationState.isAdmin = !!(response && response.isAdmin) // Админ или нет
    applicationState.userPerms = new Set((response && response.perms) || []) // Разрешения пользователя

    const start = window.GU23_START || {}
    if (start.page) {
      applicationState.currentPage = start.page
      if (start.id) {
        $('#view').data('selected-id', start.id)
      }
    }

    // Показываем страничку
    showApplication() //
  })
})
