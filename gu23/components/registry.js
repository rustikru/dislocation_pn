import { sendApiRequest } from '../api.js'
import { references } from '../state.js'
import { navigateTo } from '../app.js'
import { escapeHtml, formatDate, formatDateTime } from '../utils.js'
import { showStatusChip, showTypeChip } from './ui.js'

export function showArchive(container) {
  $(container).html(
    '<div class="phead">' +
      '<h1>Архив актов</h1>' +
      '<div class="spacer"></div>' +
      '<button class="btn ghost" id="btn-reset-filters" title="Сбросить фильтры" style="color:var(--muted);margin-right:9px">Сбросить</button>' +
      '</div>' +
      '<div class="filters" id="archive-filters">' +
      '<div class="searchbox">' +
      '<input type="text" class="inp" id="search-input" placeholder="Номер акта, номер вагона, причина…">' +
      '</div>' +
      '</div>' +
      '<div class="card" id="acts-table-container"></div>',
  )

  // По умолчанию — текущий месяц (фильтр по дате начала ИЛИ окончания)
  const pad2 = (n) => String(n).padStart(2, '0')
  const toInputDate = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const toFilterDate = (d) =>
    `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const filterState = {
    q: '',
    type: '',
    status: '',
    dept: '',
    date_from: toFilterDate(monthStart),
    date_to: toFilterDate(monthEnd),
    has_signed: '', // 'Y' = только с подписанным документом
    page: 1,
  }
  const PAGE_SIZE = 50
  let searchTimeout = null

  // Позиционируем выпадающее меню по координатам кнопки (fixed),
  // чтобы не уезжало при переносе строк / сворачивании бокового меню.
  const positionMenu = ($btn, $menu) => {
    const r = $btn[0].getBoundingClientRect()
    $menu.css({
      position: 'fixed',
      top: r.bottom + 4 + 'px',
      left: 'auto',
      right: window.innerWidth - r.right + 'px',
    })
  }

  // Создание фильтра с множественным выбором (чекбокс-дропдаун).
  const createMultiSelectFilter = (options, labels, key) => {
    const allLabel = labels[0] // первый элемент — «Все …»
    const $wrap = $('<div class="ms-filter"></div>')
    const $btn = $(
      '<button type="button" class="inp ms-btn">' + allLabel + '</button>',
    )
    const $menu = $('<div class="ms-menu"></div>')

    // реальные значения
    const realCount = options.filter((v) => v !== '').length

    // поиск внутри списка — только для длинных списков
    if (realCount > 8) {
      const $search = $(
        '<input type="text" class="ms-search" placeholder="Поиск…">',
      )
      $search.on('input', function () {
        const q = this.value.trim().toLowerCase()
        $menu.find('.ms-item').each(function () {
          const txt = $(this).find('span').text().toLowerCase()
          $(this).toggle(txt.indexOf(q) !== -1)
        })
      })
      $menu.append($search)
    }

    // чекбоксы для  значений
    options.forEach((val, idx) => {
      if (val === '') return
      $menu.append(
        '<label class="ms-item"><input type="checkbox" value="' +
          val +
          '"><span>' +
          labels[idx] +
          '</span></label>',
      )
    })

    const updateLabel = () => {
      const $checked = $menu.find('input:checked')
      if ($checked.length === 0) $btn.text(allLabel)
      else if ($checked.length === 1)
        $btn.text($checked.first().parent().find('span').text())
      else $btn.text(allLabel + ': ' + $checked.length)
      $btn.toggleClass('has-value', $checked.length > 0)
    }

    $menu.on('change', 'input', () => {
      filterState[key] = $menu
        .find('input:checked')
        .map((i, el) => el.value)
        .get()
        .join(',')
      filterState.page = 1
      updateLabel()
      loadArchiveData()
    })

    $menu.on('click', (e) => e.stopPropagation())
    $btn.on('click', (e) => {
      e.stopPropagation()
      $('.ms-menu').not($menu).hide() // закрыть остальные
      if (!$menu.is(':visible')) positionMenu($btn, $menu)
      $menu.toggle()
    })

    $wrap.append($btn, $menu)
    $('#archive-filters').append($wrap)
  }

  // Инициализация фильтров
  createMultiSelectFilter(
    ['', 'start', 'end', 'other'],
    ['Все типы', 'Начало простоя', 'Окончание', 'Прочий'],
    'type',
  )
  createMultiSelectFilter(
    ['', 'draft', 'active', 'closed', 'annulled', 'signed', 'rejected'],
    [
      'Все статусы',
      'Проект',
      'Открыт',
      'Закрыт',
      'Аннулирован',
      'Подписан',
      'Отклонён',
    ],
    'status',
  )

  const departmentCodes = references.departmentsList.map((d) => d.CODE)
  createMultiSelectFilter(
    [''].concat(references.departmentsList.map((d) => String(d.ID))),
    ['Все цеха'].concat(departmentCodes),
    'dept',
  )

  // закрытие выпадающих меню по клику вне
  $(document)
    .off('click.msfilter')
    .on('click.msfilter', () => $('.ms-menu').hide())

  // Фильтр по периоду (дата начала или окончания). По умолчанию — текущий месяц.
  const $dateFrom = $(
    '<input type="date" class="inp" title="Дата с" value="' +
      toInputDate(monthStart) +
      '">',
  )
  const $dateTo = $(
    '<input type="date" class="inp" title="Дата по" value="' +
      toInputDate(monthEnd) +
      '">',
  )
  $dateFrom.on('change', (e) => {
    filterState.date_from = e.target.value
      ? e.target.value.split('-').reverse().join('.')
      : ''
    filterState.page = 1
    loadArchiveData()
  })
  $dateTo.on('change', (e) => {
    filterState.date_to = e.target.value
      ? e.target.value.split('-').reverse().join('.')
      : ''
    filterState.page = 1
    loadArchiveData()
  })
  $('#archive-filters').append($dateFrom, $dateTo)

  // Доп. фильтры (поповер): «Приложение» — Все / Подписанный документ
  const $extraWrap = $('<div class="ms-filter"></div>')
  const $extraBtn = $(
    '<button type="button" class="inp ms-btn" id="btn-extra-filters">Доп. фильтры</button>',
  )
  const $extraMenu = $(
    '<div class="ms-menu" style="padding:12px;min-width:240px"></div>',
  )
  $extraMenu.append(
    '<label style="display:block;font-size:12px;color:var(--muted);margin-bottom:6px">Приложение</label>' +
      '<select class="inp" id="filter-has-signed" style="width:100%">' +
      '<option value="">Все</option>' +
      '<option value="signed">Подписанный документ</option>' +
      '</select>',
  )
  $extraMenu.on('click', (e) => e.stopPropagation())
  $extraBtn.on('click', (e) => {
    e.stopPropagation()
    $('.ms-menu').not($extraMenu).hide()
    if (!$extraMenu.is(':visible')) positionMenu($extraBtn, $extraMenu)
    $extraMenu.toggle()
  })
  $extraMenu.on('change', '#filter-has-signed', function () {
    filterState.has_signed = this.value === 'signed' ? 'Y' : ''
    filterState.page = 1
    $extraBtn.toggleClass('has-value', !!filterState.has_signed)
    loadArchiveData()
  })
  $extraWrap.append($extraBtn, $extraMenu)
  $('#archive-filters').append($extraWrap)

  // Кнопка сброса (в шапке) — возвращает фильтры к значениям по умолчанию (текущий месяц)
  $('#btn-reset-filters').on('click', () => showArchive(container))

  // Поиск с задержкой
  $('#search-input').on('input', function () {
    filterState.q = $(this).val().trim()
    filterState.page = 1
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(loadArchiveData, 250)
  })

  // Загрузка и отрисовка таблицы
  function loadArchiveData() {
    sendApiRequest('gu23_get_acts', filterState).done((resp) => {
      const acts =
        resp && resp.acts ? resp.acts : Array.isArray(resp) ? resp : []
      const total = resp && resp.total ? resp.total : acts.length
      const page = resp && resp.page ? resp.page : 1

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

      // Номера актов начала
      const rootNumbers = new Set(rootActs.map((a) => a.ACT_NUMBER))

      // Собираем иерархию (по умолчанию все развернуты)
      rootActs.forEach((rootAct) => {
        rowsHtml += generateRowHtml(rootAct, false)
        const children = childActsMap[rootAct.ACT_NUMBER] || []
        children.forEach((childAct) => {
          rowsHtml += generateRowHtml(childAct, true)
        })
      })

      // «Осиротевшие» акты окончания: их родитель (акт начала)
      // Выводим их отдельными строками,
      // иначе они просто исчезают из архива.
      Object.keys(childActsMap).forEach((parentNum) => {
        if (rootNumbers.has(parentNum)) return
        childActsMap[parentNum].forEach((childAct) => {
          rowsHtml += generateRowHtml(childAct, false)
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

      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
      const pagerBtns = []
      if (page > 1)
        pagerBtns.push(
          '<button class="btn sm ghost pager-btn" data-p="' +
            (page - 1) +
            '">←</button>',
        )
      for (let p = 1; p <= totalPages; p++) {
        if (
          totalPages <= 7 ||
          Math.abs(p - page) <= 2 ||
          p === 1 ||
          p === totalPages
        ) {
          pagerBtns.push(
            '<button class="btn sm' +
              (p === page ? '' : ' ghost') +
              ' pager-btn" data-p="' +
              p +
              '">' +
              p +
              '</button>',
          )
        } else if (pagerBtns[pagerBtns.length - 1] !== '…') {
          pagerBtns.push('…')
        }
      }
      if (page < totalPages)
        pagerBtns.push(
          '<button class="btn sm ghost pager-btn" data-p="' +
            (page + 1) +
            '">→</button>',
        )

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
        '<div class="cardpad" style="border-top:1px solid var(--line);font-size:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        '<span class="muted">Всего: ' +
        total +
        '</span>' +
        '<div style="flex:1"></div>' +
        pagerBtns.join('') +
        '</div>'

      $('#acts-table-container').html(tableHtml)

      $('#acts-table-container')
        .off('click', '.pager-btn')
        .on('click', '.pager-btn', function () {
          filterState.page = parseInt($(this).data('p'))
          loadArchiveData()
        })

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
