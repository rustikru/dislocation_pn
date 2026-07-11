import { sendApiRequest } from './api.js'
import { applicationState, references, setActiveDraft } from './state.js'
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
    card: showCard, // Карточка вагона
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
    references.departmentsList = (response && response.cexes) || []
    references.reasonsList = (response && response.reasons) || []
    references.stationsList = (response && response.stations) || []
    references.stationsFromList = (response && response.stations_from) || []
    references.ownersList = (response && response.owners) || []
    references.wagonKindsList = (response && response.kinds) || []
    references.cargosList = (response && response.cargos) || []
    references.signersOwnList = (response && response.signersOwn) || []
    references.signersRzdList = (response && response.signersRzd) || []
    references.signersManualList = (response && response.signersManual) || []
    applicationState.isAdmin = !!(response && response.isAdmin)
    applicationState.userPerms = new Set((response && response.perms) || [])

    // Показываем страничку
    showApplication()
  })
})
