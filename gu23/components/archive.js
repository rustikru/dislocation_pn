import { sendApiRequest } from '../api.js'
import { references } from '../state.js'
import { navigateTo } from '../app.js'
import { escapeHtml, formatDate, formatDateTime } from '../utils.js'
import { showStatusChip, showTypeChip } from './ui.js'

export function showArchive(container) {
  $(container).html(`
    <div class="phead">
      <h1>Архив актов</h1>
      <div class="spacer"></div>
    </div>
    <div class="filters" id="archive-filters">
      <div class="searchbox">
        <input type="text" class="inp" id="search-input" placeholder="Номер акта, номер вагона, причина…">
      </div>
    </div>
    <div class="card" id="acts-table-container"></div>
  `)

  const filterState = { q: '', type: '', status: '', cex: '' }
  let searchTimeout = null

  // Создание фильтров
  const createSelectFilter = (options, labels, key) => {
    const optionsHtml = options
      .map((val, idx) => `<option value="${val}">${labels[idx]}</option>`)
      .join('')
    const $select = $(`<select class="inp">${optionsHtml}</select>`)
    $select.on('change', (e) => {
      filterState[key] = e.target.value
      loadArchiveData()
    })
    $('#archive-filters').append($select)
  }

  // Инициализация фильтров
  createSelectFilter(
    ['', 'start', 'end', 'other'],
    ['Все типы', 'Начало простоя', 'Окончание', 'Прочий'],
    'type',
  )
  createSelectFilter(
    ['', 'draft', 'active', 'closed', 'annulled'],
    ['Все статусы', 'Черновик', 'Открыт', 'Закрыт', 'Аннулирован'],
    'status',
  )

  const departmentCodes = references.departmentsList.map((d) => d.CODE)
  createSelectFilter(
    [''].concat(references.departmentsList.map((d) => String(d.ID))),
    ['Все цеха'].concat(departmentCodes),
    'cex',
  )

  // Поиск с задержкой
  $('#search-input').on('input', function () {
    filterState.q = $(this).val().trim()
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(loadArchiveData, 250)
  })

  // Загрузка и отрисовка таблицы
  function loadArchiveData() {
    sendApiRequest('gu23_get_acts', filterState).done((list) => {
      const acts = list || []

      let rowsHtml = ''
      if (!acts.length) {
        rowsHtml = `<tr><td colspan="9" class="muted" style="padding:24px;text-align:center">Актов не найдено</td></tr>`
      } else {
        rowsHtml = acts
          .map(
            (act) => `
          <tr class="clickable-row" data-id="${act.ID}">
            <td class="num">${escapeHtml(act.ACT_NUMBER)}</td>
            <td class="num">${escapeHtml(act.ACT_START_NUMBER)}</td>
            <td class="muted">${formatDateTime(act.START_AT)}</td>
            <td class="muted">${formatDateTime(act.END_AT)}</td>
            <td>${showTypeChip(act.ACT_TYPE)}</td>
            <td>${escapeHtml(act.CEX)}</td>
            <td class="muted text-ellipsis" style="max-width:230px" title="${escapeHtml(act.REASON_NAME)}">${escapeHtml(act.REASON_NAME)}</td>
            <td class="num">${act.WAGON_CNT || 0}</td>
            
            <td>${showStatusChip(act.STATUS)}</td>
          </tr>
        `,
          )
          .join('')
      }

      const tableHtml = `
        <div style="overflow:auto">
          <table class="tbl">
            <thead>
              <tr>
                <th>Номер</th>
                <th>Номер акта начала</th>
                <th>Начало простоя</th>
                <th>Окончание простоя</th>
                <th>Тип</th>
                <th>Цех</th>
                <th>Причина</th>
                <th>Вагоны</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <div class="cardpad muted" style="border-top:1px solid var(--line);font-size:12px">
          Найдено актов: ${acts.length}
        </div>
      `

      $('#acts-table-container').html(tableHtml)

      // Клик по строке
      $('.clickable-row').on('click', function () {
        navigateTo('card', $(this).data('id'))
      })
    })
  }

  loadArchiveData()
}
