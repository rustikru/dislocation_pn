/* ============================================================================
 * ГУ-23 · Акты общей формы — клиентская логика (jQuery + AJAX к /data.php)
 *
 * Объём: создание акта (начало/окончание/прочий), архив, карточка,
 * приложения, история, поиск по вагону. Подписания нет.
 * Все данные — с сервера через пакет xx_dislocation.gu23_*.
 * ==========================================================================*/

/* ---------- мелкие хелперы (без зависимости от старых браузеров) ---------- */
var $$ = function (s, r) {
  return (r || document).querySelector(s)
}
function el(t, a) {
  var e = document.createElement(t)
  a = a || {}
  for (var k in a) {
    if (!a.hasOwnProperty(k)) continue
    if (k === 'html') e.innerHTML = a[k]
    else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), a[k])
    else if (k === 'class') e.className = a[k]
    else if (a[k] != null) e.setAttribute(k, a[k])
  }
  for (var i = 2; i < arguments.length; i++) {
    var c = arguments[i]
    if (c == null) continue
    ;[].concat(c).forEach(function (x) {
      if (x == null) return
      e.appendChild(x.nodeType ? x : document.createTextNode(String(x)))
    })
  }
  return e
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]
  })
}

/* ---------- AJAX ---------- */
function api(action, data) {
  return $.ajax({
    url: '/data.php',
    type: 'POST',
    dataType: 'json',
    data: $.extend({ ajax_action: action }, data || {}),
  })
}

/* ---------- даты / расчёт ---------- */
function parseDT(s) {
  // 'YYYY-MM-DD HH:MM:SS' -> Date|null
  if (!s) return null
  var d = new Date(String(s).replace(' ', 'T'))
  return isNaN(d.getTime()) ? null : d
}
function toInput(s) {
  // серверная дата -> значение datetime-local
  if (!s) return ''
  return String(s).replace(' ', 'T').slice(0, 16)
}
function fmtDT(s) {
  var d = parseDT(s)
  if (!d) return '—'
  return d.toLocaleString('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function fmtD(s) {
  var d = parseDT(s)
  if (!d) return '—'
  return d.toLocaleDateString('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
function calcDur(startMs, endMs) {
  var diff = endMs - startMs
  var days = Math.floor(diff / 86400000)
  var hours = Math.round((diff - days * 86400000) / 3.6e6)
  return {
    ms: diff,
    totalH: diff / 3.6e6,
    days: days,
    hours: hours,
    calDays: Math.ceil(diff / 86400000),
  }
}
function fmtDur(d) {
  return d.ms < 0 ? '—' : d.days + ' дн. ' + d.hours + ' ч.'
}
function fmtTotalH(d) {
  return d.ms < 0
    ? '—'
    : (Math.round(d.totalH * 10) / 10).toLocaleString('ru') + ' ч.'
}

/* ---------- словари статусов/типов ---------- */
var TYP = {
  start: { l: 'Начало простоя', c: 'typ-start' },
  end: { l: 'Окончание простоя', c: 'typ-end' },
  other: { l: 'Прочий акт', c: 'typ-other' },
}
var STAT = {
  draft: { l: 'Черновик', c: 'st-draft' },
  active: { l: 'Действующий', c: 'st-signed' },
  closed: { l: 'Закрыт', c: 'st-closed' },
  annulled: { l: 'Аннулирован', c: 'st-annulled' },
}
function chipStat(s) {
  var x = STAT[s] || { l: s, c: 'st-draft' }
  return '<span class="chip ' + x.c + '">' + x.l + '</span>'
}
function chipTyp(t) {
  var x = TYP[t] || { l: t, c: 'typ-other' }
  return '<span class="typchip ' + x.c + '">' + x.l + '</span>'
}

/* ---------- глобальное состояние ---------- */
var REFS = {
  cexes: [],
  reasons: [],
  stations: [],
  owners: [],
  kinds: [],
  signers: [],
}
var App = { page: 'archive', sel: null }
var draft = null

/* парсинг номеров вагонов из произвольного текста */
function parseWagons(raw) {
  var seen = {},
    out = []
  String(raw || '')
    .split(/[\s,;\n\t]+/)
    .forEach(function (x) {
      var n = x.replace(/[^\d]/g, '')
      if (n.length >= 6 && n.length <= 8 && !seen[n]) {
        seen[n] = 1
        out.push(n)
      }
    })
  return out
}

/* ============================ инициализация ============================ */
$(document).ready(function () {
  $(document).ajaxStart(function () {
    $('.loadImg').show()
  })
  $(document).ajaxStop(function () {
    $('.loadImg').hide()
  })
  $(document).ajaxError(function (e, xhr) {
    toast('Ошибка связи с сервером', 'err')
  })

  api('gu23_get_refs').done(function (r) {
    REFS = r || REFS
    render()
  })
})

/* ============================ навигация ============================ */
function renderNav() {
  var items = [
    { p: 'new', ic: '＋', l: 'Создать акт' },
    { p: 'archive', ic: '', l: 'Архив актов' },
    //{ p: 'wsearch', ic: '', l: 'Поиск по вагону' },
  ]
  var nav = $$('#nav')
  nav.innerHTML = ''
  items.forEach(function (it) {
    var b = el(
      'button',
      {
        class:
          'navbtn' +
          (App.page === it.p || (it.p === 'archive' && App.page === 'card')
            ? ' active'
            : ''),
        onclick: function () {
          go(it.p)
        },
      },
      el('span', { class: 'ic' }, it.ic),
      el('span', {}, it.l),
    )
    nav.appendChild(b)
  })
  nav.appendChild(
    el('div', {
      class: 'foot',
      html: '',
    }),
  )
}
function go(p) {
  App.page = p
  App.sel = null
  if (p === 'new') draft = null
  render()
}
function openAct(id) {
  App.sel = id
  App.page = 'card'
  render()
}

/* ============================ роутер ============================ */
function render() {
  renderNav()
  var v = $$('#view')
  v.innerHTML = ''
  ;(
    ({
      archive: viewArchive,
      new: viewNew,
      card: viewCard,
      wsearch: viewWagon,
    })[App.page] || viewArchive
  )(v)
}

/* options helper для select */
function refNames(arr) {
  return (arr || []).map(function (x) {
    return x.NAME != null ? x.NAME : x.CODE
  })
}
function cexCodes() {
  return (REFS.cexes || []).map(function (x) {
    return x.CODE
  })
}

/* ============================ Архив ============================ */
function viewArchive(v) {
  v.appendChild(
    el(
      'div',
      { class: 'phead' },
      el('h1', {}, 'Архив актов'),
      el('p', {}, ''),
      el('div', { class: 'spacer' }),
      /* el(
        'button',
        {
          class: 'btn primary',
          onclick: function () {
            go('new')
          },
        },
        '＋ Создать акт',
      ), */
    ),
  )

  var fS = { q: '', type: '', status: '', cex: '' }
  var box = el('div', { class: 'card' })

  function load() {
    api('gu23_get_acts', fS).done(function (list) {
      box.innerHTML = ''
      box.appendChild(actsTable(list || []))
      box.appendChild(
        el(
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

  var f = el('div', { class: 'filters' })
  var sb = el('div', { class: 'searchbox' })
  var si = el('input', {
    class: 'inp',
    placeholder: 'Номер акта, номер вагона, причина…',
  })
  si.addEventListener('input', function () {
    fS.q = si.value.trim()
    clearTimeout(load._t)
    load._t = setTimeout(load, 250)
  })
  sb.appendChild(si)
  f.appendChild(sb)
  f.appendChild(
    selFilter(
      ['', 'start', 'end', 'other'],
      ['Все типы', 'Начало простоя', 'Окончание', 'Прочий'],
      function (x) {
        fS.type = x
        load()
      },
    ),
  )
  f.appendChild(
    selFilter(
      ['', 'draft', 'active', 'closed', 'annulled'],
      ['Все статусы', 'Черновик', 'Действующий', 'Закрыт', 'Аннулирован'],
      function (x) {
        fS.status = x
        load()
      },
    ),
  )
  f.appendChild(
    selFilter(
      [''].concat(cexCodes()),
      ['Все цеха'].concat(cexCodes()),
      function (x) {
        fS.cex = x
        load()
      },
    ),
  )
  v.appendChild(f)
  v.appendChild(box)
  load()
}
function selFilter(vals, labels, cb) {
  var s = el('select', {
    class: 'inp',
    onchange: function (e) {
      cb(e.target.value)
    },
  })
  vals.forEach(function (vv, i) {
    s.appendChild(el('option', { value: vv }, labels[i]))
  })
  return s
}

function actsTable(list) {
  var t = el('table', { class: 'tbl' })
  t.innerHTML =
    '<thead><tr><th>Номер</th><th>Тип</th><th>Цех</th><th>Причина</th><th>Вагоны</th><th>Создан</th><th>Статус</th></tr></thead>'
  var tb = el('tbody')
  if (!list.length) {
    tb.appendChild(
      el(
        'tr',
        {},
        el(
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
  list.forEach(function (a) {
    var tr = el('tr', {
      onclick: function () {
        openAct(a.ID)
      },
    })
    tr.innerHTML =
      '<td class="num">' +
      esc(a.ACT_NUMBER) +
      '</td>' +
      '<td>' +
      chipTyp(a.ACT_TYPE) +
      '</td>' +
      '<td>' +
      esc(a.CEX) +
      '</td>' +
      '<td class="muted" style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
      esc(a.REASON) +
      '</td>' +
      '<td class="num">' +
      (a.WAGON_CNT || 0) +
      '</td>' +
      '<td class="muted">' +
      fmtD(a.CREATED_AT) +
      '</td>' +
      '<td>' +
      chipStat(a.STATUS) +
      '</td>'
    tb.appendChild(tr)
  })
  t.appendChild(tb)
  return el('div', { style: 'overflow:auto' }, t)
}

/* ============================ Создание акта ============================ */
function newDraft(type) {
  return {
    id: 0,
    type: type,
    status: 'draft',
    cex: (REFS.cexes[0] || {}).CODE || '',
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
function viewNew(v) {
  if (!draft) draft = newDraft('start')
  v.appendChild(
    el(
      'div',
      { class: 'phead' },
      el(
        'h1',
        {},
        draft.id ? 'Редактирование акта ГУ-23' : 'Создание акта ГУ-23',
      ),
      el('p', {}, ''),
      el('div', { class: 'spacer' }),
    ),
  )

  // тип
  var seg = el('div', { class: 'seg', style: 'margin-bottom:18px' })
  ;[
    ['start', 'Начало простоя'],
    ['end', 'Окончание простоя'],
    ['other', 'Прочий акт'],
  ].forEach(function (p) {
    seg.appendChild(
      el(
        'button',
        {
          class: draft.type === p[0] ? 'on' : '',
          onclick: function () {
            var d = newDraft(p[0])
            draft = d
            render()
          },
        },
        p[1],
      ),
    )
  })
  if (!draft.id) v.appendChild(seg)

  var card = el('div', { class: 'card' })
  var body = el('div', { class: 'cardpad' })
  card.appendChild(body)

  if (draft.type === 'end') buildEndPicker(body)

  // реквизиты
  var c = el('div', { class: 'cols' })
  c.appendChild(
    field(
      'Цех составления',
      selectInp(cexCodes(), draft.cex, function (x) {
        draft.cex = x
      }),
      true,
    ),
  )
  c.appendChild(
    field(
      'Станция',
      selectInp(refNames(REFS.stations), draft.station, function (x) {
        draft.station = x
      }),
      true,
    ),
  )
  body.appendChild(c)

  var c2 = el('div', { class: 'cols' })
  c2.appendChild(
    field(
      'Причина составления',
      selectInp(
        [''].concat(refNames(REFS.reasons)),
        draft.reason,
        function (x) {
          draft.reason = x
        },
      ),
      true,
    ),
  )
  if (draft.type === 'start')
    c2.appendChild(
      field(
        'Дата и время начала простоя',
        dtInp(draft.startAt, function (x) {
          draft.startAt = x
        }),
        true,
      ),
    )
  if (draft.type === 'end')
    c2.appendChild(
      field(
        'Дата и время окончания простоя',
        dtInp(draft.endAt, function (x) {
          draft.endAt = x
          render()
        }),
        true,
      ),
    )
  body.appendChild(c2)

  if (draft.type === 'end' && draft.startAt) {
    var bad = draft.endAt && toMs(draft.endAt) < toMs(draft.startAt)
    body.appendChild(
      el('div', {
        class: 'banner ' + (bad ? 'err' : 'info'),
        html: durPreview(),
      }),
    )
  }

  body.appendChild(
    field(
      'Обстоятельства, вызвавшие составление акта',
      ta(draft.circumstances, function (x) {
        draft.circumstances = x
      }),
      true,
    ),
  )

  // ввод вагонов
  body.appendChild(el('div', { style: 'height:6px' }))
  body.appendChild(
    el(
      'label',
      {
        style: 'font-size:13px;font-weight:600;display:block;margin-bottom:8px',
      },
      'Вагоны',
    ),
  )
  var wInput = el('textarea', {
    class: 'inp',
    style: 'min-height:56px',
    placeholder:
      'Введите номера вагонов: через запятую, пробел, построчно или вставьте из Excel…',
  })
  body.appendChild(wInput)

  var acts = el('div', {
    style: 'display:flex;gap:9px;flex-wrap:wrap;margin:10px 0',
  })
  acts.appendChild(
    el(
      'button',
      {
        class: 'btn sm',
        onclick: function () {
          addWagons(wInput.value)
          wInput.value = ''
          render()
        },
      },
      '＋ Добавить вагоны',
    ),
  )
  if (draft.type !== 'other')
    acts.appendChild(
      el(
        'button',
        {
          class: 'btn sm primary',
          onclick: function () {
            requestBI(wInput.value)
          },
        },
        'Запросить из Дислокации',
      ),
    )
  if (draft.type === 'end')
    acts.appendChild(
      el(
        'button',
        {
          class: 'btn sm',
          onclick: function () {
            findOpenForInput(wInput.value)
            wInput.value = ''
          },
        },
        'Найти открытый простой',
      ),
    )
  body.appendChild(acts)

  if (draft._summary)
    body.appendChild(
      el('div', {
        class:
          'banner ' +
          (draft._summary.found < draft._summary.req ? 'warn' : 'ok'),
        html: draft._summary.text,
      }),
    )

  body.appendChild(wagonEditor())

  // подписанты
  body.appendChild(el('div', { style: 'height:14px' }))
  body.appendChild(signerPicker())

  // действия
  var foot = el('div', {
    class: 'cardpad',
    style:
      'border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end',
  })
  foot.appendChild(
    el(
      'button',
      {
        class: 'btn ghost',
        onclick: function () {
          draft = null
          go('archive')
        },
      },
      'Отмена',
    ),
  )
  foot.appendChild(
    el(
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
  foot.appendChild(
    el(
      'button',
      {
        class: 'btn primary',
        onclick: function () {
          saveAct('active')
        },
      },
      'Сохранить и завести акт →',
    ),
  )
  card.appendChild(foot)
  v.appendChild(card)
}

function toMs(localStr) {
  var d = new Date(localStr)
  return d.getTime()
}

function buildEndPicker(body) {
  body.appendChild(
    el('div', {
      class: 'banner info',
      html: 'Акт «Окончание простоя» закрывает ранее открытый акт начала. Выберите открытый акт — данные подтянутся автоматически.',
    }),
  )
  var fr = el('div', { class: 'frow' })
  fr.appendChild(
    el('label', {
      html: 'Открытый акт начала простоя <span class="req">*</span>',
    }),
  )
  var sel = el('select', {
    class: 'inp',
    onchange: function (e) {
      pickStartAct(e.target.value)
      render()
    },
  })
  sel.appendChild(
    el('option', { value: '' }, '— выберите открытый акт начала —'),
  )
  fr.appendChild(sel)
  fr.appendChild(el('div', { class: 'hint' }))
  body.appendChild(fr)

  if (draft._openStarts == null) {
    api('gu23_get_open_starts').done(function (list) {
      draft._openStarts = list || []
      fillEndOptions(sel)
    })
  } else {
    fillEndOptions(sel)
  }
}
function fillEndOptions(sel) {
  ;(draft._openStarts || []).forEach(function (a) {
    var wns = (a.WAGONS || [])
      .map(function (w) {
        return w.WAGON_NO
      })
      .join(', ')
    var o = el(
      'option',
      { value: a.ID },
      a.ACT_NUMBER + ' · ' + wns + ' · ' + a.REASON,
    )
    if (String(draft.linkedStartId) === String(a.ID)) o.selected = true
    sel.appendChild(o)
  })
}
function pickStartAct(id) {
  var a = (draft._openStarts || []).filter(function (x) {
    return String(x.ID) === String(id)
  })[0]
  if (!a) {
    draft.linkedStartId = ''
    return
  }
  draft.linkedStartId = a.ID
  draft.linkedStartNumber = a.ACT_NUMBER
  draft.startAt = toInput(a.START_AT)
  draft.cex = a.CEX
  draft.station = a.STATION
  draft.reason = a.REASON
  draft.wagons = (a.WAGONS || []).map(function (w) {
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
      a.ACT_NUMBER +
      ': вагоны, причина, цех, станция, дата начала ' +
      fmtDT(a.START_AT) +
      '.',
  }
}
function findOpenForInput(raw) {
  var nums = parseWagons(raw)
  if (!nums.length) {
    toast('Введите номер вагона', 'err')
    return
  }
  function search() {
    var hit = null
    ;(draft._openStarts || []).forEach(function (a) {
      ;(a.WAGONS || []).forEach(function (w) {
        if (nums.indexOf(w.WAGON_NO) >= 0 && !hit) hit = a
      })
    })
    if (hit) {
      pickStartAct(hit.ID)
      toast('Найден открытый акт ' + hit.ACT_NUMBER, 'ok')
      render()
    } else toast('Открытый простой по этим вагонам не найден', 'err')
  }
  if (draft._openStarts == null)
    api('gu23_get_open_starts').done(function (l) {
      draft._openStarts = l || []
      search()
    })
  else search()
}

function durPreview() {
  if (!draft.startAt || !draft.endAt)
    return 'Длительность простоя будет рассчитана автоматически по дате начала и окончания.'
  var s = toMs(draft.startAt),
    e = toMs(draft.endAt)
  if (e < s)
    return '⚠ Дата окончания меньше даты начала — сохранение будет заблокировано.'
  if (e === s)
    return '⚠ Длительность простоя составляет 0 часов (даты совпадают).'
  var d = calcDur(s, e)
  return (
    'Расчёт простоя: <b>' +
    fmtDur(d) +
    '</b>, всего ' +
    fmtTotalH(d) +
    ' · для претензий: ' +
    d.calDays +
    ' кал. дн. Значение рассчитано автоматически.'
  )
}

function addWagons(raw) {
  var nums = parseWagons(raw),
    added = 0
  nums.forEach(function (n) {
    if (
      !draft.wagons.some(function (w) {
        return w.n === n
      })
    ) {
      draft.wagons.push({
        n: n,
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

function requestBI(raw) {
  var input = parseWagons(raw)
  var targets = input.length
    ? input
    : draft.wagons.map(function (w) {
        return w.n
      })
  if (!targets.length) {
    toast('Введите номера вагонов', 'err')
    return
  }
  api('gu23_get_wagon_info', {
    wagons: JSON.stringify(targets),
    station: draft.station,
  }).done(function (rows) {
    rows = rows || []
    var found = 0
    rows.forEach(function (r) {
      var w = draft.wagons.filter(function (x) {
        return x.n === r.WAGON_NO
      })[0]
      if (!w) {
        w = {
          n: r.WAGON_NO,
          owner: '',
          kind: '',
          from: '',
          to: '',
          cargo: '',
          weight: '',
        }
        draft.wagons.push(w)
      }
      if (String(r.FOUND) === '1') {
        w.owner = r.OWNER
        w.kind = r.KIND
        w.from = r.ST_FROM
        w.to = r.ST_TO
        w.cargo = r.CARGO
        w.weight = r.WEIGHT
        found++
      }
    })

    // [Исправление] Строгое соответствие ТЗ по выводу краткой сводки
    draft._summary = {
      req: targets.length,
      found: found,
      text:
        'Запрошено ' +
        targets.length +
        ' вагонов, найдено ' +
        found +
        ' вагонов.' +
        (draft.station !== 'Углеуральская'
          ? ' <br>⚠ Внимание: данные подтягиваются только если станция операции — Углеуральская.'
          : ''),
    }

    toast('Получено ' + found + ' из ' + targets.length, found ? 'ok' : 'err')
    render()
  })
}

function wagonEditor() {
  if (!draft.wagons.length)
    return el(
      'div',
      { class: 'banner info' },
      'Вагоны не добавлены. Введите номера выше и нажмите «Запросить в Oracle BI / Дислокация».',
    )
  var wrap = el('div', {
    style: 'overflow:auto;border:1px solid var(--line);border-radius:7px',
  })
  var t = el('table', { class: 'wtbl' })
  var isEnd = draft.type === 'end'
  t.innerHTML =
    '<thead><tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th><th>Вес</th>' +
    (isEnd ? '<th>Простой</th>' : '') +
    '<th></th></tr></thead>'
  var tb = el('tbody')
  draft.wagons.forEach(function (w, i) {
    var tr = el('tr')
    tr.appendChild(el('td', { class: 'wn' }, w.n))

    // [Исправление] Вместо редактируемых <input> выводим данные как защищенный от изменения текст
    ;['owner', 'kind', 'from', 'to', 'cargo', 'weight'].forEach(function (k) {
      var td = el('td')
      // Выводим значение текстом, обернутым в span для сохранения стилей, либо пустой дефис, если данных нет
      td.appendChild(
        el(
          'span',
          {
            style:
              'padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;',
          },
          w[k] || '—',
        ),
      )
      tr.appendChild(td)
    })

    if (isEnd) {
      var dur = '—'
      if (draft.startAt && draft.endAt) {
        var s = toMs(draft.startAt),
          e = toMs(draft.endAt)
        if (e >= s) dur = fmtDur(calcDur(s, e))
      }
      tr.appendChild(el('td', { class: 'dur' }, dur))
    }
    tr.appendChild(
      el(
        'td',
        {},
        el(
          'button',
          {
            class: 'delx',
            onclick: function () {
              draft.wagons.splice(i, 1)
              render()
            },
          },
          '×',
        ),
      ),
    )
    tb.appendChild(tr)
  })
  t.appendChild(tb)
  wrap.appendChild(t)
  return el(
    'div',
    {},
    wrap,
    el(
      'div',
      { class: 'hint', style: 'margin-top:6px' },
      'Вагонов в акте: ' +
        draft.wagons.length +
        '. В печатной форме строк будет столько же.',
    ),
  )
}

function signerPicker() {
  var need = draft.type === 'other' ? 2 : 3
  var box = el('div', {})
  box.appendChild(
    el(
      'label',
      {
        style: 'font-size:13px;font-weight:600;display:block;margin-bottom:8px',
      },
      'Подписанты (требуется ' + need + ')',
    ),
  )
  var active = REFS.signers || []
  for (var i = 0; i < need; i++) {
    ;(function (idx) {
      var cur = draft.signers[idx]
      var hint =
        draft.type === 'other'
          ? idx === 0
            ? 'Представитель предприятия'
            : 'Второй подписант'
          : idx < 2
            ? 'Работник предприятия'
            : 'Работник станции ОАО «РЖД»'
      var wrap = el('div', { class: 'frow' })
      wrap.appendChild(
        el('label', {
          html:
            'Подписант ' +
            (idx + 1) +
            ' <span class="muted" style="font-weight:400">· ' +
            hint +
            '</span>',
        }),
      )
      var sel = el('select', {
        class: 'inp',
        onchange: function (e) {
          var s = active.filter(function (x) {
            return String(x.ID) === e.target.value
          })[0]
          draft.signers[idx] = s
            ? { id: s.ID, fio: s.FIO, post: s.POST, org: s.ORG }
            : null
        },
      })
      sel.appendChild(el('option', { value: '' }, '— выберите —'))
      active.forEach(function (s) {
        var o = el(
          'option',
          { value: s.ID },
          s.FIO + ' · ' + (s.POST || '') + ' · ' + (s.ORG || ''),
        )
        if (cur && String(cur.id) === String(s.ID)) o.selected = true
        sel.appendChild(o)
      })
      wrap.appendChild(sel)
      box.appendChild(wrap)
    })(i)
  }
  return box
}

/* валидация (клиент) — финальная проверка в пакете */
function validate(forActive) {
  var e = []
  if (!draft.cex) e.push('Не указан цех')
  if (!draft.reason) e.push('Не указана причина составления')
  if (!String(draft.circumstances).trim()) e.push('Не заполнены обстоятельства')
  if (!draft.wagons.length) e.push('Не добавлен ни один вагон')
  if (draft.type === 'start' && !draft.startAt)
    e.push('Не указана дата начала простоя')
  if (draft.type === 'end') {
    if (!draft.linkedStartId) e.push('Не выбран открытый акт начала простоя')
    if (!draft.endAt) e.push('Не указана дата окончания простоя')
    if (draft.startAt && draft.endAt && toMs(draft.endAt) < toMs(draft.startAt))
      e.push('Дата окончания меньше даты начала')
  }
  if (forActive) {
    var need = draft.type === 'other' ? 2 : 3
    var filled = draft.signers.filter(Boolean).length
    if (filled < need) e.push('Указано подписантов ' + filled + ' из ' + need)
  }
  return e
}

function saveAct(status, force) {
  var errs = validate(status === 'active')
  if (status === 'draft')
    errs = errs.filter(function (x) {
      return x.indexOf('подписант') < 0
    })
  if (errs.length) {
    toast(errs[0], 'err')
    return
  }

  var payload = {
    id: draft.id || 0,
    type: draft.type,
    status: status,
    cex: draft.cex,
    station: draft.station,
    reason: draft.reason,
    circumstances: draft.circumstances,
    start_at: draft.startAt ? draft.startAt.replace('T', ' ') : '',
    end_at: draft.endAt ? draft.endAt.replace('T', ' ') : '',
    linked_start_id: draft.linkedStartId || '',
    wagons: JSON.stringify(draft.wagons),
    signers: JSON.stringify(draft.signers.filter(Boolean)),
    force: force ? 'Y' : 'N',
  }
  api('gu23_save_act', payload).done(function (r) {
    if (r && r.ok) {
      toast(
        status === 'draft' ? 'Черновик сохранён' : 'Акт заведён, № ' + r.number,
        'ok',
      )
      draft = null
      openAct(r.id)
    } else {
      var msg = (r && r.msg) || 'Ошибка сохранения'
      if (/уже есть открытый акт начала/.test(msg)) {
        modalConfirm(
          'Дубль открытого простоя',
          msg + '. Завести акт всё равно?',
          function () {
            saveAct(status, true)
          },
        )
      } else {
        toast(msg, 'err')
      }
    }
  })
}

/* ============================ Карточка акта ============================ */
function viewCard(v) {
  api('gu23_get_act', { id: App.sel }).done(function (data) {
    v.innerHTML = ''
    if (!data || !data.ok) {
      v.appendChild(el('div', { class: 'empty-state' }, 'Акт не найден'))
      return
    }
    renderCard(v, data)
  })
}
function renderCard(v, data) {
  var a = data.act
  v.appendChild(
    el(
      'div',
      { class: 'phead' },
      el(
        'button',
        {
          class: 'btn sm ghost',
          onclick: function () {
            go('archive')
          },
        },
        '← Архив',
      ),
      el(
        'h1',
        { style: 'font-family:var(--mono);font-size:18px' },
        a.ACT_NUMBER,
      ),
      el('span', { html: chipTyp(a.ACT_TYPE) }),
      el('span', { html: chipStat(a.STATUS) }),
      el('div', { class: 'spacer' }),
    ),
  )

  // действия
  var bar = el('div', {
    style: 'display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px',
  })
  bar.appendChild(
    el(
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
  if (a.STATUS === 'draft') {
    bar.appendChild(
      el(
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
    bar.appendChild(
      el(
        'button',
        {
          class: 'btn danger',
          onclick: function () {
            delAct(a)
          },
        },
        '🗑 Удалить черновик',
      ),
    )
  }
  if (a.STATUS === 'active' || a.STATUS === 'closed') {
    bar.appendChild(
      el(
        'button',
        {
          class: 'btn danger',
          onclick: function () {
            annulAct(a)
          },
        },
        '⊘ Аннулировать',
      ),
    )
  }
  v.appendChild(bar)

  if (a.STATUS === 'annulled' && a.ANNUL_REASON)
    v.appendChild(
      el('div', {
        class: 'banner err',
        html: '<b>Аннулирован.</b> Причина: ' + esc(a.ANNUL_REASON),
      }),
    )

  var grid = el('div', {
    style:
      'display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start',
  })

  // ---- левая колонка ----
  var left = el('div', {})
  var c1 = el('div', { class: 'card' })
  c1.appendChild(
    el(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      el('b', {}, 'Реквизиты акта'),
    ),
  )
  var kv = el('dl', { class: 'kv', style: 'padding:16px 18px' })
  function add(k, val) {
    kv.appendChild(el('dt', {}, k))
    kv.appendChild(el('dd', { html: val }))
  }
  add('Тип акта', TYP[a.ACT_TYPE].l)
  add('Цех составления', esc(a.CEX))
  add('Станция', esc(a.STATION))
  add('Причина', esc(a.REASON))
  add('Дата составления', fmtDT(a.CREATED_AT))
  if (a.ACT_TYPE !== 'other')
    add('Начало простоя', '<span class="mono">' + fmtDT(a.START_AT) + '</span>')
  if (a.ACT_TYPE === 'end') {
    add(
      'Окончание простоя',
      '<span class="mono">' + fmtDT(a.END_AT) + '</span>',
    )
    add(
      'Длительность',
      '<b class="mono" style="color:var(--sign)">' +
        (a.DUR_DAYS || 0) +
        ' дн. ' +
        (a.DUR_HOURS || 0) +
        ' ч.</b> · всего ' +
        (a.DUR_TOTAL_H || 0) +
        ' ч. · ' +
        (a.CAL_DAYS || 0) +
        ' кал. дн.',
    )
    if (a.LINKED_START_ID)
      add(
        'Связан с актом начала',
        '<a href="#" onclick="openAct(' +
          a.LINKED_START_ID +
          ');return false">' +
          esc(a.LINKED_START_NUMBER || '—') +
          '</a>',
      )
  }
  add('Обстоятельства', esc(a.CIRCUMSTANCES))
  add('Создал', esc(a.CREATED_BY))
  c1.appendChild(kv)
  left.appendChild(c1)

  // вагоны
  var c2 = el('div', { class: 'card', style: 'margin-top:16px' })
  c2.appendChild(
    el(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      el('b', {}, 'Вагоны (' + data.wagons.length + ')'),
    ),
  )
  var wt = el('table', { class: 'tbl' })
  wt.innerHTML =
    '<thead><tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th><th>Вес</th></tr></thead>'
  var wtb = el('tbody')
  data.wagons.forEach(function (w) {
    var tr = el('tr', { style: 'cursor:default' })
    tr.innerHTML =
      '<td class="num" style="color:var(--signal);font-weight:600">' +
      esc(w.WAGON_NO) +
      '</td>' +
      '<td>' +
      esc(w.OWNER || '—') +
      '</td><td>' +
      esc(w.KIND || '—') +
      '</td><td>' +
      esc(w.ST_FROM || '—') +
      '</td>' +
      '<td>' +
      esc(w.ST_TO || '—') +
      '</td><td>' +
      esc(w.CARGO || '—') +
      '</td><td class="num">' +
      esc(w.WEIGHT || '—') +
      '</td>'
    wtb.appendChild(tr)
  })
  wt.appendChild(wtb)
  c2.appendChild(el('div', { style: 'overflow:auto' }, wt))
  left.appendChild(c2)
  grid.appendChild(left)

  // ---- правая колонка ----
  var right = el('div', {})
  // подписанты
  var cs = el('div', { class: 'card' })
  cs.appendChild(
    el(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      el('b', {}, 'Подписанты'),
    ),
  )
  var sbox = el('div', { class: 'cardpad' })
  if (!data.signers.length)
    sbox.appendChild(el('div', { class: 'muted' }, 'Подписанты не назначены'))
  data.signers.forEach(function (s) {
    sbox.appendChild(
      el(
        'div',
        { class: 'signrow' },
        el('div', { class: 'av' }, (s.FIO || '?').slice(0, 1)),
        el(
          'div',
          { style: 'flex:1' },
          el('div', { html: '<b>' + esc(s.FIO) + '</b>' }),
          el(
            'div',
            { class: 'muted', style: 'font-size:11.5px' },
            (s.POST || '') + ' · ' + (s.ORG || ''),
          ),
        ),
      ),
    )
  })
  cs.appendChild(sbox)
  right.appendChild(cs)

  // приложения
  var ca = el('div', { class: 'card', style: 'margin-top:16px' })
  var head = el(
    'div',
    {
      class: 'cardpad',
      style:
        'border-bottom:1px solid var(--line);display:flex;align-items:center',
    },
    el('b', {}, 'Приложения'),
    el('div', { style: 'flex:1' }),
  )
  if (a.STATUS !== 'annulled') {
    var lab = el('label', { class: 'btn sm' }, '＋ Файл')
    var fi = el('input', {
      type: 'file',
      multiple: true,
      style: 'display:none',
      accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    })
    fi.addEventListener('change', function () {
      uploadFiles(a.ID, fi.files)
    })
    lab.appendChild(fi)
    head.appendChild(lab)
  }
  ca.appendChild(head)
  var abox = el('div', { class: 'cardpad' })
  if (!data.files.length)
    abox.appendChild(
      el(
        'div',
        { class: 'muted', style: 'font-size:12.5px' },
        'Фото и файлы не прикреплены. Особенно актуальны для актов по состоянию вагона, повреждениям, течи, загрязнению.',
      ),
    )
  data.files.forEach(function (f) {
    var isImg = /(png|jpe?g|gif|bmp|webp)$/i.test(f.FILE_EXT || '')
    var row = el('div', {
      style:
        'display:flex;gap:9px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)',
    })
    if (isImg)
      row.appendChild(
        el('img', {
          src: 'get_file.php?inline=1&id=' + f.ID,
          style:
            'width:38px;height:38px;object-fit:cover;border-radius:5px;cursor:pointer',
          onclick: function () {
            window.open('get_file.php?inline=1&id=' + f.ID)
          },
        }),
      )
    else
      row.appendChild(
        el(
          'div',
          {
            style:
              'width:38px;height:38px;border-radius:5px;background:var(--surface2);display:grid;place-items:center;color:var(--muted)',
          },
          '📄',
        ),
      )
    row.appendChild(
      el(
        'div',
        { style: 'flex:1;font-size:12.5px' },
        el('a', { href: 'get_file.php?id=' + f.ID }, esc(f.FILE_NAME)),
        el(
          'div',
          { class: 'muted', style: 'font-size:11px' },
          fmtDT(f.CREATED_AT) + ' · ' + esc(f.CREATED_BY || ''),
        ),
      ),
    )
    if (a.STATUS !== 'annulled')
      row.appendChild(
        el(
          'button',
          {
            class: 'delx',
            onclick: function () {
              delFile(f.ID, a.ID)
            },
          },
          '×',
        ),
      )
    abox.appendChild(row)
  })
  ca.appendChild(abox)
  right.appendChild(ca)

  // история
  var ch = el('div', { class: 'card', style: 'margin-top:16px' })
  ch.appendChild(
    el(
      'div',
      { class: 'cardpad', style: 'border-bottom:1px solid var(--line)' },
      el('b', {}, 'История'),
    ),
  )
  var hb = el('ul', { class: 'hist', style: 'padding:8px 18px' })
  data.history.forEach(function (h) {
    hb.appendChild(
      el(
        'li',
        {},
        el('span', { class: 't' }, fmtDT(h.TS)),
        el('span', {
          html:
            esc(h.TXT) +
            (h.USR ? ' · <span class="muted">' + esc(h.USR) + '</span>' : ''),
        }),
      ),
    )
  })
  ch.appendChild(hb)
  right.appendChild(ch)
  grid.appendChild(right)
  v.appendChild(grid)
}

function editAct(data) {
  var a = data.act
  draft = {
    id: a.ID,
    type: a.ACT_TYPE,
    status: 'draft',
    cex: a.CEX,
    station: a.STATION,
    reason: a.REASON,
    circumstances: a.CIRCUMSTANCES || '',
    startAt: toInput(a.START_AT),
    endAt: toInput(a.END_AT),
    linkedStartId: a.LINKED_START_ID || '',
    linkedStartNumber: a.LINKED_START_NUMBER || '',
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
  App.page = 'new'
  App.sel = null
  render()
}
function delAct(a) {
  modalConfirm(
    'Удаление черновика',
    'Удалить черновик ' + a.ACT_NUMBER + '? Действие необратимо.',
    function () {
      api('gu23_del_act', { id: a.ID }).done(function (r) {
        if (r && r.ok) {
          toast('Черновик удалён', 'ok')
          go('archive')
        } else toast((r && r.msg) || 'Ошибка удаления', 'err')
      })
    },
  )
}
function annulAct(a) {
  modalPrompt(
    'Аннулирование акта',
    'Подписанный/действующий акт нельзя удалить. Укажите причину аннулирования:',
    function (reason) {
      if (!reason) return
      api('gu23_annul_act', { id: a.ID, reason: reason }).done(function (r) {
        if (r && r.ok) {
          toast('Акт аннулирован', 'ok')
          openAct(a.ID)
        } else toast((r && r.msg) || 'Ошибка', 'err')
      })
    },
  )
}

/* приложения */
function uploadFiles(actId, files) {
  if (!files || !files.length) return
  var fd = new FormData()
  fd.append('ajax_action', 'gu23_upload_file')
  fd.append('act_id', actId)
  for (var i = 0; i < files.length; i++) fd.append('file' + i, files[i])
  $.ajax({
    url: '/data.php',
    type: 'POST',
    data: fd,
    processData: false,
    contentType: false,
    dataType: 'json',
  }).done(function (r) {
    if (r && r.ok) toast('Файлы загружены', 'ok')
    else toast('Часть файлов не загружена', 'err')
    openAct(actId)
  })
}
function delFile(fileId, actId) {
  modalConfirm('Удаление файла', 'Удалить приложение?', function () {
    api('gu23_del_file', { file_id: fileId }).done(function (r) {
      if (r && r.ok) {
        toast('Файл удалён', 'ok')
        openAct(actId)
      } else toast((r && r.msg) || 'Ошибка', 'err')
    })
  })
}

/* ============================ Поиск по вагону ============================ */
function viewWagon(v) {
  v.appendChild(
    el(
      'div',
      { class: 'phead' },
      el('h1', {}, 'Поиск по вагону'),
      el('p', {}, 'Все акты, где участвовал вагон'),
    ),
  )
  var box = el('div', {})
  var f = el('div', { class: 'filters' })
  var sb = el('div', { class: 'searchbox' })
  var si = el('input', { class: 'inp', placeholder: 'Номер вагона…' })
  sb.appendChild(si)
  f.appendChild(sb)
  f.appendChild(el('button', { class: 'btn', onclick: run }, 'Найти'))
  v.appendChild(f)
  v.appendChild(box)
  si.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') run()
  })
  function run() {
    var wn = parseWagons(si.value)[0] || si.value.trim()
    if (!wn) {
      toast('Введите номер вагона', 'err')
      return
    }
    api('gu23_get_by_wagon', { wagon: wn }).done(function (list) {
      box.innerHTML = ''
      var card = el('div', { class: 'card' })
      card.appendChild(actsTable(list || []))
      box.appendChild(card)
    })
  }
}

/* ============================ модалки / тосты ============================ */
function modalConfirm(title, text, onOk) {
  showModal(title, el('div', {}, el('p', {}, text)), [
    { l: 'Отмена', c: 'btn ghost', cb: closeModal },
    {
      l: 'Подтвердить',
      c: 'btn primary',
      cb: function () {
        closeModal()
        onOk()
      },
    },
  ])
}
function modalPrompt(title, text, onOk) {
  var ta = el('textarea', { class: 'inp', style: 'min-height:80px' })
  showModal(title, el('div', {}, el('p', {}, text), ta), [
    { l: 'Отмена', c: 'btn ghost', cb: closeModal },
    {
      l: 'OK',
      c: 'btn primary',
      cb: function () {
        var val = ta.value.trim()
        closeModal()
        onOk(val)
      },
    },
  ])
}
function showModal(title, bodyNode, buttons) {
  var foot = el('div', { class: 'mfoot' })
  buttons.forEach(function (b) {
    foot.appendChild(el('button', { class: b.c, onclick: b.cb }, b.l))
  })
  var modal = el(
    'div',
    { class: 'modal' },
    el(
      'div',
      { class: 'mhead' },
      el('h3', {}, title),
      el('button', { class: 'x', onclick: closeModal }, '×'),
    ),
    el('div', { class: 'mbody' }, bodyNode),
    foot,
  )
  var scrim = el(
    'div',
    {
      class: 'scrim',
      onclick: function (e) {
        if (e.target === scrim) closeModal()
      },
    },
    modal,
  )
  $$('#modalRoot').appendChild(scrim)
}
function closeModal() {
  $$('#modalRoot').innerHTML = ''
}

function toast(msg, kind) {
  var t = el('div', {
    class: 'toast ' + (kind || ''),
    html: (kind === 'ok' ? '✓ ' : kind === 'err' ? '⚠ ' : '') + esc(msg),
  })
  document.body.appendChild(t)
  setTimeout(function () {
    if (t.parentNode) t.parentNode.removeChild(t)
  }, 3200)
}

/* ---------- общие поля формы ---------- */
function field(label, node, req) {
  return el(
    'div',
    { class: 'frow' },
    el('label', {
      html: esc(label) + (req ? ' <span class="req">*</span>' : ''),
    }),
    node,
  )
}
function selectInp(opts, val, cb) {
  var s = el('select', {
    class: 'inp',
    onchange: function (e) {
      cb(e.target.value)
    },
  })
  opts.forEach(function (o) {
    var op = el('option', { value: o }, o || '— выберите —')
    if (o === val) op.selected = true
    s.appendChild(op)
  })
  return s
}
function dtInp(val, cb) {
  return el('input', {
    class: 'inp',
    type: 'datetime-local',
    value: val || '',
    onchange: function (e) {
      cb(e.target.value)
    },
  })
}
function ta(val, cb) {
  return el(
    'textarea',
    {
      class: 'inp',
      onchange: function (e) {
        cb(e.target.value)
      },
    },
    val || '',
  )
}
