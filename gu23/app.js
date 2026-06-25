import { sendApiRequest } from './api.js'
import { applicationState, references, setActiveDraft } from './state.js'
import { drawNav } from './components/nav.js'
import { showArchive } from './components/registry.js'
import { showForm } from './components/form.js'
import { showCard } from './components/card.js'
import { showWagonSearch } from './components/wagonSearch.js'
import { showRefs } from './components/refs.js'

// Функция навигации
export function navigateTo(pageName, selectedId = null) {
  applicationState.currentPage = pageName

  // Сохраняем выбранный ID
  $('#view').data('selected-id', selectedId)

  showApplication()
}

// Главная функция отрисовки интерфейса
export function showApplication() {
  drawNav()

  const container = $('#view')[0]
  if (!container) return

  const screens = {
    archive: showArchive,
    new: showForm,
    card: showCard,
    wsearch: showWagonSearch,
    refs: showRefs,
  }

  const showCurrentScreen = screens[applicationState.currentPage] || showArchive
  showCurrentScreen(container)
}

$(document).ready(() => {
  sendApiRequest('gu23_get_refs').done((response) => {
    // Наполняем глобальные справочники данными
    references.departmentsList = (response && response.cexes) || []
    references.reasonsList = (response && response.reasons) || []
    references.stationsList = (response && response.stations) || []
    references.stationsFromList = (response && response.stations_from) || []
    references.ownersList = (response && response.owners) || []
    references.wagonKindsList = (response && response.kinds) || []
    references.cargosList = (response && response.cargos) || []
    references.signersOwnList = (response && response.signersOwn) || []
    references.signersRzdList = (response && response.signersRzd) || []
    applicationState.isAdmin = !!(response && response.isAdmin)

    // Показываем страничку
    showApplication()
  })
})
