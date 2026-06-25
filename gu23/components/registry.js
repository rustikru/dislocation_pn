import { sendApiRequest } from '../api.js'
import { references } from '../state.js'
import { navigateTo } from '../app.js'
import { escapeHtml, formatDate, formatDateTime } from '../utils.js'
import { showStatusChip, showTypeChip } from './ui.js'

export function showArchive(container) {
  $(container).html(
    '<div class="phead">' +
      '<h1>Реестр актов</h1>' +
      '<div class="spacer"></div>' +
      '</div>' +
      '<div class="filters" id="archive-filters">' +
      '<div class="searchbox">' +
      '<input type="text" class="inp" id="search-input" placeholder="Номер акта, номер вагона, причина…">' +
      '</div>' +
      '</div>' +
      '<div class="card" id="acts-table-container"></div>',
  )

  const filterState = { q: '', type: '', status: '', dept: '' }
  let searchTimeout = null

  // Создание фильтров
  const createSelectFilter = (options, labels, key) => {
    const optionsHtml = options
      .map(
        (val, idx) =>
          '<option value="' + val + '">' + labels[idx] + '</option>',
      )
      .join('')
    const $select = $('<select class="inp">' + optionsHtml + '</select>')
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
    'dept',
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

      // Построение дерева связей
      const rootActs = []
      const childActsMap = {}
      const independentActs = []

      acts.forEach((act) => {
        const parentNumber = act.ACT_START_NUMBER
        if (act.ACT_TYPE === 'end' && parentNumber) {
          if (!childActsMap[parentNumber]) {
            childActsMap[parentNumber] = []
          }
          childActsMap[parentNumber].push(act)
        } else if (act.ACT_TYPE === 'start') {
          rootActs.push(act)
        } else {
          independentActs.push(act)
        }
      })

      let rowsHtml = ''

      // Функция генерации строки
      function generateRowHtml(act, isChild) {
        const rowClass = isChild ? 'child-row' : 'root-row'
        const cellStyle = isChild
          ? ' style="padding-left: 35px; color: var(--ink2); font-weight: normal;"'
          : ' style="font-weight: 600;"'
        const parentAttr = isChild
          ? ' data-parent-num="' + act.ACT_START_NUMBER + '"'
          : ' data-root-num="' + act.ACT_NUMBER + '"'
        const bgStyle = isChild ? ' "' : ''

        return (
          '<tr class="clickable-row ' +
          rowClass +
          '" data-id="' +
          act.ID +
          '"' +
          parentAttr +
          bgStyle +
          '>' +
          '<td class="num"' +
          cellStyle +
          '>' +
          escapeHtml(act.ACT_NUMBER) +
          '</td>' +
          //'<td class="num muted">' +
          //escapeHtml(act.ACT_START_NUMBER || '—') +
          '</td>' +
          '<td class="muted">' +
          formatDateTime(act.START_AT) +
          '</td>' +
          '<td class="muted">' +
          formatDateTime(act.END_AT) +
          '</td>' +
          '<td>' +
          showTypeChip(act.ACT_TYPE) +
          '</td>' +
          '<td>' +
          escapeHtml(act.DEPT) +
          '</td>' +
          '<td class="muted text-ellipsis" style="max-width:230px" title="' +
          escapeHtml(act.REASON_NAME) +
          '">' +
          escapeHtml(act.REASON_NAME) +
          '</td>' +
          '<td class="num">' +
          (act.WAGON_CNT || 0) +
          '</td>' +
          '<td>' +
          showStatusChip(act.STATUS) +
          '</td>' +
          '</tr>'
        )
      }

      // Собираем иерархию (по умолчанию все развернуты)
      rootActs.forEach((rootAct) => {
        rowsHtml += generateRowHtml(rootAct, false)
        const children = childActsMap[rootAct.ACT_NUMBER] || []
        children.forEach((childAct) => {
          rowsHtml += generateRowHtml(childAct, true)
        })
      })

      // Добавляем прочие/одиночные акты
      independentActs.forEach((act) => {
        if (act.ACT_START_NUMBER && childActsMap[act.ACT_START_NUMBER]) return
        rowsHtml += generateRowHtml(act, false)
      })

      if (!acts.length) {
        rowsHtml =
          '<tr><td colspan="9" class="muted" style="padding:24px;text-align:center">Актов не найдено</td></tr>'
      }

      const tableHtml =
        '<div style="overflow:auto">' +
        '<table class="tbl" id="archive-tree-table">' +
        '<thead>' +
        '<tr>' +
        '<th>Номер</th>' +
        //'<th>Номер акта начала</th>' +
        '<th>Начало простоя</th>' +
        '<th>Окончание простоя</th>' +
        '<th>Тип</th>' +
        '<th>Цех</th>' +
        '<th>Причина</th>' +
        '<th>Вагоны</th>' +
        '<th>Статус</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        rowsHtml +
        '</tbody>' +
        '</table>' +
        '</div>' +
        '<div class="cardpad muted" style="border-top:1px solid var(--line);font-size:12px">' +
        'Найдено актов: ' +
        acts.length +
        '' +
        '</div>'

      $('#acts-table-container').html(tableHtml)

      $('#archive-tree-table tbody').on('click', 'tr', function (e) {
        const $tr = $(this)
        const rootNum = $tr.data('root-num')

        if (rootNum && $(e.target).closest('td').is(':first-child')) {
          const $children = $('#archive-tree-table tbody').find(
            'tr[data-parent-num="' + rootNum + '"]',
          )
          if ($children.length > 0) {
            e.stopPropagation()
            $children.toggle()
            return
          }
        }

        // проваливаемся в карточку акта
        navigateTo('card', $tr.data('id'))
      })
    })
  }

  loadArchiveData()
}
