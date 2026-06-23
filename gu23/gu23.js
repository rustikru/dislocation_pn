// ГУ-23, акты общей формы — клиентская часть (jQuery + ajax на /data.php)

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

// запрос к серверу
function api(action, data) {
  return $.ajax({
    url: '/data.php',
    type: 'POST',
    dataType: 'json',
    data: $.extend({ ajax_action: action }, data || {}),
  })
}

// даты
function parseDateTime(str) {
  if (!str) return null
  var date = new Date(String(str).replace(' ', 'T'))
  return isNaN(date.getTime()) ? null : date
}

// из формата БД (YYYY-MM-DD HH:MM:SS) в формат поля (dd.mm.yyyy HH:MM)
function toInputDate(str) {
  if (!str) return ''
  var m = String(str).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  return m ? m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5] : ''
}

// из формата поля (dd.mm.yyyy HH:MM) в формат БД (YYYY-MM-DD HH:MM) — без TZ
function toDbDate(str) {
  if (!str) return ''
  var m = String(str).match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/)
  return m ? m[3] + '-' + m[2] + '-' + m[1] + ' ' + m[4] + ':' + m[5] : ''
}

// отображение даты-времени: чисто строкой, без new Date() (никакого сдвига TZ)
function formatDateTime(str) {
  if (!str) return '—'
  var m = String(str).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  return m ? m[3] + '.' + m[2] + '.' + m[1] + ' ' + m[4] + ':' + m[5] : '—'
}

function formatDate(str) {
  if (!str) return '—'
  var m = String(str).match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[3] + '.' + m[2] + '.' + m[1] : '—'
}

function calcDuration(startMs, endMs) {
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

function durText(duration) {
  return duration.ms < 0
    ? '—'
    : duration.days + ' дн. ' + duration.hours + ' ч.'
}

function hoursText(duration) {
  return duration.ms < 0
    ? '—'
    : (Math.round(duration.totalHours * 10) / 10).toLocaleString('ru') + ' ч.'
}

// справочники
var actTypes = {
  start: { label: 'Начало простоя', className: 'typ-start' },
  end: { label: 'Окончание простоя', className: 'typ-end' },
  other: { label: 'Прочий акт', className: 'typ-other' },
}

var actStatuses = {
  draft: { label: 'Черновик', className: 'st-draft' },
  active: { label: 'Действующий', className: 'st-signed' },
  closed: { label: 'Закрыт', className: 'st-closed' },
  annulled: { label: 'Аннулирован', className: 'st-annulled' },
}

function statusChip(status) {
  var config = actStatuses[status] || { label: status, className: 'st-draft' }
  return (
    '<span class="chip ' + config.className + '">' + config.label + '</span>'
  )
}

function typeChip(type) {
  var config = actTypes[type] || { label: type, className: 'typ-other' }
  return (
    '<span class="typchip ' + config.className + '">' + config.label + '</span>'
  )
}

// что сейчас на экране
var refs = {
  cexes: [],
  reasons: [],
  stations: [],
  stations_from: [],
  owners: [],
  kinds: [],
  cargos: [],
  signersOwn: [],
  signersRzd: [],
}

var state = { page: 'archive', selectedId: null }
var draft = null

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

// старт
$(document).ready(function () {
  $(document).ajaxStart(function () {
    $('.loadImg').show()
  })
  $(document).ajaxStop(function () {
    $('.loadImg').hide()
  })
  $(document).ajaxError(function (event, jqXHR, settings, thrownError) {
    var detail = thrownError || jqXHR.statusText || ''
    var body = jqXHR.responseText || ''
    var msg = ''
    try {
      msg = JSON.parse(body).msg || ''
    } catch (ignore) {}
    var action = ''
    try {
      action = new URLSearchParams(settings.data).get('ajax_action') || ''
    } catch (ignore) {}
    console.error(
      'AJAX error [' + action + ']',
      jqXHR.status,
      detail,
      body.substring(0, 500),
    )
    showToast(
      'Ошибка сервера [' +
        (action || jqXHR.status) +
        ']' +
        (msg ? ': ' + msg : detail ? ': ' + detail : ''),
      'err',
    )
  })

  api('gu23_get_refs').done(function (response) {
    refs = response || refs
    draw()
  })
})

// меню слева
function drawNav() {
  var items = [
    { page: 'new', icon: '＋', label: 'Создать акт' },
    { page: 'archive', icon: '', label: 'Архив актов' },
  ]
  var nav = $$('#nav')
  nav.innerHTML = ''

  items.forEach(function (item) {
    var active =
      state.page === item.page ||
      (item.page === 'archive' && state.page === 'card')
    var button = createElement(
      'button',
      {
        class: 'navbtn' + (active ? ' active' : ''),
        onclick: function () {
          goTo(item.page)
        },
      },
      createElement('span', { class: 'ic' }, item.icon),
      createElement('span', {}, item.label),
    )
    nav.appendChild(button)
  })

  nav.appendChild(
    createElement('div', {
      class: 'foot',
      html: '',
    }),
  )
}

function goTo(page) {
  state.page = page
  state.selectedId = null
  if (page === 'new') draft = null
  draw()
}

function openAct(id) {
  state.selectedId = id
  state.page = 'card'
  draw()
}

// показать нужную страницу
function draw() {
  drawNav()
  var view = $$('#view')
  view.innerHTML = ''

  var views = {
    archive: showArchive,
    new: showForm,
    card: showCard,
    wsearch: showWagonSearch,
  }

  var showFunc = views[state.page] || showArchive
  showFunc(view)
}

function namesOf(arr) {
  return (arr || []).map(function (item) {
    return item.NAME != null ? item.NAME : item.CODE
  })
}

function cexCodes() {
  return (refs.cexes || []).map(function (item) {
    return item.CODE
  })
}

// архив
function showArchive(container) {
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
  var box = createElement('div', { class: 'card' })

  function loadData() {
    api('gu23_get_acts', filterState).done(function (list) {
      box.innerHTML = ''
      box.appendChild(makeActsTable(list || []))
      box.appendChild(
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
    makeFilter(
      ['', 'start', 'end', 'other'],
      ['Все типы', 'Начало простоя', 'Окончание', 'Прочий'],
      function (val) {
        filterState.type = val
        loadData()
      },
    ),
  )
  filtersRow.appendChild(
    makeFilter(
      ['', 'draft', 'active', 'closed', 'annulled'],
      ['Все статусы', 'Черновик', 'Действующий', 'Закрыт', 'Аннулирован'],
      function (val) {
        filterState.status = val
        loadData()
      },
    ),
  )
  filtersRow.appendChild(
    makeFilter(
      [''].concat(
        (refs.cexes || []).map(function (c) {
          return String(c.ID)
        }),
      ),
      ['Все цеха'].concat(cexCodes()),
      function (val) {
        filterState.cex = val
        loadData()
      },
    ),
  )

  container.appendChild(filtersRow)
  container.appendChild(box)
  loadData()
}

function makeFilter(values, labels, onChange) {
  var select = createElement('select', {
    class: 'inp',
    onchange: function (e) {
      onChange(e.target.value)
    },
  })
  values.forEach(function (val, idx) {
    select.appendChild(createElement('option', { value: val }, labels[idx]))
  })
  return select
}

function makeActsTable(list) {
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
        openAct(act.ID)
      },
    })
    tr.innerHTML =
      '<td class="num">' +
      escapeHtml(act.ACT_NUMBER) +
      '</td>' +
      '<td>' +
      typeChip(act.ACT_TYPE) +
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
      statusChip(act.STATUS) +
      '</td>'
    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  return createElement('div', { style: 'overflow:auto' }, table)
}

// создание и правка акта
function newDraft(type) {
  return {
    id: 0,
    type: type,
    status: 'draft',
    cex: (refs.cexes[0] || {}).CODE || '',
    stationId: String((refs.stations[0] || {}).CODE || ''),
    stFromId: String((refs.stations_from[0] || {}).CODE || ''),
    stFromName: '',
    stToId: '',
    stToName: '',
    waybillNo: '',
    cargoRef: '',
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

function showForm(container) {
  if (!draft) draft = newDraft('start')

  container.appendChild(
    createElement(
      'div',
      { class: 'phead' },
      createElement(
        'h1',
        {},
        draft.id ? 'Редактирование акта ГУ-23' : 'Создание акта ГУ-23',
      ),
      createElement('p', {}, ''),
      createElement('div', { class: 'spacer' }),
    ),
  )

  var seg = createElement('div', {
    class: 'seg',
    style: 'margin-bottom:18px',
  })
  ;[
    ['start', 'Начало простоя'],
    ['end', 'Окончание простоя'],
    ['other', 'Прочий акт'],
  ].forEach(function (item) {
    seg.appendChild(
      createElement(
        'button',
        {
          class: draft.type === item[0] ? 'on' : '',
          onclick: function () {
            draft = newDraft(item[0])
            draw()
          },
        },
        item[1],
      ),
    )
  })
  if (!draft.id) container.appendChild(seg)

  var cardElement = createElement('div', { class: 'card' })
  var cardBody = createElement('div', { class: 'cardpad' })
  cardElement.appendChild(cardBody)

  if (draft.type === 'end') addEndPicker(cardBody)

  // строка 1: дата начала/окончания (самое первое поле)
  if (draft.type === 'start' || draft.type === 'end') {
    var colRow0 = createElement('div', { class: 'cols' })
    if (draft.type === 'start') {
      colRow0.appendChild(
        formField(
          'Дата и время начала простоя',
          dateInput(draft.startAt, function (val) {
            draft.startAt = val
          }),
          true,
        ),
      )
    }
    if (draft.type === 'end') {
      colRow0.appendChild(
        formField(
          'Дата и время окончания простоя',
          dateInput(draft.endAt, function (val) {
            draft.endAt = val
            if (val) draw()
          }),
          true,
        ),
      )
    }
    colRow0.appendChild(createElement('div', {}))
    cardBody.appendChild(colRow0)
  }

  if (draft.type === 'end' && draft.startAt) {
    var badDate = draft.endAt && toMs(draft.endAt) < toMs(draft.startAt)
    cardBody.appendChild(
      createElement('div', {
        class: 'banner ' + (badDate ? 'err' : 'info'),
        html: durPreview(),
      }),
    )
  }

  // строка 2: цех + ст. составления
  var colRow1 = createElement('div', { class: 'cols' })
  colRow1.appendChild(
    formField(
      'Цех составления',
      selectInput(cexCodes(), draft.cex, function (val) {
        draft.cex = val
      }),
      true,
    ),
  )
  colRow1.appendChild(
    formField(
      'Ст. составления',
      stationSelect(refs.stations, draft.stationId, function (val) {
        draft.stationId = val
      }),
      true,
    ),
  )
  colRow1.appendChild(
    formField(
      'Ст. отправления',
      stationSelect(refs.stations_from, draft.stFromId, function (val) {
        draft.stFromId = val
      }),
      true,
    ),
  )
  cardBody.appendChild(colRow1)

  // строка 3: ст. отправления + ст. назначения (autocomplete)
  var colRow2 = createElement('div', { class: 'cols' })
  /* colRow2.appendChild(
    formField(
      'Ст. отправления',
      stationAutocomplete(
        draft.stFromId,
        draft.stFromName,
        function (id, name) {
          draft.stFromId = id
          draft.stFromName = name
        },
      ),
      false,
    ),
  ) */
  colRow2.appendChild(
    formField(
      'Ст. назначения',
      stationAutocomplete(draft.stToId, draft.stToName, function (id, name) {
        draft.stToId = id
        draft.stToName = name
      }),
      false,
    ),
  )
  cardBody.appendChild(colRow2)

  // строка 4: № накладной + груз
  var colRow3 = createElement('div', { class: 'cols' })
  colRow3.appendChild(
    formField(
      '№ накладной',
      createElement('input', {
        class: 'inp',
        value: draft.waybillNo || '',
        onchange: function (e) {
          draft.waybillNo = e.target.value
        },
      }),
      false,
    ),
  )
  colRow3.appendChild(
    formField(
      'Груз',
      selectInput(
        [''].concat(namesOf(refs.cargos)),
        draft.cargoRef,
        function (val) {
          draft.cargoRef = val
        },
      ),
      false,
    ),
  )
  cardBody.appendChild(colRow3)

  // строка 5: причина (полная ширина)
  cardBody.appendChild(
    formField(
      'Причина составления',
      selectInput(
        [''].concat(namesOf(refs.reasons)),
        draft.reason,
        function (val) {
          draft.reason = val
        },
      ),
      true,
    ),
  )

  cardBody.appendChild(
    formField(
      'Обстоятельства, вызвавшие составление акта',
      textArea(draft.circumstances, function (val) {
        draft.circumstances = val
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

  var wagonsInput = createElement('textarea', {
    class: 'inp',
    style: 'min-height:56px',
    placeholder:
      'Введите номера вагонов: через запятую, пробел, построчно или вставьте из Excel…',
  })
  cardBody.appendChild(wagonsInput)

  var actions = createElement('div', {
    style: 'display:flex;gap:9px;flex-wrap:wrap;margin:10px 0',
  })

  if (draft.type === 'start' || draft.type === 'other') {
    actions.appendChild(
      createElement(
        'button',
        {
          class: 'btn sm primary',
          onclick: function () {
            loadWagonInfo(wagonsInput.value)
          },
        },
        'Заполнить данные из Дислокации',
      ),
    )
  }
  if (draft.type === 'end') {
    actions.appendChild(
      createElement(
        'button',
        {
          class: 'btn sm',
          onclick: function () {
            findOpenByWagons(wagonsInput.value)
            wagonsInput.value = ''
          },
        },
        'Найти открытый простой',
      ),
    )
  }
  cardBody.appendChild(actions)

  if (draft._summary) {
    var summaryClass = draft._summary.found < draft._summary.req ? 'warn' : 'ok'
    cardBody.appendChild(
      createElement('div', {
        class: 'banner ' + summaryClass,
        html: draft._summary.text,
      }),
    )
  }

  cardBody.appendChild(makeWagonsTable())

  cardBody.appendChild(createElement('div', { style: 'height:14px' }))
  cardBody.appendChild(makeSigners())

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
          draft = null
          goTo('archive')
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
          saveAct('draft')
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
          saveAct('active')
        },
      },
      'Сохранить и отправить на подписание',
    ),
  )

  cardElement.appendChild(cardFooter)
  container.appendChild(cardElement)
}

// мс из dd.mm.yyyy HH:MM (локально, только для расчёта длительности)
function toMs(localStr) {
  var m = String(localStr).match(/(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/)
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : NaN
}

function addEndPicker(box) {
  box.appendChild(
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
      pickStart(e.target.value)
      draw()
    },
  })
  select.appendChild(
    createElement('option', { value: '' }, '— выберите открытый акт начала —'),
  )
  row.appendChild(select)
  row.appendChild(createElement('div', { class: 'hint' }))
  box.appendChild(row)

  if (draft._openStarts == null) {
    api('gu23_get_open_starts').done(function (list) {
      draft._openStarts = list || []
      fillEndList(select)
    })
  } else {
    fillEndList(select)
  }
}

function fillEndList(sel) {
  ;(draft._openStarts || []).forEach(function (act) {
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
    if (String(draft.linkedStartId) === String(act.ID)) option.selected = true
    sel.appendChild(option)
  })
}

function pickStart(id) {
  var selectedAct = (draft._openStarts || []).filter(function (item) {
    return String(item.ID) === String(id)
  })[0]

  if (!selectedAct) {
    draft.linkedStartId = ''
    return
  }

  draft.linkedStartId = selectedAct.ID
  draft.linkedStartNumber = selectedAct.ACT_NUMBER
  draft.startAt = toInputDate(selectedAct.START_AT)
  draft.cex = selectedAct.CEX
  draft.stationId = String(selectedAct.STATION_ID || '')
  draft.stFromId = String(selectedAct.ST_FROM_ID || '')
  draft.stFromName = selectedAct.ST_FROM || ''
  draft.stToId = String(selectedAct.ST_TO_ID || '')
  draft.stToName = selectedAct.ST_TO || ''
  draft.reason = selectedAct.REASON
  draft.wagons = (selectedAct.WAGONS || []).map(function (w) {
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

  draft._summary = {
    req: draft.wagons.length,
    found: draft.wagons.length,
    text:
      'Подтянуты данные из акта начала ' +
      selectedAct.ACT_NUMBER +
      ': вагоны, причина, цех, станция, дата начала ' +
      formatDateTime(selectedAct.START_AT) +
      '.',
  }
}

function findOpenByWagons(rawText) {
  var nums = parseWagons(rawText)
  if (!nums.length) {
    showToast('Введите номер вагона', 'err')
    return
  }

  function executeSearch() {
    // для каждого введённого вагона ищем открытый акт начала, которому он принадлежит
    var foundActs = {} // id акта -> объект акта (уникальные)
    nums.forEach(function (num) {
      ;(draft._openStarts || []).forEach(function (act) {
        ;(act.WAGONS || []).forEach(function (w) {
          if (w.WAGON_NO === num) foundActs[act.ID] = act
        })
      })
    })

    var ids = Object.keys(foundActs)
    if (ids.length === 0) {
      showToast('Открытый простой по этим вагонам не найден', 'err')
    } else if (ids.length > 1) {
      // вагоны принадлежат разным открытым актам — закрыть их одним актом нельзя
      var numbers = ids
        .map(function (id) {
          return foundActs[id].ACT_NUMBER
        })
        .join(', ')
      showToast(
        'Введённые вагоны относятся к разным актам начала (' +
          numbers +
          '). Выберите вагоны одного акта.',
        'err',
      )
    } else {
      var act = foundActs[ids[0]]
      pickStart(act.ID)
      showToast('Найден открытый акт ' + act.ACT_NUMBER, 'ok')
      draw()
    }
  }

  if (draft._openStarts == null) {
    api('gu23_get_open_starts').done(function (list) {
      draft._openStarts = list || []
      executeSearch()
    })
  } else {
    executeSearch()
  }
}

function durPreview() {
  if (!draft.startAt || !draft.endAt) {
    return 'Длительность простоя будет рассчитана автоматически по дате начала и окончания.'
  }
  var startMs = toMs(draft.startAt)
  var endMs = toMs(draft.endAt)

  if (endMs < startMs)
    return 'Дата окончания меньше даты начала — сохранение будет заблокировано.'
  if (endMs === startMs)
    return 'Длительность простоя составляет 0 часов (даты совпадают).'

  var duration = calcDuration(startMs, endMs)
  return (
    'Расчёт простоя: <b>' +
    durText(duration) +
    '</b>, всего ' +
    hoursText(duration) +
    ' · для претензий: ' +
    duration.calendarDays +
    ' кал. дн. Значение рассчитано автоматически.'
  )
}

function addWagons(rawText) {
  var nums = parseWagons(rawText)
  var added = 0

  nums.forEach(function (num) {
    var isDuplicate = draft.wagons.some(function (w) {
      return w.n === num
    })
    if (!isDuplicate) {
      draft.wagons.push({
        n: num,
        owner: '',
        kind: '',
        from: '',
        to: '',
        cargo: '',
        weight: '',
      })
      added++
    }
  })

  draft._summary = {
    req: nums.length,
    found: added,
    text:
      'Распознано ' +
      nums.length +
      ' вагон(ов), добавлено новых: ' +
      added +
      '. Дубли и пустые строки исключены.',
  }
}

function loadWagonInfo(rawText) {
  var inputNums = parseWagons(rawText)
  var nums = inputNums.length
    ? inputNums
    : draft.wagons.map(function (w) {
        return w.n
      })

  if (!nums.length) {
    showToast('Введите номера вагонов', 'err')
    return
  }

  api('gu23_get_wagon_info', {
    wagons: JSON.stringify(nums),
    waybill_no: draft.waybillNo || '',
  }).done(function (rows) {
    rows = rows || []
    var found = 0

    rows.forEach(function (row) {
      var wagon = draft.wagons.filter(function (x) {
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
        draft.wagons.push(wagon)
      }
      if (String(row.FOUND) === '1') {
        wagon.owner = row.OWNER
        wagon.kind = row.KIND
        wagon.from = row.ST_FROM
        wagon.to = row.ST_TO
        wagon.cargo = row.CARGO
        wagon.weight = row.WEIGHT
        found++
      }
    })

    draft._summary = {
      req: nums.length,
      found: found,
      text:
        'Запрошено ' + nums.length + ' вагонов, найдено ' + found + ' вагонов.',
    }

    showToast('Получено ' + found + ' из ' + nums.length, found ? 'ok' : 'err')
    draw()
  })
}

function makeWagonsTable() {
  if (!draft.wagons.length) {
    return createElement(
      'div',
      { class: 'banner info' },
      'Вагоны не добавлены. Введите номера выше и нажмите «Заполнить данные из Дислокации».',
    )
  }

  var wrap = createElement('div', {
    style: 'overflow:auto;border:1px solid var(--line);border-radius:7px',
  })
  var table = createElement('table', { class: 'wtbl' })
  var isEndType = draft.type === 'end'

  table.innerHTML =
    '<thead><tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th>' +
    (isEndType ? '<th>Простой</th>' : '') +
    '<th></th></tr></thead>'

  var tbody = createElement('tbody')
  draft.wagons.forEach(function (wagon, idx) {
    var tr = createElement('tr')
    tr.appendChild(createElement('td', { class: 'wn' }, wagon.n))
    ;['owner', 'kind', 'from', 'to', 'cargo'].forEach(function (fieldKey) {
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
    })

    if (isEndType) {
      var dur = '—'
      if (draft.startAt && draft.endAt) {
        var startMs = toMs(draft.startAt)
        var endMs = toMs(draft.endAt)
        if (endMs >= startMs) dur = durText(calcDuration(startMs, endMs))
      }
      tr.appendChild(createElement('td', { class: 'dur' }, dur))
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
              draft.wagons.splice(idx, 1)
              draw()
            },
          },
          '×',
        ),
      ),
    )
    tbody.appendChild(tr)
  })

  table.appendChild(tbody)
  wrap.appendChild(table)

  return createElement(
    'div',
    {},
    wrap,
    createElement(
      'div',
      { class: 'hint', style: 'margin-top:6px' },
      'Вагонов в акте: ' + draft.wagons.length + '.',
    ),
  )
}

function makeSigners() {
  var need = draft.type === 'other' ? 2 : 3
  var container = createElement('div', {})

  container.appendChild(
    createElement(
      'label',
      {
        style: 'font-size:13px;font-weight:600;display:block;margin-bottom:8px',
      },
      'Подписанты',
    ),
  )

  for (var i = 0; i < need; i++) {
    ;(function (idx) {
      var isOtherType = draft.type === 'other'
      var signers, helpText

      if (isOtherType) {
        signers = refs.signersOwn || []
        helpText = idx === 0 ? 'Представитель предприятия' : 'Второй подписант'
      } else {
        if (idx < 2) {
          signers = refs.signersOwn || []
          helpText = 'Работник предприятия'
        } else {
          signers = refs.signersRzd || []
          helpText = 'Работник станции ОАО «РЖД»'
        }
      }

      var activeSigner = draft.signers[idx]

      var row = createElement('div', { class: 'frow' })
      row.appendChild(
        createElement('label', {
          html:
            'Подписант ' +
            (idx + 1) +
            ' <span class="muted" style="font-weight:400">· ' +
            helpText +
            '</span>',
        }),
      )

      var select = createElement('select', {
        class: 'inp',
        onchange: function (e) {
          var match = signers.filter(function (x) {
            return String(x.ID) === e.target.value
          })[0]
          draft.signers[idx] = match
            ? { id: match.ID, fio: match.FIO, post: match.POST, org: match.ORG }
            : null
        },
      })

      select.appendChild(createElement('option', { value: '' }, '— выберите —'))
      signers.forEach(function (signer) {
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

function checkForm(checkSigners) {
  var errors = []
  if (!draft.cex) errors.push('Не указан цех')
  if (!draft.reason) errors.push('Не указана причина составления')
  if (!String(draft.circumstances).trim())
    errors.push('Не заполнены обстоятельства')

  // хотя бы одно из: вагоны, груз, накладная
  if (!draft.wagons.length && !draft.cargoRef && !draft.waybillNo)
    errors.push('Добавьте вагоны или укажите груз / номер накладной')

  // все станции обязательны при отправке
  if (!draft.stationId) errors.push('Не указана ст. составления')
  if (!draft.stFromId) errors.push('Не указана ст. отправления')
  if (!draft.stToId) errors.push('Не указана ст. назначения')

  if (draft.type === 'start' && !draft.startAt)
    errors.push('Не указана дата начала простоя')

  if (draft.type === 'end') {
    if (!draft.linkedStartId)
      errors.push('Не выбран открытый акт начала простоя')
    if (!draft.endAt) errors.push('Не указана дата окончания простоя')
    if (
      draft.startAt &&
      draft.endAt &&
      toMs(draft.endAt) < toMs(draft.startAt)
    ) {
      errors.push('Дата окончания меньше даты начала')
    }
  }

  if (checkSigners) {
    var need = draft.type === 'other' ? 2 : 3
    var filled = draft.signers.filter(Boolean).length
    if (filled < need)
      errors.push('Указано подписантов ' + filled + ' из ' + need)
  }
  return errors
}

function saveAct(status, skipWarning) {
  var errors =
    status === 'active' ? checkForm(true) : draft.cex ? [] : ['Не указан цех']
  if (errors.length) {
    showToast(errors[0], 'err')
    return
  }

  var payload = {
    id: draft.id || 0,
    type: draft.type,
    status: status,
    cex: draft.cex, // CODE цеха
    station: draft.stationId || '', // station_id as string
    st_from: draft.stFromId || '', // st_from_id as string
    st_to: draft.stToId || '', // st_to_id as string
    waybill_no: draft.waybillNo || '',
    cargo_ref: draft.cargoRef || '',
    reason: draft.reason,
    circumstances: draft.circumstances,
    start_at: toDbDate(draft.startAt),
    end_at: toDbDate(draft.endAt),
    linked_start_id: draft.linkedStartId || '',
    wagons: JSON.stringify(draft.wagons),
    signers: JSON.stringify(draft.signers.filter(Boolean)),
    force: skipWarning ? 'Y' : 'N',
  }

  api('gu23_save_act', payload).done(function (response) {
    if (response && response.ok) {
      showToast(
        (status === 'draft' ? 'Черновик сохранён' : 'Акт зарегистрирован') +
          (response.number ? ', № ' + response.number : ''),
        'ok',
      )
      draft = null
      openAct(response.id)
    } else {
      var serverMsg = (response && response.msg) || 'Ошибка сохранения'
      if (/уже есть открытый акт начала/.test(serverMsg)) {
        confirmBox(
          'Дубль открытого простоя',
          serverMsg + '. Зарегстировать акт ?',
          function () {
            saveAct(status, true)
          },
        )
      } else {
        showToast(serverMsg, 'err')
      }
    }
  })
}

// карточка акта
function showCard(container) {
  api('gu23_get_act', { id: state.selectedId }).done(function (data) {
    container.innerHTML = ''
    if (!data || !data.ok) {
      container.appendChild(
        createElement('div', { class: 'empty-state' }, 'Акт не найден'),
      )
      return
    }
    buildCard(container, data)
  })
}

function buildCard(container, data) {
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
            goTo('archive')
          },
        },
        '← Архив',
      ),
      createElement(
        'h1',
        { style: 'font-family:var(--mono);font-size:18px' },
        act.ACT_NUMBER,
      ),
      createElement('span', { html: typeChip(act.ACT_TYPE) }),
      createElement('span', { html: statusChip(act.STATUS) }),
      createElement('div', { class: 'spacer' }),
    ),
  )

  var toolbar = createElement('div', {
    style: 'display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px',
  })
  toolbar.appendChild(
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
    toolbar.appendChild(
      createElement(
        'button',
        {
          class: 'btn primary',
          onclick: function () {
            editAct(data)
          },
        },
        '✎ Редактировать',
      ),
    )
    toolbar.appendChild(
      createElement(
        'button',
        {
          class: 'btn danger',
          onclick: function () {
            delDraft(act)
          },
        },
        '🗑 Удалить черновик',
      ),
    )
  }
  if (act.STATUS === 'active' || act.STATUS === 'closed') {
    toolbar.appendChild(
      createElement(
        'button',
        {
          class: 'btn danger',
          onclick: function () {
            annulAct(act)
          },
        },
        '⊘ Аннулировать',
      ),
    )
  }
  container.appendChild(toolbar)

  if (act.STATUS === 'annulled' && act.ANNUL_REASON) {
    container.appendChild(
      createElement('div', {
        class: 'banner err',
        html: '<b>Аннулирован.</b> Причина: ' + escapeHtml(act.ANNUL_REASON),
      }),
    )
  }

  var grid = createElement('div', {
    style:
      'display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start',
  })

  var left = createElement('div', {})
  var detailsCard = createElement('div', { class: 'card' })
  detailsCard.appendChild(
    createElement(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      createElement('b', {}, 'Реквизиты акта'),
    ),
  )

  var dl = createElement('dl', {
    class: 'kv',
    style: 'padding:16px 18px',
  })
  function appendRow(label, htmlContent) {
    dl.appendChild(createElement('dt', {}, label))
    dl.appendChild(createElement('dd', { html: htmlContent }))
  }

  appendRow('Тип акта', actTypes[act.ACT_TYPE].label)
  appendRow('Цех составления', escapeHtml(act.CEX))
  appendRow('Ст. составления', escapeHtml(act.STATION))
  if (act.ST_FROM) appendRow('Ст. отправления', escapeHtml(act.ST_FROM))
  if (act.ST_TO) appendRow('Ст. назначения', escapeHtml(act.ST_TO))
  if (act.CARGO_REF) appendRow('Груз', escapeHtml(act.CARGO_REF))
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
        '<a href="#" onclick="openAct(' +
          act.LINKED_START_ID +
          ');return false">' +
          escapeHtml(act.LINKED_START_NUMBER || '—') +
          '</a>',
      )
    }
  }
  appendRow('Обстоятельства', escapeHtml(act.CIRCUMSTANCES))
  appendRow('Создал', escapeHtml(act.CREATED_BY))

  detailsCard.appendChild(dl)
  left.appendChild(detailsCard)

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
      // escapeHtml(w.WEIGHT || '—') +
      '</td>'
    wagonsTbody.appendChild(tr)
  })
  wagonsTable.appendChild(wagonsTbody)
  wagonsCard.appendChild(
    createElement('div', { style: 'overflow:auto' }, wagonsTable),
  )
  left.appendChild(wagonsCard)
  grid.appendChild(left)

  var right = createElement('div', {})
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
  right.appendChild(signersCard)

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
    var fileBtn = createElement('label', { class: 'btn sm' }, '＋ Файл')
    var fileInput = createElement('input', {
      type: 'file',
      multiple: true,
      style: 'display:none',
      accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    })
    fileInput.addEventListener('change', function () {
      uploadFiles(act.ID, fileInput.files)
    })
    fileBtn.appendChild(fileInput)
    filesHead.appendChild(fileBtn)
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
              delFile(file.ID, act.ID)
            },
          },
          '×',
        ),
      )
    }
    filesBox.appendChild(fileRow)
  })
  filesCard.appendChild(filesBox)
  right.appendChild(filesCard)

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

  var histWrap = createElement('div', { class: 'hist-container' })
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

  histWrap.appendChild(historyUl)
  historyCard.appendChild(histWrap)
  right.appendChild(historyCard)

  grid.appendChild(right)
  container.appendChild(grid)
}

function editAct(data) {
  var act = data.act
  draft = {
    id: act.ID,
    type: act.ACT_TYPE,
    status: 'draft',
    cex: act.CEX, // CODE цеха
    stationId: String(act.STATION_ID || ''),
    stFromId: String(act.ST_FROM_ID || ''),
    stFromName: act.ST_FROM || '',
    stToId: String(act.ST_TO_ID || ''),
    stToName: act.ST_TO || '',
    waybillNo: '', // не хранится, очищаем
    cargoRef: act.CARGO_REF || '',
    reason: act.REASON,
    circumstances: act.CIRCUMSTANCES || '',
    startAt: toInputDate(act.START_AT),
    endAt: toInputDate(act.END_AT),
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
        // weight: w.WEIGHT
      }
    }),
    signers: data.signers.map(function (s) {
      return {
        id: s.SIGNER_REF_ID || null,
        fio: s.FIO,
        post: s.POST,
        org: s.ORG,
      }
    }),
    _summary: null,
    _openStarts: null,
  }
  state.page = 'new'
  state.selectedId = null
  draw()
}

function delDraft(act) {
  confirmBox(
    'Удаление черновика',
    'Удалить черновик ' + act.ACT_NUMBER + '? Действие необратимо.',
    function () {
      api('gu23_del_act', { id: act.ID }).done(function (response) {
        if (response && response.ok) {
          showToast('Черновик удалён', 'ok')
          goTo('archive')
        } else {
          showToast((response && response.msg) || 'Ошибка удаления', 'err')
        }
      })
    },
  )
}

function annulAct(act) {
  promptBox(
    'Аннулирование акта',
    'Подписанный/действующий акт нельзя удалить. Укажите причину аннулирования:',
    function (reason) {
      if (!reason) return
      api('gu23_annul_act', { id: act.ID, reason: reason }).done(
        function (response) {
          if (response && response.ok) {
            showToast('Акт аннулирован', 'ok')
            openAct(act.ID)
          } else {
            showToast((response && response.msg) || 'Ошибка', 'err')
          }
        },
      )
    },
  )
}

function uploadFiles(actId, files) {
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
    openAct(actId)
  })
}

function delFile(fileId, actId) {
  confirmBox('Удаление файла', 'Удалить приложение?', function () {
    api('gu23_del_file', { file_id: fileId }).done(function (response) {
      if (response && response.ok) {
        showToast('Файл удалён', 'ok')
        openAct(actId)
      } else {
        showToast((response && response.msg) || 'Ошибка', 'err')
      }
    })
  })
}

// поиск по вагону
function showWagonSearch(container) {
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
    api('gu23_get_by_wagon', { wagon: wagonNum }).done(function (list) {
      resultsBox.innerHTML = ''
      var cardElement = createElement('div', { class: 'card' })
      cardElement.appendChild(makeActsTable(list || []))
      resultsBox.appendChild(cardElement)
    })
  }
}

// окошки и уведомления
function confirmBox(title, message, onConfirm) {
  var bodyNode = createElement('div', {}, createElement('p', {}, message))
  openModal(title, bodyNode, [
    { label: 'Отмена', className: 'btn ghost', callback: closeModal },
    {
      label: 'Подтвердить',
      className: 'btn primary',
      callback: function () {
        closeModal()
        onConfirm()
      },
    },
  ])
}

function promptBox(title, message, onConfirm) {
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

  openModal(title, bodyNode, [
    { label: 'Отмена', className: 'btn ghost', callback: closeModal },
    {
      label: 'OK',
      className: 'btn primary',
      callback: function () {
        var value = textarea.value.trim()
        closeModal()
        onConfirm(value)
      },
    },
  ])
}

function openModal(title, bodyNode, buttons) {
  var footer = createElement('div', { class: 'mfoot' })
  buttons.forEach(function (btn) {
    footer.appendChild(
      createElement(
        'button',
        { class: btn.className, onclick: btn.callback },
        btn.label,
      ),
    )
  })

  var modalBox = createElement(
    'div',
    { class: 'modal' },
    createElement(
      'div',
      { class: 'mhead' },
      createElement('h3', {}, title),
      createElement('button', { class: 'x', onclick: closeModal }, '×'),
    ),
    createElement('div', { class: 'mbody' }, bodyNode),
    footer,
  )

  var backdrop = createElement(
    'div',
    {
      class: 'scrim',
      onclick: function (e) {
        if (e.target === backdrop) closeModal()
      },
    },
    modalBox,
  )
  $$('#modalRoot').appendChild(backdrop)
}

function closeModal() {
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

// поля формы
function formField(label, inputNode, isRequired) {
  var mark = isRequired ? ' <span class="req">*</span>' : ''
  return createElement(
    'div',
    { class: 'frow' },
    createElement('label', { html: escapeHtml(label) + mark }),
    inputNode,
  )
}

function selectInput(optionsList, selectedValue, onChange) {
  var select = createElement('select', {
    class: 'inp',
    onchange: function (e) {
      onChange(e.target.value)
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

// select из справочника {ID, NAME} — значение = ID
function stationSelect(options, selectedId, onChange) {
  var select = createElement('select', {
    class: 'inp',
    onchange: function (e) {
      onChange(e.target.value)
    },
  })
  select.appendChild(createElement('option', { value: '' }, '— выберите —'))
  ;(options || []).forEach(function (opt) {
    var option = createElement('option', { value: String(opt.CODE) }, opt.NAME)
    if (String(opt.CODE) === String(selectedId)) option.selected = true
    select.appendChild(option)
  })
  return select
}

// autocomplete-поле для поиска станции по 3+ символам (debounce 300ms)
function stationAutocomplete(currentId, currentName, onChange) {
  var wrapper = createElement('div', {
    style: 'position:relative',
  })
  var inp = createElement('input', {
    class: 'inp',
    placeholder: 'Введите название станции (мин. 3 символа)…',
    value: currentName || '',
  })
  var dropdown = createElement('div', {
    style:
      'display:none;position:absolute;z-index:99;background:var(--surface);' +
      'border:1px solid var(--line);border-radius:6px;width:100%;' +
      'max-height:220px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,.12)',
  })
  wrapper.appendChild(inp)
  wrapper.appendChild(dropdown)

  var timer = null

  inp.addEventListener('input', function () {
    var q = inp.value.trim()
    clearTimeout(timer)
    if (q.length < 3) {
      dropdown.style.display = 'none'
      dropdown.innerHTML = ''
      if (!q) onChange('', '')
      return
    }
    timer = setTimeout(function () {
      api('gu23_search_station', { q: q }).done(function (rows) {
        dropdown.innerHTML = ''
        rows = rows || []
        if (!rows.length) {
          dropdown.style.display = 'none'
          return
        }
        rows.forEach(function (row) {
          var item = createElement(
            'div',
            {
              style: 'padding:8px 12px;cursor:pointer;font-size:13px',
              onclick: function () {
                inp.value = row.NAME
                onChange(String(row.CODE), row.NAME)
                dropdown.style.display = 'none'
              },
            },
            row.NAME,
          )
          item.addEventListener('mouseenter', function () {
            item.style.background = 'var(--surface2)'
          })
          item.addEventListener('mouseleave', function () {
            item.style.background = ''
          })
          dropdown.appendChild(item)
        })
        dropdown.style.display = 'block'
      })
    }, 300)
  })

  inp.addEventListener('blur', function () {
    setTimeout(function () {
      dropdown.style.display = 'none'
    }, 200)
  })

  return wrapper
}

// поле даты как в остальных модулях: короткий ввод (ддммгг ччмм) -> dd.mm.yyyy HH:MM.
// init_date_time_input красит поле и держит фокус при ошибке; в модель пишем
// значение только когда оно корректное, иначе пусто (сохранение не пройдёт).
function dateInput(currentValue, onChange) {
  var inp = createElement('input', {
    class: 'inp',
    placeholder: 'ддммгг ччмм',
    value: currentValue || '',
  })
  var $inp = $(inp)
  init_date_time_input($inp)
  $inp.on('blur', function () {
    var v = $inp.val()
    var ok =
      /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(v) &&
      !$inp.hasClass('red_bckg_color')
    onChange(ok ? v : '')
  })
  return inp
}

function textArea(currentValue, onChange) {
  return createElement(
    'textarea',
    {
      class: 'inp',
      onchange: function (e) {
        onChange(e.target.value)
      },
    },
    currentValue || '',
  )
}
