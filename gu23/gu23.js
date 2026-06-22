/* ============================================================================
 * ГУ-23 · Акты общей формы — клиентская логика (jQuery + AJAX к /data.php)
 * ==========================================================================*/

var $$ = function (selector, root) {
  return (root || document).querySelector(selector)
}

function createElement(tagName, attrs) {
  var element = document.createElement(tagName)
  attrs = attrs || {}
  for (var key in attrs) {
    if (!attrs.hasOwnProperty(key)) continue
    if (key === 'html') element.innerHTML = attrs[key]
    else if (key.indexOf('on') === 0)
      element.addEventListener(key.slice(2), attrs[key])
    else if (key === 'class') element.className = attrs[key]
    else if (attrs[key] != null) element.setAttribute(key, attrs[key])
  }
  for (var i = 2; i < arguments.length; i++) {
    var child = arguments[i]
    if (child == null) continue
    ;[].concat(child).forEach(function (node) {
      if (node == null) return
      element.appendChild(
        node.nodeType ? node : document.createTextNode(String(node)),
      )
    })
  }
  return element
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"]/g, function (match) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]
  })
}

/* ---------- AJAX API ---------- */
function callApi(action, data) {
  return $.ajax({
    url: '/data.php',
    type: 'POST',
    dataType: 'json',
    data: $.extend({ ajax_action: action }, data || {}),
  })
}

/* ---------- Работа с датами ---------- */
function parseDateTime(str) {
  if (!str) return null
  var date = new Date(String(str).replace(' ', 'T'))
  return isNaN(date.getTime()) ? null : date
}

function convertToInputDateTime(str) {
  if (!str) return ''
  return String(str).replace(' ', 'T').slice(0, 16)
}

function formatDateTime(str) {
  var date = parseDateTime(str)
  if (!date) return '—'
  return date.toLocaleString('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(str) {
  var date = parseDateTime(str)
  if (!date) return '—'
  return date.toLocaleDateString('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function calculateDuration(startMs, endMs) {
  var diff = endMs - startMs
  var days = Math.floor(diff / 86400000)
  var hours = Math.round((diff - days * 86400000) / 3600000)
  return {
    ms: diff,
    totalHours: diff / 3600000,
    days: days,
    hours: hours,
    calendarDays: Math.ceil(diff / 86400000),
  }
}

function formatDuration(duration) {
  return duration.ms < 0
    ? '—'
    : duration.days + ' дн. ' + duration.hours + ' ч.'
}

function formatTotalHours(duration) {
  return duration.ms < 0
    ? '—'
    : (Math.round(duration.totalHours * 10) / 10).toLocaleString('ru') + ' ч.'
}

/* ---------- Словари ---------- */
var ACT_TYPES = {
  start: { label: 'Начало простоя', className: 'typ-start' },
  end: { label: 'Окончание простоя', className: 'typ-end' },
  other: { label: 'Прочий акт', className: 'typ-other' },
}

var ACT_STATUSES = {
  draft: { label: 'Черновик', className: 'st-draft' },
  active: { label: 'Действующий', className: 'st-signed' },
  closed: { label: 'Закрыт', className: 'st-closed' },
  annulled: { label: 'Аннулирован', className: 'st-annulled' },
}

function renderStatusChip(status) {
  var config = ACT_STATUSES[status] || { label: status, className: 'st-draft' }
  return (
    '<span class="chip ' + config.className + '">' + config.label + '</span>'
  )
}

function renderTypeChip(type) {
  var config = ACT_TYPES[type] || { label: type, className: 'typ-other' }
  return (
    '<span class="typchip ' + config.className + '">' + config.label + '</span>'
  )
}

/* ---------- Глобальное состояние ---------- */
var REFERENCES = {
  cexes: [],
  reasons: [],
  stations: [],
  owners: [],
  kinds: [],
  signers: [],
}

var AppState = { page: 'archive', selectedId: null }
var currentDraft = null

function parseWagons(rawText) {
  var seen = {},
    result = []
  String(rawText || '')
    .split(/[\s,;\n\t]+/)
    .forEach(function (token) {
      var num = token.replace(/[^\d]/g, '')
      if (num.length >= 6 && num.length <= 8 && !seen[num]) {
        seen[num] = 1
        result.push(num)
      }
    })
  return result
}

/* ============================ Инициализация ============================ */
$(document).ready(function () {
  $(document).ajaxStart(function () {
    $('.loadImg').show()
  })
  $(document).ajaxStop(function () {
    $('.loadImg').hide()
  })
  $(document).ajaxError(function () {
    showToast('Ошибка связи с сервером', 'err')
  })

  callApi('gu23_get_refs').done(function (response) {
    REFERENCES = response || REFERENCES
    renderApp()
  })
})

/* ============================ Навигация ============================ */
function renderNavigation() {
  var menuItems = [
    { page: 'new', icon: '＋', label: 'Создать акт' },
    { page: 'archive', icon: '', label: 'Архив актов' },
  ]
  var navContainer = $$('#nav')
  navContainer.innerHTML = ''

  menuItems.forEach(function (item) {
    var isActive =
      AppState.page === item.page ||
      (item.page === 'archive' && AppState.page === 'card')
    var button = createElement(
      'button',
      {
        class: 'navbtn' + (isActive ? ' active' : ''),
        onclick: function () {
          navigateTo(item.page)
        },
      },
      createElement('span', { class: 'ic' }, item.icon),
      createElement('span', {}, item.label),
    )
    navContainer.appendChild(button)
  })

  navContainer.appendChild(
    createElement('div', {
      class: 'foot',
      html: '',
    }),
  )
}

function navigateTo(page) {
  AppState.page = page
  AppState.selectedId = null
  if (page === 'new') currentDraft = null
  renderApp()
}

function openActDetails(id) {
  AppState.selectedId = id
  AppState.page = 'card'
  renderApp()
}

/* ============================ Роутер страницы ============================ */
function renderApp() {
  renderNavigation()
  var viewContainer = $$('#view')
  viewContainer.innerHTML = ''

  var views = {
    archive: renderArchiveView,
    new: renderNewActView,
    card: renderActCardView,
    wsearch: renderWagonSearchView,
  }

  var renderFunc = views[AppState.page] || renderArchiveView
  renderFunc(viewContainer)
}

function getReferenceNames(arr) {
  return (arr || []).map(function (item) {
    return item.NAME != null ? item.NAME : item.CODE
  })
}

function getCexCodes() {
  return (REFERENCES.cexes || []).map(function (item) {
    return item.CODE
  })
}

/* ============================ Архив ============================ */
function renderArchiveView(container) {
  container.appendChild(
    createElement(
      'div',
      { class: 'phead' },
      createElement('h1', {}, 'Архив актов'),
      createElement('p', {}, ''),
      createElement('div', { class: 'spacer' }),
    ),
  )

  var filterState = { q: '', type: '', status: '', cex: '' }
  var tableBox = createElement('div', { class: 'card' })

  function loadData() {
    callApi('gu23_get_acts', filterState).done(function (list) {
      tableBox.innerHTML = ''
      tableBox.appendChild(buildActsTable(list || []))
      tableBox.appendChild(
        createElement(
          'div',
          {
            class: 'cardpad muted',
            style: 'border-top:1px solid var(--line);font-size:12px',
          },
          'Найдено актов: ' + (list ? list.length : 0),
        ),
      )
    })
  }

  var filtersRow = createElement('div', { class: 'filters' })
  var searchBox = createElement('div', { class: 'searchbox' })
  var searchInput = createElement('input', {
    class: 'inp',
    placeholder: 'Номер акта, номер вагона, причина…',
  })

  searchInput.addEventListener('input', function () {
    filterState.q = searchInput.value.trim()
    clearTimeout(loadData.timer)
    loadData.timer = setTimeout(loadData, 250)
  })

  searchBox.appendChild(searchInput)
  filtersRow.appendChild(searchBox)

  filtersRow.appendChild(
    createFilterSelect(
      ['', 'start', 'end', 'other'],
      ['Все типы', 'Начало простоя', 'Окончание', 'Прочий'],
      function (val) {
        filterState.type = val
        loadData()
      },
    ),
  )
  filtersRow.appendChild(
    createFilterSelect(
      ['', 'draft', 'active', 'closed', 'annulled'],
      ['Все статусы', 'Черновик', 'Действующий', 'Закрыт', 'Аннулирован'],
      function (val) {
        filterState.status = val
        loadData()
      },
    ),
  )
  filtersRow.appendChild(
    createFilterSelect(
      [''].concat(getCexCodes()),
      ['Все цеха'].concat(getCexCodes()),
      function (val) {
        filterState.cex = val
        loadData()
      },
    ),
  )

  container.appendChild(filtersRow)
  container.appendChild(tableBox)
  loadData()
}

function createFilterSelect(values, labels, onChangeCallback) {
  var select = createElement('select', {
    class: 'inp',
    onchange: function (e) {
      onChangeCallback(e.target.value)
    },
  })
  values.forEach(function (val, idx) {
    select.appendChild(createElement('option', { value: val }, labels[idx]))
  })
  return select
}

function buildActsTable(list) {
  var table = createElement('table', { class: 'tbl' })
  table.innerHTML =
    '<thead><tr><th>Номер</th><th>Тип</th><th>Цех</th><th>Причина</th><th>Вагоны</th><th>Создан</th><th>Статус</th></tr></thead>'
  var tbody = createElement('tbody')

  if (!list.length) {
    tbody.appendChild(
      createElement(
        'tr',
        {},
        createElement(
          'td',
          {
            colspan: 7,
            class: 'muted',
            style: 'padding:24px;text-align:center',
          },
          'Актов не найдено',
        ),
      ),
    )
  }

  list.forEach(function (act) {
    var tr = createElement('tr', {
      onclick: function () {
        openActDetails(act.ID)
      },
    })
    tr.innerHTML =
      '<td class="num">' +
      escapeHtml(act.ACT_NUMBER) +
      '</td>' +
      '<td>' +
      renderTypeChip(act.ACT_TYPE) +
      '</td>' +
      '<td>' +
      escapeHtml(act.CEX) +
      '</td>' +
      '<td class="muted" style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
      escapeHtml(act.REASON) +
      '</td>' +
      '<td class="num">' +
      (act.WAGON_CNT || 0) +
      '</td>' +
      '<td class="muted">' +
      formatDate(act.CREATED_AT) +
      '</td>' +
      '<td>' +
      renderStatusChip(act.STATUS) +
      '</td>'
    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  return createElement('div', { style: 'overflow:auto' }, table)
}

/* ============================ Создание акта ============================ */
function initNewDraft(type) {
  return {
    id: 0,
    type: type,
    status: 'draft',
    cex: (REFERENCES.cexes[0] || {}).CODE || '',
    station: 'Углеуральская',
    reason: '',
    circumstances: '',
    wagons: [],
    signers: [],
    startAt: '',
    endAt: '',
    linkedStartId: '',
    linkedStartNumber: '',
    _summary: null,
    _openStarts: null,
  }
}

function renderNewActView(container) {
  if (!currentDraft) currentDraft = initNewDraft('start')

  container.appendChild(
    createElement(
      'div',
      { class: 'phead' },
      createElement(
        'h1',
        {},
        currentDraft.id ? 'Редактирование акта ГУ-23' : 'Создание акта ГУ-23',
      ),
      createElement('p', {}, ''),
      createElement('div', { class: 'spacer' }),
    ),
  )

  var segmentControl = createElement('div', {
    class: 'seg',
    style: 'margin-bottom:18px',
  })
  ;[
    ['start', 'Начало простоя'],
    ['end', 'Окончание простоя'],
    ['other', 'Прочий акт'],
  ].forEach(function (item) {
    segmentControl.appendChild(
      createElement(
        'button',
        {
          class: currentDraft.type === item[0] ? 'on' : '',
          onclick: function () {
            currentDraft = initNewDraft(item[0])
            renderApp()
          },
        },
        item[1],
      ),
    )
  })
  if (!currentDraft.id) container.appendChild(segmentControl)

  var cardElement = createElement('div', { class: 'card' })
  var cardBody = createElement('div', { class: 'cardpad' })
  cardElement.appendChild(cardBody)

  if (currentDraft.type === 'end') buildEndPicker(cardBody)

  var colRow1 = createElement('div', { class: 'cols' })
  colRow1.appendChild(
    createFormField(
      'Цех составления',
      createSelectInput(getCexCodes(), currentDraft.cex, function (val) {
        currentDraft.cex = val
      }),
      true,
    ),
  )
  colRow1.appendChild(
    createFormField(
      'Станция',
      createSelectInput(
        getReferenceNames(REFERENCES.stations),
        currentDraft.station,
        function (val) {
          currentDraft.station = val
        },
      ),
      true,
    ),
  )
  cardBody.appendChild(colRow1)

  var colRow2 = createElement('div', { class: 'cols' })
  colRow2.appendChild(
    createFormField(
      'Причина составления',
      createSelectInput(
        [''].concat(getReferenceNames(REFERENCES.reasons)),
        currentDraft.reason,
        function (val) {
          currentDraft.reason = val
        },
      ),
      true,
    ),
  )

  if (currentDraft.type === 'start') {
    colRow2.appendChild(
      createFormField(
        'Дата и время начала простоя',
        createDateTimeInput(currentDraft.startAt, function (val) {
          currentDraft.startAt = val
        }),
        true,
      ),
    )
  }
  if (currentDraft.type === 'end') {
    colRow2.appendChild(
      createFormField(
        'Дата и время окончания простоя',
        createDateTimeInput(currentDraft.endAt, function (val) {
          currentDraft.endAt = val
          renderApp()
        }),
        true,
      ),
    )
  }
  cardBody.appendChild(colRow2)

  if (currentDraft.type === 'end' && currentDraft.startAt) {
    var isInvalidDate =
      currentDraft.endAt &&
      getTimeMs(currentDraft.endAt) < getTimeMs(currentDraft.startAt)
    cardBody.appendChild(
      createElement('div', {
        class: 'banner ' + (isInvalidDate ? 'err' : 'info'),
        html: getDurationPreviewHtml(),
      }),
    )
  }

  cardBody.appendChild(
    createFormField(
      'Обстоятельства, вызвавшие составление акта',
      createTextArea(currentDraft.circumstances, function (val) {
        currentDraft.circumstances = val
      }),
      true,
    ),
  )

  cardBody.appendChild(createElement('div', { style: 'height:6px' }))
  cardBody.appendChild(
    createElement(
      'label',
      {
        style: 'font-size:13px;font-weight:600;display:block;margin-bottom:8px',
      },
      'Вагоны',
    ),
  )

  var wagonsTextArea = createElement('textarea', {
    class: 'inp',
    style: 'min-height:56px',
    placeholder:
      'Введите номера вагонов: через запятую, пробел, построчно или вставьте из Excel…',
  })
  cardBody.appendChild(wagonsTextArea)

  var actionButtonsRow = createElement('div', {
    style: 'display:flex;gap:9px;flex-wrap:wrap;margin:10px 0',
  })

  actionButtonsRow.appendChild(
    createElement(
      'button',
      {
        class: 'btn sm',
        onclick: function () {
          processAddedWagons(wagonsTextArea.value)
          wagonsTextArea.value = ''
          renderApp()
        },
      },
      '＋ Добавить вагоны',
    ),
  )

  if (currentDraft.type !== 'other') {
    actionButtonsRow.appendChild(
      createElement(
        'button',
        {
          class: 'btn sm primary',
          onclick: function () {
            requestWagonInformation(wagonsTextArea.value)
          },
        },
        'Запросить из Дислокации',
      ),
    )
  }
  if (currentDraft.type === 'end') {
    actionButtonsRow.appendChild(
      createElement(
        'button',
        {
          class: 'btn sm',
          onclick: function () {
            findOpenActByWagonsInput(wagonsTextArea.value)
            wagonsTextArea.value = ''
          },
        },
        'Найти открытый простой',
      ),
    )
  }
  cardBody.appendChild(actionButtonsRow)

  if (currentDraft._summary) {
    var summaryClass =
      currentDraft._summary.found < currentDraft._summary.req ? 'warn' : 'ok'
    cardBody.appendChild(
      createElement('div', {
        class: 'banner ' + summaryClass,
        html: currentDraft._summary.text,
      }),
    )
  }

  cardBody.appendChild(buildWagonsEditorTable())

  cardBody.appendChild(createElement('div', { style: 'height:14px' }))
  cardBody.appendChild(buildSignersPickerSection())

  var cardFooter = createElement('div', {
    class: 'cardpad',
    style:
      'border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end',
  })

  cardFooter.appendChild(
    createElement(
      'button',
      {
        class: 'btn ghost',
        onclick: function () {
          currentDraft = null
          navigateTo('archive')
        },
      },
      'Отмена',
    ),
  )
  cardFooter.appendChild(
    createElement(
      'button',
      {
        class: 'btn',
        onclick: function () {
          saveActRemote('draft')
        },
      },
      'Сохранить черновик',
    ),
  )
  cardFooter.appendChild(
    createElement(
      'button',
      {
        class: 'btn primary',
        onclick: function () {
          saveActRemote('active')
        },
      },
      'Сохранить и создать акт',
    ),
  )

  cardElement.appendChild(cardFooter)
  container.appendChild(cardElement)
}

function getTimeMs(localStr) {
  return new Date(localStr).getTime()
}

function buildEndPicker(bodyContainer) {
  bodyContainer.appendChild(
    createElement('div', {
      class: 'banner info',
      html: 'Акт «Окончание простоя» закрывает ранее открытый акт начала. Выберите открытый акт — данные подтянутся автоматически.',
    }),
  )

  var row = createElement('div', { class: 'frow' })
  row.appendChild(
    createElement('label', {
      html: 'Открытый акт начала простоя <span class="req">*</span>',
    }),
  )

  var select = createElement('select', {
    class: 'inp',
    onchange: function (e) {
      applySelectedStartAct(e.target.value)
      renderApp()
    },
  })
  select.appendChild(
    createElement('option', { value: '' }, '— выберите открытый акт начала —'),
  )
  row.appendChild(select)
  row.appendChild(createElement('div', { class: 'hint' }))
  bodyContainer.appendChild(row)

  if (currentDraft._openStarts == null) {
    callApi('gu23_get_open_starts').done(function (list) {
      currentDraft._openStarts = list || []
      populateEndOptions(select)
    })
  } else {
    populateEndOptions(select)
  }
}

function populateEndOptions(selectElement) {
  ;(currentDraft._openStarts || []).forEach(function (act) {
    var wagonNumbers = (act.WAGONS || [])
      .map(function (w) {
        return w.WAGON_NO
      })
      .join(', ')
    var option = createElement(
      'option',
      { value: act.ID },
      act.ACT_NUMBER + ' · ' + wagonNumbers + ' · ' + act.REASON,
    )
    if (String(currentDraft.linkedStartId) === String(act.ID))
      option.selected = true
    selectElement.appendChild(option)
  })
}

function applySelectedStartAct(id) {
  var selectedAct = (currentDraft._openStarts || []).filter(function (item) {
    return String(item.ID) === String(id)
  })[0]

  if (!selectedAct) {
    currentDraft.linkedStartId = ''
    return
  }

  currentDraft.linkedStartId = selectedAct.ID
  currentDraft.linkedStartNumber = selectedAct.ACT_NUMBER
  currentDraft.startAt = convertToInputDateTime(selectedAct.START_AT)
  currentDraft.cex = selectedAct.CEX
  currentDraft.station = selectedAct.STATION
  currentDraft.reason = selectedAct.REASON
  currentDraft.wagons = (selectedAct.WAGONS || []).map(function (w) {
    return {
      n: w.WAGON_NO,
      owner: w.OWNER,
      kind: w.KIND,
      from: w.ST_FROM,
      to: w.ST_TO,
      cargo: w.CARGO,
      weight: w.WEIGHT,
    }
  })

  currentDraft._summary = {
    req: currentDraft.wagons.length,
    found: currentDraft.wagons.length,
    text:
      'Подтянуты данные из акта начала ' +
      selectedAct.ACT_NUMBER +
      ': вагоны, причина, цех, станция, дата начала ' +
      formatDateTime(selectedAct.START_AT) +
      '.',
  }
}

function findOpenActByWagonsInput(rawText) {
  var wagonNums = parseWagons(rawText)
  if (!wagonNums.length) {
    showToast('Введите номер вагона', 'err')
    return
  }

  function executeSearch() {
    var matchAct = null
    ;(currentDraft._openStarts || []).forEach(function (act) {
      ;(act.WAGONS || []).forEach(function (w) {
        if (wagonNums.indexOf(w.WAGON_NO) >= 0 && !matchAct) matchAct = act
      })
    })

    if (matchAct) {
      applySelectedStartAct(matchAct.ID)
      showToast('Найден открытый акт ' + matchAct.ACT_NUMBER, 'ok')
      renderApp()
    } else {
      showToast('Открытый простой по этим вагонам не найден', 'err')
    }
  }

  if (currentDraft._openStarts == null) {
    callApi('gu23_get_open_starts').done(function (list) {
      currentDraft._openStarts = list || []
      executeSearch()
    })
  } else {
    executeSearch()
  }
}

function getDurationPreviewHtml() {
  if (!currentDraft.startAt || !currentDraft.endAt) {
    return 'Длительность простоя будет рассчитана автоматически по дате начала и окончания.'
  }
  var startMs = getTimeMs(currentDraft.startAt)
  var endMs = getTimeMs(currentDraft.endAt)

  if (endMs < startMs)
    return '⚠ Дата окончания меньше даты начала — сохранение будет заблокировано.'
  if (endMs === startMs)
    return '⚠ Длительность простоя составляет 0 часов (даты совпадают).'

  var duration = calculateDuration(startMs, endMs)
  return (
    'Расчёт простоя: <b>' +
    formatDuration(duration) +
    '</b>, всего ' +
    formatTotalHours(duration) +
    ' · для претензий: ' +
    duration.calendarDays +
    ' кал. дн. Значение рассчитано автоматически.'
  )
}

function processAddedWagons(rawText) {
  var parsedNums = parseWagons(rawText)
  var addedCount = 0

  parsedNums.forEach(function (num) {
    var isDuplicate = currentDraft.wagons.some(function (w) {
      return w.n === num
    })
    if (!isDuplicate) {
      currentDraft.wagons.push({
        n: num,
        owner: '',
        kind: '',
        from: '',
        to: '',
        cargo: '',
        weight: '',
      })
      addedCount++
    }
  })

  currentDraft._summary = {
    req: parsedNums.length,
    found: addedCount,
    text:
      'Распознано ' +
      parsedNums.length +
      ' вагон(ов), добавлено новых: ' +
      addedCount +
      '. Дубли и пустые строки исключены.',
  }
}

function requestWagonInformation(rawText) {
  var inputNums = parseWagons(rawText)
  var targetWagons = inputNums.length
    ? inputNums
    : currentDraft.wagons.map(function (w) {
        return w.n
      })

  if (!targetWagons.length) {
    showToast('Введите номера вагонов', 'err')
    return
  }

  callApi('gu23_get_wagon_info', {
    wagons: JSON.stringify(targetWagons),
    station: currentDraft.station,
  }).done(function (rows) {
    rows = rows || []
    var foundCount = 0

    rows.forEach(function (row) {
      var wagon = currentDraft.wagons.filter(function (x) {
        return x.n === row.WAGON_NO
      })[0]
      if (!wagon) {
        wagon = {
          n: row.WAGON_NO,
          owner: '',
          kind: '',
          from: '',
          to: '',
          cargo: '',
          weight: '',
        }
        currentDraft.wagons.push(wagon)
      }
      if (String(row.FOUND) === '1') {
        wagon.owner = row.OWNER
        wagon.kind = row.KIND
        wagon.from = row.ST_FROM
        wagon.to = row.ST_TO
        wagon.cargo = row.CARGO
        wagon.weight = row.WEIGHT
        foundCount++
      }
    })

    currentDraft._summary = {
      req: targetWagons.length,
      found: foundCount,
      text:
        'Запрошено ' +
        targetWagons.length +
        ' вагонов, найдено ' +
        foundCount +
        ' вагонов.' +
        (currentDraft.station !== 'Углеуральская'
          ? ' <br>⚠ Внимание: данные подтягиваются только если станция операции — Углеуральская.'
          : ''),
    }

    showToast(
      'Получено ' + foundCount + ' из ' + targetWagons.length,
      foundCount ? 'ok' : 'err',
    )
    renderApp()
  })
}

function buildWagonsEditorTable() {
  if (!currentDraft.wagons.length) {
    return createElement(
      'div',
      { class: 'banner info' },
      'Вагоны не добавлены. Введите номера выше и нажмите «Запросить в Oracle BI / Дислокация».',
    )
  }

  var scrollWrapper = createElement('div', {
    style: 'overflow:auto;border:1px solid var(--line);border-radius:7px',
  })
  var table = createElement('table', { class: 'wtbl' })
  var isEndType = currentDraft.type === 'end'

  table.innerHTML =
    '<thead><tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th><th>Вес</th>' +
    (isEndType ? '<th>Простой</th>' : '') +
    '<th></th></tr></thead>'

  var tbody = createElement('tbody')
  currentDraft.wagons.forEach(function (wagon, idx) {
    var tr = createElement('tr')
    tr.appendChild(createElement('td', { class: 'wn' }, wagon.n))
    ;['owner', 'kind', 'from', 'to', 'cargo', 'weight'].forEach(
      function (fieldKey) {
        var td = createElement('td')
        td.appendChild(
          createElement(
            'span',
            {
              style:
                'padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;',
            },
            wagon[fieldKey] || '—',
          ),
        )
        tr.appendChild(td)
      },
    )

    if (isEndType) {
      var calculatedDur = '—'
      if (currentDraft.startAt && currentDraft.endAt) {
        var startMs = getTimeMs(currentDraft.startAt)
        var endMs = getTimeMs(currentDraft.endAt)
        if (endMs >= startMs)
          calculatedDur = formatDuration(calculateDuration(startMs, endMs))
      }
      tr.appendChild(createElement('td', { class: 'dur' }, calculatedDur))
    }

    tr.appendChild(
      createElement(
        'td',
        {},
        createElement(
          'button',
          {
            class: 'delx',
            onclick: function () {
              currentDraft.wagons.splice(idx, 1)
              renderApp()
            },
          },
          '×',
        ),
      ),
    )
    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  scrollWrapper.appendChild(table)

  return createElement(
    'div',
    {},
    scrollWrapper,
    createElement(
      'div',
      { class: 'hint', style: 'margin-top:6px' },
      'Вагонов в акте: ' +
        currentDraft.wagons.length +
        '. В печатной форме строк будет столько же.',
    ),
  )
}

function buildSignersPickerSection() {
  var requiredSignersCount = currentDraft.type === 'other' ? 2 : 3
  var container = createElement('div', {})

  container.appendChild(
    createElement(
      'label',
      {
        style: 'font-size:13px;font-weight:600;display:block;margin-bottom:8px',
      },
      'Подписанты (требуется ' + requiredSignersCount + ')',
    ),
  )

  var availableSigners = REFERENCES.signers || []

  for (var i = 0; i < requiredSignersCount; i++) {
    ;(function (currentIndex) {
      var activeSigner = currentDraft.signers[currentIndex]
      var helpText =
        currentDraft.type === 'other'
          ? currentIndex === 0
            ? 'Представитель предприятия'
            : 'Второй подписант'
          : currentIndex < 2
            ? 'Работник предприятия'
            : 'Работник станции ОАО «РЖД»'

      var row = createElement('div', { class: 'frow' })
      row.appendChild(
        createElement('label', {
          html:
            'Подписант ' +
            (currentIndex + 1) +
            ' <span class="muted" style="font-weight:400">· ' +
            helpText +
            '</span>',
        }),
      )

      var select = createElement('select', {
        class: 'inp',
        onchange: function (e) {
          var match = availableSigners.filter(function (x) {
            return String(x.ID) === e.target.value
          })[0]
          currentDraft.signers[currentIndex] = match
            ? { id: match.ID, fio: match.FIO, post: match.POST, org: match.ORG }
            : null
        },
      })

      select.appendChild(createElement('option', { value: '' }, '— выберите —'))
      availableSigners.forEach(function (signer) {
        var option = createElement(
          'option',
          { value: signer.ID },
          signer.FIO + ' · ' + (signer.POST || '') + ' · ' + (signer.ORG || ''),
        )
        if (activeSigner && String(activeSigner.id) === String(signer.ID))
          option.selected = true
        select.appendChild(option)
      })

      row.appendChild(select)
      container.appendChild(row)
    })(i)
  }
  return container
}

function validateDraftForm(checkSigners) {
  var errorMessages = []
  if (!currentDraft.cex) errorMessages.push('Не указан цех')
  if (!currentDraft.reason) errorMessages.push('Не указана причина составления')
  if (!String(currentDraft.circumstances).trim())
    errorMessages.push('Не заполнены обстоятельства')
  if (!currentDraft.wagons.length)
    errorMessages.push('Не добавлен ни один вагон')
  if (currentDraft.type === 'start' && !currentDraft.startAt)
    errorMessages.push('Не указана дата начала простоя')

  if (currentDraft.type === 'end') {
    if (!currentDraft.linkedStartId)
      errorMessages.push('Не выбран открытый акт начала простоя')
    if (!currentDraft.endAt)
      errorMessages.push('Не указана дата окончания простоя')
    if (
      currentDraft.startAt &&
      currentDraft.endAt &&
      getTimeMs(currentDraft.endAt) < getTimeMs(currentDraft.startAt)
    ) {
      errorMessages.push('Дата окончания меньше даты начала')
    }
  }

  if (checkSigners) {
    var requiredCount = currentDraft.type === 'other' ? 2 : 3
    var filledCount = currentDraft.signers.filter(Boolean).length
    if (filledCount < requiredCount)
      errorMessages.push(
        'Указано подписантов ' + filledCount + ' из ' + requiredCount,
      )
  }
  return errorMessages
}

function saveActRemote(status, skipWarning) {
  var errors = validateDraftForm(status === 'active')
  if (status === 'draft') {
    errors = errors.filter(function (msg) {
      return msg.indexOf('подписант') < 0
    })
  }
  if (errors.length) {
    showToast(errors[0], 'err')
    return
  }

  var payload = {
    id: currentDraft.id || 0,
    type: currentDraft.type,
    status: status,
    cex: currentDraft.cex,
    station: currentDraft.station,
    reason: currentDraft.reason,
    circumstances: currentDraft.circumstances,
    start_at: currentDraft.startAt
      ? currentDraft.startAt.replace('T', ' ')
      : '',
    end_at: currentDraft.endAt ? currentDraft.endAt.replace('T', ' ') : '',
    linked_start_id: currentDraft.linkedStartId || '',
    wagons: JSON.stringify(currentDraft.wagons),
    signers: JSON.stringify(currentDraft.signers.filter(Boolean)),
    force: skipWarning ? 'Y' : 'N',
  }

  callApi('gu23_save_act', payload).done(function (response) {
    if (response && response.ok) {
      showToast(
        status === 'draft'
          ? 'Черновик сохранён'
          : 'Акт заведён, № ' + response.number,
        'ok',
      )
      currentDraft = null
      openActDetails(response.id)
    } else {
      var serverMsg = (response && response.msg) || 'Ошибка сохранения'
      if (/уже есть открытый акт начала/.test(serverMsg)) {
        openConfirmModal(
          'Дубль открытого простоя',
          serverMsg + '. Завести акт всё равно?',
          function () {
            saveActRemote(status, true)
          },
        )
      } else {
        showToast(serverMsg, 'err')
      }
    }
  })
}

/* ============================ Карточка акта ============================ */
function renderActCardView(container) {
  callApi('gu23_get_act', { id: AppState.selectedId }).done(function (data) {
    container.innerHTML = ''
    if (!data || !data.ok) {
      container.appendChild(
        createElement('div', { class: 'empty-state' }, 'Акт не найден'),
      )
      return
    }
    buildCardInterface(container, data)
  })
}

function buildCardInterface(container, data) {
  var act = data.act
  container.appendChild(
    createElement(
      'div',
      { class: 'phead' },
      createElement(
        'button',
        {
          class: 'btn sm ghost',
          onclick: function () {
            navigateTo('archive')
          },
        },
        '← Архив',
      ),
      createElement(
        'h1',
        { style: 'font-family:var(--mono);font-size:18px' },
        act.ACT_NUMBER,
      ),
      createElement('span', { html: renderTypeChip(act.ACT_TYPE) }),
      createElement('span', { html: renderStatusChip(act.STATUS) }),
      createElement('div', { class: 'spacer' }),
    ),
  )

  var actionsToolbar = createElement('div', {
    style: 'display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px',
  })
  actionsToolbar.appendChild(
    createElement(
      'button',
      {
        class: 'btn',
        onclick: function () {
          window.print()
        },
      },
      '⎙ Печать',
    ),
  )

  if (act.STATUS === 'draft') {
    actionsToolbar.appendChild(
      createElement(
        'button',
        {
          class: 'btn primary',
          onclick: function () {
            switchToEditMode(data)
          },
        },
        '✎ Редактировать',
      ),
    )
    actionsToolbar.appendChild(
      createElement(
        'button',
        {
          class: 'btn danger',
          onclick: function () {
            deleteDraftAct(act)
          },
        },
        '🗑 Удалить черновик',
      ),
    )
  }
  if (act.STATUS === 'active' || act.STATUS === 'closed') {
    actionsToolbar.appendChild(
      createElement(
        'button',
        {
          class: 'btn danger',
          onclick: function () {
            annulSignedAct(act)
          },
        },
        '⊘ Аннулировать',
      ),
    )
  }
  container.appendChild(actionsToolbar)

  if (act.STATUS === 'annulled' && act.ANNUL_REASON) {
    container.appendChild(
      createElement('div', {
        class: 'banner err',
        html: '<b>Аннулирован.</b> Причина: ' + escapeHtml(act.ANNUL_REASON),
      }),
    )
  }

  var mainGrid = createElement('div', {
    style:
      'display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start',
  })

  var leftColumn = createElement('div', {})
  var detailsCard = createElement('div', { class: 'card' })
  detailsCard.appendChild(
    createElement(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      createElement('b', {}, 'Реквизиты акта'),
    ),
  )

  var definitionList = createElement('dl', {
    class: 'kv',
    style: 'padding:16px 18px',
  })
  function appendRow(label, htmlContent) {
    definitionList.appendChild(createElement('dt', {}, label))
    definitionList.appendChild(createElement('dd', { html: htmlContent }))
  }

  appendRow('Тип акта', ACT_TYPES[act.ACT_TYPE].label)
  appendRow('Цех составления', escapeHtml(act.CEX))
  appendRow('Станция', escapeHtml(act.STATION))
  appendRow('Причина', escapeHtml(act.REASON))
  appendRow('Дата составления', formatDateTime(act.CREATED_AT))

  if (act.ACT_TYPE !== 'other') {
    appendRow(
      'Начало простоя',
      '<span class="mono">' + formatDateTime(act.START_AT) + '</span>',
    )
  }
  if (act.ACT_TYPE === 'end') {
    appendRow(
      'Окончание простоя',
      '<span class="mono">' + formatDateTime(act.END_AT) + '</span>',
    )
    appendRow(
      'Длительность',
      '<b class="mono" style="color:var(--sign)">' +
        (act.DUR_DAYS || 0) +
        ' дн. ' +
        (act.DUR_HOURS || 0) +
        ' ч.</b> · всего ' +
        (act.DUR_TOTAL_H || 0) +
        ' ч. · ' +
        (act.CAL_DAYS || 0) +
        ' кал. дн.',
    )
    if (act.LINKED_START_ID) {
      appendRow(
        'Связан с актом начала',
        '<a href="#" onclick="openActDetails(' +
          act.LINKED_START_ID +
          ');return false">' +
          escapeHtml(act.LINKED_START_NUMBER || '—') +
          '</a>',
      )
    }
  }
  appendRow('Обстоятельства', escapeHtml(act.CIRCUMSTANCES))
  appendRow('Создал', escapeHtml(act.CREATED_BY))

  detailsCard.appendChild(definitionList)
  leftColumn.appendChild(detailsCard)

  var wagonsCard = createElement('div', {
    class: 'card',
    style: 'margin-top:16px',
  })
  wagonsCard.appendChild(
    createElement(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      createElement('b', {}, 'Вагоны (' + data.wagons.length + ')'),
    ),
  )

  var wagonsTable = createElement('table', { class: 'tbl' })
  wagonsTable.innerHTML =
    '<thead><tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th><th>Вес</th></tr></thead>'
  var wagonsTbody = createElement('tbody')

  data.wagons.forEach(function (w) {
    var tr = createElement('tr', { style: 'cursor:default' })
    tr.innerHTML =
      '<td class="num" style="color:var(--signal);font-weight:600">' +
      escapeHtml(w.WAGON_NO) +
      '</td>' +
      '<td>' +
      escapeHtml(w.OWNER || '—') +
      '</td><td>' +
      escapeHtml(w.KIND || '—') +
      '</td>' +
      '<td>' +
      escapeHtml(w.ST_FROM || '—') +
      '</td><td>' +
      escapeHtml(w.ST_TO || '—') +
      '</td>' +
      '<td>' +
      escapeHtml(w.CARGO || '—') +
      '</td><td class="num">' +
      escapeHtml(w.WEIGHT || '—') +
      '</td>'
    wagonsTbody.appendChild(tr)
  })
  wagonsTable.appendChild(wagonsTbody)
  wagonsCard.appendChild(
    createElement('div', { style: 'overflow:auto' }, wagonsTable),
  )
  leftColumn.appendChild(wagonsCard)
  mainGrid.appendChild(leftColumn)

  var rightColumn = createElement('div', {})
  var signersCard = createElement('div', { class: 'card' })
  signersCard.appendChild(
    createElement(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      createElement('b', {}, 'Подписанты'),
    ),
  )

  var signersBox = createElement('div', { class: 'cardpad' })
  if (!data.signers.length) {
    signersBox.appendChild(
      createElement('div', { class: 'muted' }, 'Подписанты не назначены'),
    )
  }

  data.signers.forEach(function (signer) {
    signersBox.appendChild(
      createElement(
        'div',
        { class: 'signrow' },
        createElement('div', { class: 'av' }, (signer.FIO || '?').slice(0, 1)),
        createElement(
          'div',
          { style: 'flex:1' },
          createElement('div', {
            html: '<b>' + escapeHtml(signer.FIO) + '</b>',
          }),
          createElement(
            'div',
            { class: 'muted', style: 'font-size:11.5px' },
            (signer.POST || '') + ' · ' + (signer.ORG || ''),
          ),
        ),
      ),
    )
  })
  signersCard.appendChild(signersBox)
  rightColumn.appendChild(signersCard)

  var filesCard = createElement('div', {
    class: 'card',
    style: 'margin-top:16px',
  })
  var filesHead = createElement(
    'div',
    {
      class: 'cardpad',
      style:
        'border-bottom:1px solid var(--line);display:flex;align-items:center',
    },
    createElement('b', {}, 'Приложения'),
    createElement('div', { style: 'flex:1' }),
  )

  if (act.STATUS !== 'annulled') {
    var fileLabelBtn = createElement('label', { class: 'btn sm' }, '＋ Файл')
    var hiddenFileInput = createElement('input', {
      type: 'file',
      multiple: true,
      style: 'display:none',
      accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    })
    hiddenFileInput.addEventListener('change', function () {
      executeFilesUpload(act.ID, hiddenFileInput.files)
    })
    fileLabelBtn.appendChild(hiddenFileInput)
    filesHead.appendChild(fileLabelBtn)
  }
  filesCard.appendChild(filesHead)

  var filesBox = createElement('div', { class: 'cardpad' })
  if (!data.files.length) {
    filesBox.appendChild(
      createElement(
        'div',
        { class: 'muted', style: 'font-size:12.5px' },
        'Фото и файлы не прикреплены.',
      ),
    )
  }

  data.files.forEach(function (file) {
    var isImage = /(png|jpe?g|gif|bmp|webp)$/i.test(file.FILE_EXT || '')
    var fileRow = createElement('div', {
      style:
        'display:flex;gap:9px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)',
    })

    if (isImage) {
      fileRow.appendChild(
        createElement('img', {
          src: 'get_file.php?inline=1&id=' + file.ID,
          style:
            'width:38px;height:38px;object-fit:cover;border-radius:5px;cursor:pointer',
          onclick: function () {
            window.open('get_file.php?inline=1&id=' + file.ID)
          },
        }),
      )
    } else {
      fileRow.appendChild(
        createElement(
          'div',
          {
            style:
              'width:38px;height:38px;border-radius:5px;background:var(--surface2);display:grid;place-items:center;color:var(--muted)',
          },
          '📄',
        ),
      )
    }

    fileRow.appendChild(
      createElement(
        'div',
        { style: 'flex:1;font-size:12.5px' },
        createElement(
          'a',
          { href: 'get_file.php?id=' + file.ID },
          escapeHtml(file.FILE_NAME),
        ),
        createElement(
          'div',
          { class: 'muted', style: 'font-size:11px' },
          formatDateTime(file.CREATED_AT) +
            ' · ' +
            escapeHtml(file.CREATED_BY || ''),
        ),
      ),
    )

    if (act.STATUS !== 'annulled') {
      fileRow.appendChild(
        createElement(
          'button',
          {
            class: 'delx',
            onclick: function () {
              deleteAttachedFile(file.ID, act.ID)
            },
          },
          '×',
        ),
      )
    }
    filesBox.appendChild(fileRow)
  })
  filesCard.appendChild(filesBox)
  rightColumn.appendChild(filesCard)

  var historyCard = createElement('div', {
    class: 'card',
    style: 'margin-top:16px',
  })
  historyCard.appendChild(
    createElement(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      createElement('b', {}, 'История'),
    ),
  )

  var scrollHistoryWrapper = createElement('div', { class: 'hist-container' })
  var historyUl = createElement('ul', {
    class: 'hist',
    style: 'padding:0 18px',
  })

  data.history.forEach(function (log) {
    historyUl.appendChild(
      createElement(
        'li',
        {},
        createElement('span', { class: 't' }, formatDateTime(log.TS)),
        createElement('span', {
          html:
            escapeHtml(log.TXT) +
            (log.USR
              ? ' · <span class="muted">' + escapeHtml(log.USR) + '</span>'
              : ''),
        }),
      ),
    )
  })

  scrollHistoryWrapper.appendChild(historyUl)
  historyCard.appendChild(scrollHistoryWrapper)
  rightColumn.appendChild(historyCard)

  mainGrid.appendChild(rightColumn)
  container.appendChild(mainGrid)
}

function switchToEditMode(data) {
  var act = data.act
  currentDraft = {
    id: act.ID,
    type: act.ACT_TYPE,
    status: 'draft',
    cex: act.CEX,
    station: act.STATION,
    reason: act.REASON,
    circumstances: act.CIRCUMSTANCES || '',
    startAt: convertToInputDateTime(act.START_AT),
    endAt: convertToInputDateTime(act.END_AT),
    linkedStartId: act.LINKED_START_ID || '',
    linkedStartNumber: act.LINKED_START_NUMBER || '',
    wagons: data.wagons.map(function (w) {
      return {
        n: w.WAGON_NO,
        owner: w.OWNER,
        kind: w.KIND,
        from: w.ST_FROM,
        to: w.ST_TO,
        cargo: w.CARGO,
        weight: w.WEIGHT,
      }
    }),
    signers: data.signers.map(function (s) {
      return { id: null, fio: s.FIO, post: s.POST, org: s.ORG }
    }),
    _summary: null,
    _openStarts: null,
  }
  AppState.page = 'new'
  AppState.selectedId = null
  renderApp()
}

function deleteDraftAct(act) {
  openConfirmModal(
    'Удаление черновика',
    'Удалить черновик ' + act.ACT_NUMBER + '? Действие необратимо.',
    function () {
      callApi('gu23_del_act', { id: act.ID }).done(function (response) {
        if (response && response.ok) {
          showToast('Черновик удалён', 'ok')
          navigateTo('archive')
        } else {
          showToast((response && response.msg) || 'Ошибка удаления', 'err')
        }
      })
    },
  )
}

function annulSignedAct(act) {
  openPromptModal(
    'Аннулирование акта',
    'Подписанный/действующий акт нельзя удалить. Укажите причину аннулирования:',
    function (reason) {
      if (!reason) return
      callApi('gu23_annul_act', { id: act.ID, reason: reason }).done(
        function (response) {
          if (response && response.ok) {
            showToast('Акт аннулирован', 'ok')
            openActDetails(act.ID)
          } else {
            showToast((response && response.msg) || 'Ошибка', 'err')
          }
        },
      )
    },
  )
}

function executeFilesUpload(actId, files) {
  if (!files || !files.length) return
  var formData = new FormData()
  formData.append('ajax_action', 'gu23_upload_file')
  formData.append('act_id', actId)

  for (var i = 0; i < files.length; i++) {
    formData.append('file' + i, files[i])
  }

  $.ajax({
    url: '/data.php',
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    dataType: 'json',
  }).done(function (response) {
    if (response && response.ok) showToast('Файлы загружены', 'ok')
    else showToast('Часть файлов не загружена', 'err')
    openActDetails(actId)
  })
}

function deleteAttachedFile(fileId, actId) {
  openConfirmModal('Удаление файла', 'Удалить приложение?', function () {
    callApi('gu23_del_file', { file_id: fileId }).done(function (response) {
      if (response && response.ok) {
        showToast('Файл удалён', 'ok')
        openActDetails(actId)
      } else {
        showToast((response && response.msg) || 'Ошибка', 'err')
      }
    })
  })
}

/* ============================ Поиск по вагону ============================ */
function renderWagonSearchView(container) {
  container.appendChild(
    createElement(
      'div',
      { class: 'phead' },
      createElement('h1', {}, 'Поиск по вагону'),
      createElement('p', {}, 'Все акты, где участвовал вагон'),
    ),
  )

  var resultsBox = createElement('div', {})
  var filtersRow = createElement('div', { class: 'filters' })
  var searchBox = createElement('div', { class: 'searchbox' })
  var input = createElement('input', {
    class: 'inp',
    placeholder: 'Номер вагона…',
  })

  searchBox.appendChild(input)
  filtersRow.appendChild(searchBox)
  filtersRow.appendChild(
    createElement('button', { class: 'btn', onclick: executeSearch }, 'Найти'),
  )

  container.appendChild(filtersRow)
  container.appendChild(resultsBox)

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') executeSearch()
  })

  function executeSearch() {
    var wagonNum = parseWagons(input.value)[0] || input.value.trim()
    if (!wagonNum) {
      showToast('Введите номер вагона', 'err')
      return
    }
    callApi('gu23_get_by_wagon', { wagon: wagonNum }).done(function (list) {
      resultsBox.innerHTML = ''
      var cardElement = createElement('div', { class: 'card' })
      cardElement.appendChild(buildActsTable(list || []))
      resultsBox.appendChild(cardElement)
    })
  }
}

/* ============================ Модальные окна и Тосты ============================ */
function openConfirmModal(title, message, onConfirmCallback) {
  var bodyNode = createElement('div', {}, createElement('p', {}, message))
  openModalWindow(title, bodyNode, [
    { label: 'Отмена', className: 'btn ghost', callback: closeModalWindow },
    {
      label: 'Подтвердить',
      className: 'btn primary',
      callback: function () {
        closeModalWindow()
        onConfirmCallback()
      },
    },
  ])
}

function openPromptModal(title, message, onConfirmCallback) {
  var textarea = createElement('textarea', {
    class: 'inp',
    style: 'min-height:80px',
  })
  var bodyNode = createElement(
    'div',
    {},
    createElement('p', {}, message),
    textarea,
  )

  openModalWindow(title, bodyNode, [
    { label: 'Отмена', className: 'btn ghost', callback: closeModalWindow },
    {
      label: 'OK',
      className: 'btn primary',
      callback: function () {
        var value = textarea.value.trim()
        closeModalWindow()
        onConfirmCallback(value)
      },
    },
  ])
}

function openModalWindow(title, bodyNode, buttonsConfig) {
  var footer = createElement('div', { class: 'mfoot' })
  buttonsConfig.forEach(function (btn) {
    footer.appendChild(
      createElement(
        'button',
        { class: btn.className, onclick: btn.callback },
        btn.label,
      ),
    )
  })

  var modalContainer = createElement(
    'div',
    { class: 'modal' },
    createElement(
      'div',
      { class: 'mhead' },
      createElement('h3', {}, title),
      createElement('button', { class: 'x', onclick: closeModalWindow }, '×'),
    ),
    createElement('div', { class: 'mbody' }, bodyNode),
    footer,
  )

  var backdrop = createElement(
    'div',
    {
      class: 'scrim',
      onclick: function (e) {
        if (e.target === backdrop) closeModalWindow()
      },
    },
    modalContainer,
  )
  $$('#modalRoot').appendChild(backdrop)
}

function closeModalWindow() {
  $$('#modalRoot').innerHTML = ''
}

function showToast(message, kind) {
  var icon = kind === 'ok' ? '✓ ' : kind === 'err' ? '⚠ ' : ''
  var toastElement = createElement('div', {
    class: 'toast ' + (kind || ''),
    html: icon + escapeHtml(message),
  })
  document.body.appendChild(toastElement)
  setTimeout(function () {
    if (toastElement.parentNode)
      toastElement.parentNode.removeChild(toastElement)
  }, 3200)
}

/* ---------- Конструкторы элементов ввода ---------- */
function createFormField(label, inputNode, isRequired) {
  var mark = isRequired ? ' <span class="req">*</span>' : ''
  return createElement(
    'div',
    { class: 'frow' },
    createElement('label', { html: escapeHtml(label) + mark }),
    inputNode,
  )
}

function createSelectInput(optionsList, selectedValue, onChangeCallback) {
  var select = createElement('select', {
    class: 'inp',
    onchange: function (e) {
      onChangeCallback(e.target.value)
    },
  })
  optionsList.forEach(function (optValue) {
    var option = createElement(
      'option',
      { value: optValue },
      optValue || '— выберите —',
    )
    if (optValue === selectedValue) option.selected = true
    select.appendChild(option)
  })
  return select
}

function createDateTimeInput(currentValue, onChangeCallback) {
  return createElement('input', {
    class: 'inp',
    type: 'datetime-local',
    value: currentValue || '',
    onchange: function (e) {
      onChangeCallback(e.target.value)
    },
  })
}

function createTextArea(currentValue, onChangeCallback) {
  return createElement(
    'textarea',
    {
      class: 'inp',
      onchange: function (e) {
        onChangeCallback(e.target.value)
      },
    },
    currentValue || '',
  )
}
