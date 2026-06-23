import { sendApiRequest } from './api.js'
import { applicationState, references, setActiveDraft } from './state.js'
import { drawNav } from './components/nav.js'
import { showArchive } from './components/archive.js'
import { showForm } from './components/form.js'
import { showCard } from './components/card.js'
import { showWagonSearch } from './components/wagonSearch.js'

// Функция навигации
export function navigateTo(pageName, selectedId = null) {
  applicationState.currentPage = pageName

  // Сохраняем выбранный ID в DOM-атрибуте контейнера для простоты доступа
  $('#view').data('selected-id', selectedId)

  if (pageName === 'new') setActiveDraft(null)

  renderApplication()
}

// Главная функция отрисовки интерфейса
export function renderApplication() {
  drawNav()

  const container = $('#view')[0]
  if (!container) return

  const screens = {
    archive: showArchive,
    new: showForm,
    card: showCard,
    wsearch: showWagonSearch,
  }

  const renderCurrentScreen =
    screens[applicationState.currentPage] || showArchive
  renderCurrentScreen(container)
}

// Точка старта приложения при загрузке страницы
$(document).ready(() => {
  sendApiRequest('gu23_get_refs').done((response) => {
    // Наполняем глобальные справочники данными от сервера
    references.departmentsList = response?.cexes || []
    references.reasonsList = response?.reasons || []
    references.stationsList = response?.stations || []
    references.stationsFromList = response?.stations_from || []
    references.ownersList = response?.owners || []
    references.wagonKindsList = response?.kinds || []
    references.cargosList = response?.cargos || []
    references.signersOwnList = response?.signersOwn || []
    references.signersRzdList = response?.signersRzd || []

    // Отрисовываем приложение
    renderApplication()
  })
})
