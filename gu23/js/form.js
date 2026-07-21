import { sendApiRequest } from './api.js'
import {
  references,
  activeDraft,
  createNewDraft,
  setActiveDraft,
  hasPerm,
} from './state.js'
import { navigateTo } from './app.js'
import {
  escapeHtml,
  formatToInputDate,
  formatToDatabaseDate,
  parseTimeToMilliseconds,
  calculateDuration,
  parseWagonsFromText,
} from './utils.js'
import { showFormField, showToast, showConfirmBox } from './ui.js'

const defaultStationRules = {
  stationName: 'Новая',
  departments: [],
  skipDepartments: ['ЖДЦ', 'УПРАВЛЕНИЕ'],
}

export function showForm(container) {
  if (!activeDraft) createNewDraft('start')

  //console.log('stationToName:', activeDraft.stationToName)

  $(container).load('pages/form.php', showFormPage)
}
/// НАААААААЧАААААЛООООООООО #1
function showFormPage() {
  $('#form-title').text(
    activeDraft.id ? 'Редактирование акта ГУ-23' : 'Создание акта ГУ-23',
  )
  showTypeSwitcher()
  showFormFields()
  showFormButtons()
}
// --- переключатель типа акта ---
function showTypeSwitcher() {
  if (activeDraft.id) return // При редактировании тип менять нельзя

  const types = [
    { id: 'start', label: 'Начало простоя' },
    { id: 'end', label: 'Окончание простоя' },
    { id: 'other', label: 'Прочий акт' },
  ]

  const buttonsHtml = types
    .map(
      (t) => `
    <button class="${activeDraft.type === t.id ? 'on' : ''}" data-type="${t.id}">${t.label}</button>
  `,
    )
    .join('')

  $('#type-switcher')
    .html(buttonsHtml)
    .find('button')
    .on('click', function () {
      createNewDraft($(this).data('type'))
      showForm($('#view')[0])
    })
}
// НААААААЧАААААЛООООООООО #2
// --- отрисовка полей формы ---
function showFormFields() {
  showEndActChoice()
  showDateField()
  showMainFields()
  showReasonFields()
  showWagonBlock()
}

function showEndActChoice() {
  const $place = $('#form-linked-start-place').empty()
  // Акт окончания простоя создается только на основе акта на начало простоя
  if (activeDraft.type !== 'end') return

  $place.html(`
    <div class="banner info">Акт «Окончание простоя» закрывает ранее открытый акт начала. Выберите открытый акт — данные подтянутся автоматически.</div>
    <div class="frow">
      <label>Открытый акт начала простоя <span class="req">*</span></label>
      <select class="inp" id="select-linked-start">
        <option value="">— выберите открытый акт начала —</option>
      </select>
    </div>
  `)
  loadOpenStartsList()
}

function showDateField() {
  const $place = $('#form-date-place').empty()
  // Строка Даты
  let dateRowHtml = ''
  if (activeDraft.type === 'start') {
    dateRowHtml = showFormField(
      'Дата и время начала простоя',
      `<input class="inp datetime-inp" id="inp-startAt" placeholder="ддммгг ччмм" value="${activeDraft.startAt}">`,
      true,
    )
  } else if (activeDraft.type === 'end') {
    dateRowHtml = showFormField(
      'Дата и время окончания простоя',
      `<input class="inp datetime-inp" id="inp-endAt" placeholder="ддммгг ччмм" value="${activeDraft.endAt}">`,
      true,
    )
  } else if (activeDraft.type === 'other') {
    dateRowHtml = showFormField(
      'Дата и время составления простоя',
      `<input class="inp datetime-inp" id="inp-startAt" placeholder="ддммгг ччмм" value="${activeDraft.startAt}">`,
      true,
    )
  }

  if (dateRowHtml) {
    $place.html(`<div class="cols">${dateRowHtml}<div></div></div>`)
    // маска из  general_function.js
    if (typeof init_date_time_input === 'function') {
      init_date_time_input($('.datetime-inp'))
    }

    // Послушаем дату
    $('#inp-startAt').on('blur', function () {
      activeDraft.startAt = validateAndGetDate($(this))
    })
    $('#inp-endAt').on('blur', function () {
      activeDraft.endAt = validateAndGetDate($(this))
      showDurationBanner()
    })
  }

  showDurationBanner()
}

function showMainFields() {
  const $place = $('#form-main-fields-place').empty()
  setDefaultStation()
  // Строка Цех + Станции
  const deptsHtml = references.departmentsList
    .map(
      (d) =>
        `<option value="${d.CODE}" ${activeDraft.departmentCode === d.CODE ? 'selected' : ''}>${d.CODE}</option>`,
    )
    .join('')
  const stationsHtml = references.stationsList
    .map(
      (station) =>
        `<option value="${station.CODE}" ${activeDraft.stationId === String(station.CODE) ? 'selected' : ''}>${station.NAME}</option>`,
    )
    .join('')
  // Имя станции отправления для значения автокомплита
  const stationFromName = (() => {
    const station = (references.stationsFromList || []).find(
      (station) => String(station.CODE) === String(activeDraft.stationFromId),
    )
    return station ? station.NAME : activeDraft.stationFromName || ''
  })()

  $place.append(`
    <div class="cols">
      ${showFormField('Цех составления', `<select class="inp" id="sel-dept">${deptsHtml}</select>`, true)}
      ${showFormField('Ст. составления', `<select class="inp" id="sel-station">${stationsHtml}</select>`, true)}
    </div>
  `)

  // Привязка к модели
  $('#sel-dept').on('change', function () {
    const prev = activeDraft.departmentCode
    activeDraft.departmentCode = this.value
    if (prev !== this.value) {
      // Сбрасываем подписантов предприятия — они могут не входить в новый цех
      activeDraft.signers = activeDraft.signers.map((s) =>
        s && !s.manual ? null : s,
      )
      showMainFields()
      showSignersFields()
    }
  })
  $('#sel-station').on('change', function () {
    activeDraft.stationId = this.value
  })

  // Строка: Ст. отправления + Ст. назначения (рядом), Груз — строкой ниже
  $place.append(`
    <div class="cols">
      ${showFormField('Ст. отправления', `<div style="position:relative"><input class="inp" id="auto-stationFrom" placeholder="Введите название (мин. 3 символа)…" value="${escapeHtml(stationFromName)}"><div class="dropdown" id="from-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`, true)}

      ${showFormField('Ст. назначения', `<div style="position:relative"><input class="inp" id="auto-stationTo" placeholder="Введите название (мин. 3 символа)…" value="${activeDraft.stationToName}"><div class="dropdown" id="auto-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`, true)}
    </div>
    <div class="cols">
      ${showFormField('Груз', `<div style="position:relative"><input class="inp" id="auto-cargo" placeholder="Начните вводить…" value="${escapeHtml(activeDraft.cargoReference || '')}"><div class="dropdown" id="cargo-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`, true)}
      <div></div>
    </div>
  `)

  prepareStationFields()

  // Груз — автокомплит
  const cargoItems = references.cargosList.map((c) => ({
    label: c.NAME || c.CODE,
    value: c.NAME || c.CODE,
  }))
  prepareListAutocomplete(
    $('#auto-cargo'),
    $('#cargo-dropdown'),
    cargoItems,
    (it) => {
      activeDraft.cargoReference = it.value
    },
    function () {
      activeDraft.cargoReference = $('#auto-cargo').val()
    },
  )
}

function setDefaultStation() {
  if (activeDraft.id) return false

  const deptCode = String(activeDraft.departmentCode || '').trim().toUpperCase()
  if (
    defaultStationRules.departments.length > 0 &&
    !defaultStationRules.departments.includes(deptCode)
  ) {
    return false
  }

  if (defaultStationRules.skipDepartments.includes(deptCode)) {
    return false
  }

  const station = (references.stationsList || []).find(
    (row) =>
      String(row.NAME || '').trim().toUpperCase() ===
      defaultStationRules.stationName.toUpperCase(),
  )
  if (!station) {
    return false
  }

  activeDraft.stationId = String(station.CODE)
  return true
}
// --- Причина и обстоятельства ---
function showReasonFields() {
  const $place = $('#form-reason-place').empty()
  // Причина и обстоятельства
  // Формируем список с расширенными данными
  const reasonItems = references.reasonsList.map((reason) => ({
    label: `${reason.NAME} (${reason.CATEG_NAME || 'Без категории'})`,
    value: reason.CODE,
    name: reason.NAME,           // сохраняем только имя
    code: reason.CODE,
    categName: reason.CATEG_NAME  // Категория причины
  }))
  // Начальное значение для поля (только NAME)
  const reasonInitLabel = (() => {
    const reason = references.reasonsList.find(
      (reason) => reason.CODE === activeDraft.reasonId,
    )
    return reason ? reason.NAME : activeDraft.reasonName || ''
  })()

  $place.html(`
    ${showFormField('Причина составления', `<div style="position:relative"><input class="inp" id="auto-reason" placeholder="Начните вводить…" value="${escapeHtml(reasonInitLabel)}"><div class="dropdown" id="reason-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`, true)}
    ${showFormField('Обстоятельства, вызвавшие составление акта', `<textarea class="inp" id="txt-circumstances">${activeDraft.circumstances || ''}</textarea>`, true)}
    ${showFormField('№ накладной', `<input class="inp" id="inp-waybill" value="${activeDraft.waybillNumber || ''}">`)}  `)

  // Причина из списка
  prepareListAutocomplete(
    $('#auto-reason'),
    $('#reason-dropdown'),
    reasonItems,
    (it) => {
      // При выборе сохраняем код и только имя
      activeDraft.reasonId = it.code
      activeDraft.reasonName = it.name
      
      // Подставляем в поле только NAME
      $('#auto-reason').val(it.name)
    },
    function () {
      activeDraft.reasonId = ''
    },
  )

  $('#txt-circumstances').on('change', function () {
    activeDraft.circumstances = this.value
  })
  $('#inp-waybill').on('input', function () {
    activeDraft.waybillNumber = this.value
  })
}

function showWagonBlock() {
  const $place = $('#form-wagons-place').empty()
  // Вагоны
  $place.html(`
    <div style="height:6px"></div>
    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Вагоны</label>
    <textarea class="inp" id="txt-wagons" style="min-height:56px" placeholder="Введите номера вагонов: через запятую, пробел, построчно…"></textarea>
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin:10px 0" id="wagon-actions"></div>
    <div id="wagon-summary-place"></div>
    <div id="wagons-table-place"></div>
  `)

  showWagonActions()
  showWagonsTable()
}

function validateAndGetDate($inp) {
  const value = $inp.val()
  const isValid =
    /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(value) &&
    !$inp.hasClass('red_bckg_color')
  return isValid ? value : ''
}
// --- плашка с длительностью простоя ---
function showDurationBanner() {
  const $place = $('#form-duration-place')
  if (activeDraft.type !== 'end') return $place.empty()

  if (!activeDraft.startAt || !activeDraft.endAt) {
    $place.html(
      '<div class="banner info">Длительность простоя будет рассчитана автоматически по дате начала и окончания.</div>',
    )
    return
  }

  const startMs = parseTimeToMilliseconds(activeDraft.startAt)
  const endMs = parseTimeToMilliseconds(activeDraft.endAt)

  if (endMs < startMs) {
    $place.html(
      '<div class="banner err">Дата окончания меньше даты начала — сохранение будет заблокировано.</div>',
    )
  } else if (endMs === startMs) {
    $place.html(
      '<div class="banner info">Длительность простоя составляет 0 часов (даты совпадают).</div>',
    )
  } else {
    const duration = calculateDuration(startMs, endMs)
    const durationText = `${duration.days} дн. ${duration.hours} ч.`
    const totalHoursText = `${(Math.round(duration.totalHours * 10) / 10).toLocaleString('ru')} ч.`
    $place.html(
      `<div class="banner info">Расчёт простоя: <b>${durationText}</b>, всего ${totalHoursText} · для претензий: ${duration.calendarDays} кал. дн.</div>`,
    )
  }
}
// --- загрузка списка открытых актов начала простоя ---
function loadOpenStartsList() {
  const proceedLoading = (list) => {
    activeDraft._openStarts = list || []
    const $select = $('#select-linked-start')
    activeDraft._openStarts.forEach((act) => {
      const wagonNumbers = (act.WAGONS || []).map((w) => w.WAGON_NO).join(', ')
      const isSelected = String(activeDraft.linkedStartId) === String(act.ID)
      $select.append(
        `<option value="${act.ID}" ${isSelected ? 'selected' : ''}>${act.ACT_NUMBER} от ${formatToInputDate(act.START_AT)}</option>`,
      )
      if (isSelected && act.CARGO_REF) {
        activeDraft.cargoReference = act.CARGO_REF
        $('#auto-cargo').val(act.CARGO_REF)
      }
    })

    $select.on('change', function () {
      applySelectedStartAct(this.value)
    })
  }

  if (activeDraft._openStarts == null) {
    sendApiRequest('gu23_get_open_starts').done(proceedLoading)
  } else {
    proceedLoading(activeDraft._openStarts)
  }
}
// Применяем выбранный акт начала простоя к текущему черновику
function applySelectedStartAct(id, filterNums = null) {
  const selectedAct = (activeDraft._openStarts || []).find(
    (item) => String(item.ID) === String(id),
  )
  if (!selectedAct) {
    activeDraft.linkedStartId = ''
    return
  }

  activeDraft.linkedStartId = selectedAct.ID
  activeDraft.linkedStartNumber = selectedAct.ACT_NUMBER
  activeDraft.startAt = formatToInputDate(selectedAct.START_AT)
  activeDraft.departmentCode = selectedAct.DEPT
  activeDraft.stationId = String(selectedAct.STATION_ID || '')
  activeDraft.stationFromId = String(selectedAct.ST_FROM_ID || '')
  activeDraft.stationFromName = selectedAct.ST_FROM || ''
  activeDraft.stationToId = String(selectedAct.ST_TO_ID || '')
  activeDraft.stationToName = selectedAct.ST_TO || ''
  activeDraft.reasonName = selectedAct.REASON_NAME
  activeDraft.reasonId = selectedAct.REASON_ID
  activeDraft.cargoReference = selectedAct.CARGO_REF

  const allWagons = selectedAct.WAGONS || []
  const wagonsToLoad = filterNums
    ? allWagons.filter((w) => filterNums.includes(w.WAGON_NO))
    : allWagons

  const newWagons = wagonsToLoad.map((w) => ({
    n: w.WAGON_NO,
    waybill: w.WAYBILL_NO || '',
    owner: w.OWNER,
    kind: w.KIND,
    from: w.ST_FROM,
    to: w.ST_TO,
    cargo: w.CARGO,
    weight: w.WEIGHT,
  }))

  if (filterNums) {
    const existingNums = new Set(activeDraft.wagons.map((w) => w.n))
    newWagons.forEach((w) => {
      if (!existingNums.has(w.n)) activeDraft.wagons.push(w)
    })
  } else {
    activeDraft.wagons = newWagons
  }

  activeDraft._summary = {
    req: activeDraft.wagons.length,
    found: activeDraft.wagons.length,
    text: `Подтянуты данные из акта начала ${selectedAct.ACT_NUMBER}.`,
  }

  showForm($('#view')[0])
}

/**
 * Автокомпликт (для «Груз», «Причина»).
 */
function prepareListAutocomplete($inp, $dropdown, items, onSelect, onInput) {
  let activeIdx = -1

  function setActive(idx) {
    const $items = $dropdown.find('.ac-item')
    $items.removeClass('ac-active')
    activeIdx = idx
    if (idx >= 0 && idx < $items.length) {
      $items.eq(idx).addClass('ac-active')[0].scrollIntoView({
        block: 'nearest',
      })
    }
  }

  function showMatches(searchText) {
    const searchTextLower = (searchText || '').trim().toLowerCase()
    const matches = searchTextLower
      ? items.filter(
          (it) => it.label.toLowerCase().indexOf(searchTextLower) !== -1,
        )
      : items
    $dropdown.empty()
    activeIdx = -1
    if (!matches.length) {
      $dropdown.hide()
      return
    }
    matches.slice(0, 100).forEach((it) => {
      const $item = $(
        `<div class="ac-item" data-value="${escapeHtml(String(it.value))}">${escapeHtml(it.label)}</div>`,
      )
      $item.on('mousedown', function (e) {
        e.preventDefault()
        $inp.val(it.label)
        onSelect(it)
        $dropdown.hide()
        activeIdx = -1
      })
      $item.on('mouseenter', function () {
        setActive($(this).index())
      })
      $dropdown.append($item)
    })
    $dropdown.show()
  }

  $inp.on('focus', function () {
    showMatches($(this).val())
  })
  $inp.on('input', function () {
    if (onInput) onInput()
    showMatches($(this).val())
  })
  $inp.on('keydown', function (e) {
    if (!$dropdown.is(':visible')) return
    const $items = $dropdown.find('.ac-item')
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(activeIdx + 1, $items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(activeIdx - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      $items.eq(activeIdx).trigger('mousedown')
    } else if (e.key === 'Escape') {
      $dropdown.hide()
      activeIdx = -1
    }
  })
  $inp.on('blur', () =>
    setTimeout(() => {
      $dropdown.hide()
      activeIdx = -1
    }, 200),
  )
}

// Подбор станции через gu23_search_station.
function prepareStationAutocomplete($inp, $dropdown, onSelect, onClear) {
  let timer = null
  let activeIdx = -1

  function setActive(idx) {
    const $items = $dropdown.find('.ac-item')
    $items.removeClass('ac-active')
    activeIdx = idx
    if (idx >= 0 && idx < $items.length) {
      const $active = $items.eq(idx).addClass('ac-active')
      $active[0].scrollIntoView({ block: 'nearest' })
    }
  }

  function selectItem($item) {
    $inp.val($item.data('name'))
    onSelect($item.data('code'), $item.data('name'))
    $dropdown.hide()
    activeIdx = -1
  }

  $inp.on('input', function () {
    const value = $(this).val().trim()
    clearTimeout(timer)
    activeIdx = -1
    if (value.length < 3) {
      $dropdown.hide().empty()
      if (!value) onClear()
      return
    }

    timer = setTimeout(() => {
      sendApiRequest('gu23_search_station', { q: value }).done((rows) => {
        $dropdown.empty()
        const stations = rows || []
        if (!stations.length) return $dropdown.hide()

        stations.forEach((row) => {
          const $item = $(
            `<div class="ac-item" data-code="${escapeHtml(String(row.CODE))}" data-name="${escapeHtml(row.NAME)}">${escapeHtml(row.NAME)}</div>`,
          )
          $item.on('mousedown', function (e) {
            e.preventDefault()
            selectItem($(this))
          })
          $item.on('mouseenter', function () {
            setActive($(this).index())
          })
          $dropdown.append($item)
        })
        $dropdown.show()
      })
    }, 300)
  })

  $inp.on('keydown', function (e) {
    if (!$dropdown.is(':visible')) return
    const $items = $dropdown.find('.ac-item')
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(Math.min(activeIdx + 1, $items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(Math.max(activeIdx - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      selectItem($items.eq(activeIdx))
    } else if (e.key === 'Escape') {
      $dropdown.hide()
      activeIdx = -1
    }
  })

  $inp.on('blur', () =>
    setTimeout(() => {
      $dropdown.hide()
      activeIdx = -1
    }, 200),
  )
}

// Автокомплит для станций отправления и назначения
function prepareStationFields() {
  prepareStationAutocomplete(
    $('#auto-stationTo'),
    $('#auto-dropdown'),
    (code, name) => {
      activeDraft.stationToId = code
      activeDraft.stationToName = name
    },
    () => {
      activeDraft.stationToId = ''
      activeDraft.stationToName = ''
    },
  )
  prepareStationAutocomplete(
    $('#auto-stationFrom'),
    $('#from-dropdown'),
    (code, name) => {
      activeDraft.stationFromId = code
      activeDraft.stationFromName = name
    },
    () => {
      activeDraft.stationFromId = ''
      activeDraft.stationFromName = ''
    },
  )
}

function showWagonActions() {
  const $actions = $('#wagon-actions').empty()

  if (activeDraft.type === 'start' || activeDraft.type === 'other') {
    const $btn = $(
      '<button class="btn sm primary">Заполнить данные из Дислокации</button>',
    )
    $btn.on('click', () => loadWagonsDataFromDislocation())
    $actions.append($btn)

    const $btnClear = $(
      '<button class="btn sm primary">Очистить таблицу</button>',
    )
    const $wtbl = $('#wtbl').empty()
    $btnClear.on('click', () => ClearTableDislocation())
    $wtbl.append($btnClear)
  }

  if (activeDraft.type === 'end') {
    const $btn = $(
      '<button class="btn sm">Найти вагон в открытом акте простоя</button>',
    )
    $btn.on('click', () => findOpenStayByWagons())
    $actions.append($btn)
  }

  if (activeDraft.wagons.length) {
    const $btnClear = $('<button class="btn sm">Очистить таблицу</button>')
    $btnClear.on('click', () => {
      activeDraft.wagons = []
      activeDraft._summary = null
      showWagonActions()
      showWagonsTable()
    })
    $actions.append($btnClear)
  }
}
// --- загрузка данных о вагонах из дислокации ---
function loadWagonsDataFromDislocation() {
  /*console.log('activeDraft.type='+activeDraft.type);
  console.log('activeDraft.stationToName='+activeDraft.stationToName);
  console.log('activeDraft.cargoReference='+activeDraft.cargoReference);
  */
  const rawText = $('#txt-wagons').val()
  const inputNums = parseWagonsFromText(rawText)

  // Синхронизируем поле накладной из DOM до перерисовки
  activeDraft.waybillNumber = $('#inp-waybill').val() || ''
  if (!inputNums.length && !activeDraft.waybillNumber)
    return showToast('Введите номера вагонов или номер накладной!', 'err')
  sendApiRequest('gu23_get_wagon_info', {
    wagons: JSON.stringify(inputNums),
    waybill_no: activeDraft.waybillNumber || '',
    dest_station: activeDraft.stationToName || '',
    cardo_name: activeDraft.cargoReference || '',
    act_type: activeDraft.type || '',
  }).done((rows) => {
    const records = rows || []
    let foundCount = 0
    let addedCount = 0
    let noDataCount = 0 // добавлены без данных (не нашлись в дислокации)
    let firstFound = null
    const busy = [] // вагоны/накладные, уже занятые другим актом начала

    // Получаем существующие номера вагонов для проверки
    const existingNumbers = new Set(activeDraft.wagons.map((w) => w.n))

    records.forEach((row) => {
      const wagonNumber = String(row.WAGON_NO || '').trim()

      if (String(row.FOUND) === '1') {
        foundCount++
        if (!firstFound) firstFound = row

        // Вагон/накладная уже заняты действующим актом начала — не добавляем
        if (row.DUP_ACT) {
          busy.push({
            n: wagonNumber,
            act: row.DUP_ACT,
            by: row.DUP_BY, // 'wagon' (в пределах месяца) | 'waybill' (3 мес.)
          })
          return
        }

        // Добавляем только если вагона еще нет в списке
        if (!existingNumbers.has(wagonNumber)) {
          activeDraft.wagons.push({
            n: wagonNumber,
            waybill: row.WAYBILL_NO || '',
            owner: row.OWNER,
            kind: row.KIND,
            from: row.ST_FROM,
            to: row.ST_TO,
            cargo: row.CARGO,
            weight: row.WEIGHT,
          })
          existingNumbers.add(wagonNumber) // Обновляем Set для проверки дубликатов внутри текущей партии
          addedCount++
        }
      } else if (wagonNumber && !existingNumbers.has(wagonNumber)) {
        // Данные из дислокации не подтянулись — всё равно добавляем вагон (только номер)
        activeDraft.wagons.push({
          n: wagonNumber,
          waybill: '',
          owner: '',
          kind: '',
          from: '',
          to: '',
          cargo: '',
          weight: '',
        })
        existingNumbers.add(wagonNumber)
        addedCount++
        noDataCount++
      }
    })

    // Автозаполнение «Груз», «Ст. отправления» и «Ст. назначения» из дислокации
    if (firstFound) {
      if (firstFound.CARGO)
        activeDraft.cargoReference = firstFound.CARGO //  груз
      if (firstFound.ST_FROM_CODE) {
        activeDraft.stationFromId = firstFound.ST_FROM_CODE // id станции отправления
        activeDraft.stationFromName = firstFound.ST_FROM // станции отправления
      }
      if (firstFound.ST_TO_CODE) {
        activeDraft.stationToId = firstFound.ST_TO_CODE // id станции назначения
        activeDraft.stationToName = firstFound.ST_TO //  станции назначения
      }
    }
    // Текст про занятые вагоны/накладные
    let busyText = ''
    if (busy.length) {
      const parts = busy.map(
        (b) =>
          `${b.n} (${b.by === 'waybill' ? 'накладная' : 'вагон'} — акт ${b.act})`,
      )
      busyText = ` Пропущено занятых: ${busy.length} — ${parts.join(', ')}.`
    }

    // Текст про вагоны, добавленные без данных (не нашлись в дислокации)
    const noDataText = noDataCount
      ? ` Без данных из дислокации (добавлены только номера): ${noDataCount}.`
      : ''

    // Выводим плашку о итогах найденных данных
    activeDraft._summary = {
      req: inputNums.length,
      found: foundCount,
      added: addedCount,
      busy: busy.length,
      noData: noDataCount,
      text:
        `Запрошено ${inputNums.length} вагонов, найдено ${foundCount}, добавлено ${addedCount} новых.` +
        noDataText +
        busyText,
    }

    showToast(
      busy.length
        ? `Добавлено ${addedCount}, пропущено занятых ${busy.length} (уже есть акт начала)`
        : noDataCount
          ? `Добавлено ${addedCount} (из них без данных: ${noDataCount})`
          : `Добавлено ${addedCount} новых вагонов из ${foundCount} найденных`,
      busy.length ? 'warn' : addedCount ? 'ok' : 'info',
    )
    $('#txt-wagons').val('')
    showForm($('#view')[0])
  })
}
// поиск открытого акта начала простоя по введённым номерам вагонов ---
function findOpenStayByWagons() {
  const rawText = $('#txt-wagons').val()
  const nums = parseWagonsFromText(rawText)
  if (!nums.length) return showToast('Введите номер вагона', 'err')

  const findOpenStay = () => {
    const foundActs = {}
    nums.forEach((num) => {
      ;(activeDraft._openStarts || []).forEach((act) => {
        if ((act.WAGONS || []).some((w) => w.WAGON_NO === num))
          foundActs[act.ID] = act
      })
    })

    const ids = Object.keys(foundActs)
    if (ids.length === 0) {
      showToast('Открытый простой по этим вагонам не найден', 'err')
    } else if (ids.length > 1) {
      showToast('Введённые вагоны относятся к разным актам начала.', 'err')
    } else {
      applySelectedStartAct(ids[0], nums)
      showToast(`Найден открытый акт ${foundActs[ids[0]].ACT_NUMBER}`, 'ok')
    }
  }

  if (activeDraft._openStarts == null) {
    sendApiRequest('gu23_get_open_starts').done((list) => {
      activeDraft._openStarts = list || []
      findOpenStay()
    })
  } else {
    findOpenStay()
  }
}

function ClearTableDislocation() {
  $('#wtbl').empty()
}
// --- отрисовка таблицы вагонов ---
function showWagonsTable() {
  const $place = $('#wagons-table-place').empty()
  const $summaryPlace = $('#wagon-summary-place').empty()

  if (activeDraft._summary) {
    const summaryClass =
      activeDraft._summary.found < activeDraft._summary.req ? 'warn' : 'ok'
    $summaryPlace.html(
      `<div class="banner ${summaryClass}">${activeDraft._summary.text}</div>`,
    )
  }

  if (!activeDraft.wagons.length) {
    $place.html(
      '<div class="banner info">Вагоны не добавлены. Введите номера выше и нажмите «Заполнить данные из Дислокации».</div>',
    )
    showSignersFields()
    return
  }

  const isEndType = activeDraft.type === 'end'
  const rowsHtml = activeDraft.wagons
    .map((wagon, idx) => {
      let durationText = '—'
      if (isEndType && activeDraft.startAt && activeDraft.endAt) {
        const startMs = parseTimeToMilliseconds(activeDraft.startAt)
        const endMs = parseTimeToMilliseconds(activeDraft.endAt)
        if (endMs >= startMs) {
          const duration = calculateDuration(startMs, endMs)
          durationText = `${duration.days} дн. ${duration.hours} ч.`
        }
      }

      return `
      <tr>
        <td class="wn">${wagon.n}</td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.waybill || '—'}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.owner || '—'}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.kind || '—'}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.from || '—'}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.to || '—'}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.cargo || '—'}</span></td>
        <td><span style="padding: 5px 0; display: inline-block; color: var(--ink2); font-weight: 500;">${wagon.weight || '—'}</span></td>
        
        ${isEndType ? `<td class="dur">${durationText}</td>` : ''}
        <td><button class="delx" data-idx="${idx}">×</button></td>
      </tr>
    `
    })
    .join('')

  const tableHtml = `
    <div style="overflow:auto;max-height:360px;border:1px solid var(--line);border-radius:7px">
      <table class="wtbl">
        <thead>
          <tr>
            <th>№ вагона</th>
            <th>Накладная</th>
            <th>Собственник</th>
            <th>Род</th>
            <th>Ст. отпр.</th>
            <th>Ст. назн.</th>
            <th>Груз</th>
            <th>Вес(кг)</th>
            ${isEndType ? '<th>Простой</th>' : ''}<th></th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="hint" style="margin-top:6px">Вагонов в акте: ${activeDraft.wagons.length}.</div>
  `

  $place
    .html(tableHtml)
    .find('.delx')
    .on('click', function () {
      activeDraft.wagons.splice($(this).data('idx'), 1)
      showWagonsTable()
    })

  showSignersFields()
}
// Конфиг подписантов для актов
const signerRules = {
  other: {
    ownCount: 3,
    ownRequired: 2,
    rzdCount: 0,
    rzdRequired: 0,
    ownLabels: [
      'Представитель предприятия',
      'Второй подписант',
      'Третий подписант',
    ],
    rzdLabel: 'Работник станции ОАО "РЖД"',
  },
  default: {
    ownCount: 2,
    ownRequired: 2,
    rzdCount: 1,
    rzdRequired: 1,
    ownLabels: ['Работник предприятия', 'Работник предприятия'],
    rzdLabel: 'Работник станции ОАО "РЖД"',
  },
}
// Получаем  подписантов для текущего типа акта
function getSignerSlots(actType) {
  const rules = signerRules[actType] || signerRules.default
  const slots = []

  for (let i = 0; i < rules.ownCount; i++) {
    slots.push({
      type: 'own',
      required: i < rules.ownRequired,
      helpText: rules.ownLabels[i] || 'Работник предприятия',
    })
  }

  for (let i = 0; i < rules.rzdCount; i++) {
    slots.push({
      type: 'rzd',
      required: i < rules.rzdRequired,
      helpText: rules.rzdLabel,
    })
  }

  return slots
}
// Отрисовываем блок подписантов
function showSignersFields() {
  const $container = $('#form-signers-place')
    .empty()
    .append(
      '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Подписанты</label>',
    )
  const signerSlots = getSignerSlots(activeDraft.type)
  putSignersToSlots(signerSlots)
  const ownFiltered = getOwnSignersForAct()

  fillFirstSigner(ownFiltered)

  const manualSlots = [] // слоты в ручном режиме — для автокомплита ФИО/должности
  for (let i = 0; i < signerSlots.length; i++) {
    showSignerSlot($container, i, signerSlots[i], ownFiltered, manualSlots)
  }

  signerModeButtonClicks()
  signerSelectChanges(ownFiltered)
  manualSignerInputChanges()
  manualSignerHints(manualSlots)
}
//
function putSignersToSlots(signerSlots) {
  const current = activeDraft.signers || []
  if (!current.length) return

  const result = new Array(signerSlots.length).fill(null)
  const moved = new Set()

  current.forEach((signer, index) => {
    if (!signer || !signerSlots[index]) return
    if (!signerMatchesSlot(signer, signerSlots[index])) return

    result[index] = signer
    moved.add(index)
  })

  current.forEach((signer, index) => {
    if (!signer || moved.has(index)) return

    const freeIndex = result.findIndex(
      (item, slotIndex) =>
        !item && signerMatchesSlot(signer, signerSlots[slotIndex]),
    )

    if (freeIndex >= 0) {
      result[freeIndex] = signer
    }
  })

  activeDraft.signers = result
}

function signerMatchesSlot(signer, slot) {
  if (!slot) return false
  if (signer.manual) return true
  if (!signer.stype) return slot.type === 'own'
  return signer.stype === slot.type
}
// Получаем список подписантов предприятия для текущего акта
function getOwnSignersForAct() {
  // const dept = activeDraft.departmentCode
  // Временно отключаем фильтрацию по цеху
  /*const ownFiltered = (references.signersOwnList || []).filter(
    // Фильтрация по цеху составления
    (s) => !dept || !s.UNIT || s.UNIT.includes(dept),
  )*/
  return references.signersOwnList || []
}

function fillFirstSigner(ownFiltered) {
  // Автоподстановка: для нового акта слот 0 заполняем текущим пользователем
  if (activeDraft.id || activeDraft.signers[0]) return

  const myId = (window.GU23_SESSION || {}).user_id
  const me = myId
    ? ownFiltered.find((s) => String(s.ID) === String(myId))
    : null
  if (!me) return

  activeDraft.signers[0] = {
    id: me.ID,
    fio: me.FIO,
    post: me.POST,
    org: me.ORG,
    manual: false,
    stype: 'own',
  }
}

function showSignerSlot($container, i, slotCfg, ownFiltered, manualSlots) {
  const signersList =
    slotCfg.type === 'rzd' ? references.signersRzdList || [] : ownFiltered

  // ID подписантов, уже выбранных в других слотах (чтобы исключить дубли)
  const usedIds = activeDraft.signers
    .map((s, idx) => (idx !== i && s && !s.manual ? String(s.id) : null))
    .filter(Boolean)

  const signer = activeDraft.signers[i]
  const isManual = signer && signer.manual === true

  const toggleHtml = `
    <div style="display:flex;gap:6px;margin-bottom:6px">
      <button type="button" class="btn sm signer-mode-btn ${!isManual ? 'primary' : ''}" data-slot="${i}" data-mode="ref">Из справочника</button>
      <button type="button" class="btn sm signer-mode-btn ${isManual ? 'primary' : ''}" data-slot="${i}" data-mode="manual">Вручную</button>
    </div>
  `

  const inputHtml = isManual
    ? manualSignerInputHtml(i, signer, manualSlots)
    : signerSelectHtml(i, signer, signersList, usedIds)

  $container.append(
    showFormField(
      `Подписант ${i + 1} <span class="muted" style="font-weight:400">· ${slotCfg.helpText}</span>`,
      `<div>${toggleHtml}${inputHtml}</div>`,
      slotCfg.required,
    ),
  )
}

function manualSignerInputHtml(i, signer, manualSlots) {
  // подсказки для ручного ввода — ТОЛЬКО ранее введённые вручную записи
  // (из истории актов), без справочника предприятия/РЖД
  manualSlots.push({ slot: i, source: references.signersManualList })
  const ddStyle =
    'display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;'
  return `
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:5px">
      <div style="position:relative">
        <input class="inp signer-fio" data-slot="${i}" id="signer-fio-${i}" placeholder="ФИО" value="${escapeHtml(signer.fio || '')}">
        <div class="dropdown" id="signer-fio-dd-${i}" style="${ddStyle}"></div>
      </div>
      <div style="position:relative">
        <input class="inp signer-post" data-slot="${i}" id="signer-post-${i}" placeholder="Должность" value="${escapeHtml(signer.post || '')}">
        <div class="dropdown" id="signer-post-dd-${i}" style="${ddStyle}"></div>
      </div>
      <input class="inp signer-org" data-slot="${i}" placeholder="Организация" value="${escapeHtml(signer.org || '')}">
    </div>
  `
}

function signerSelectHtml(i, signer, signersList, usedIds) {
  const optionsHtml = signersList
    .filter(
      (s) =>
        !usedIds.includes(String(s.ID)) ||
        (signer && String(signer.id) === String(s.ID)),
    )
    .map(
      (s) =>
        `<option value="${s.ID}" ${signer && String(signer.id) === String(s.ID) ? 'selected' : ''}>${s.FIO} · ${s.POST || ''} · ${s.ORG || ''}</option>`,
    )
    .join('')
  return `
    <select class="inp signer-select" data-slot="${i}">
      <option value="">— выберите —</option>
      ${optionsHtml}
    </select>
  `
}
//
function signerModeButtonClicks() {
  $('.signer-mode-btn').on('click', function () {
    const slot = $(this).data('slot')
    const mode = $(this).data('mode')
    const current = activeDraft.signers[slot]
    if (mode === 'manual') {
      activeDraft.signers[slot] = {
        id: null,
        fio: current ? current.fio : '',
        post: current ? current.post : '',
        org: current ? current.org : '',
        manual: true,
      }
    } else {
      activeDraft.signers[slot] = null
    }
    showSignersFields()
  })
}

function signerSelectChanges(ownFiltered) {
  $('.signer-select').on('change', function () {
    const slot = $(this).data('slot')
    const value = this.value
    const slotCfg = getSignerSlots(activeDraft.type)[slot]
    const pool =
      slotCfg && slotCfg.type === 'rzd'
        ? references.signersRzdList
        : ownFiltered
    const matched = pool.find((x) => String(x.ID) === value)
    const stype = pool === references.signersRzdList ? 'rzd' : 'own'
    activeDraft.signers[slot] = matched
      ? {
          id: matched.ID,
          fio: matched.FIO,
          post: matched.POST,
          org: matched.ORG,
          manual: false,
          stype: stype,
        }
      : null
    // перерисовываем
    showSignersFields()
  })
}

function manualSignerInputChanges() {
  $('.signer-fio, .signer-post, .signer-org').on('input', function () {
    const slot = $(this).data('slot')
    if (!activeDraft.signers[slot])
      activeDraft.signers[slot] = {
        id: null,
        fio: '',
        post: '',
        org: '',
        manual: true,
      }
    if ($(this).hasClass('signer-fio'))
      activeDraft.signers[slot].fio = this.value
    else if ($(this).hasClass('signer-post'))
      activeDraft.signers[slot].post = this.value
    else activeDraft.signers[slot].org = this.value
  })
}

function manualSignerHints(manualSlots) {
  // Автокомплит для ручного ввода подписанта: по ФИО или должности.
  // ФИО/должность/организацию
  manualSlots.forEach(({ slot, source }) => {
    const items = (source || []).map((s) => ({
      // label содержит и ФИО, и должность — поиск работает по обоим
      label: `${s.FIO || ''}${s.POST ? ' · ' + s.POST : ''}${s.ORG ? ' · ' + s.ORG : ''}`,
      value: s.ID,
      fio: s.FIO || '',
      post: s.POST || '',
      org: s.ORG || '',
    }))
    if (!items.length) return

    const fill = (it) => {
      activeDraft.signers[slot] = {
        id: null,
        fio: it.fio,
        post: it.post,
        org: it.org,
        manual: true,
      }
      showSignersFields()
    }

    prepareListAutocomplete(
      $(`#signer-fio-${slot}`),
      $(`#signer-fio-dd-${slot}`),
      items,
      fill,
    )
    prepareListAutocomplete(
      $(`#signer-post-${slot}`),
      $(`#signer-post-dd-${slot}`),
      items,
      fill,
    )
  })
}

function showFormButtons() {
  const sendBtn = hasPerm('SEND_APPROVAL')
    ? `<button class="btn primary" id="btn-saveActive">Сохранить и отправить на подписание</button>`
    : ''
  const saveStatus =
    activeDraft.status === 'on_correction' ? 'on_correction' : 'draft'
  const saveLabel =
    activeDraft.status === 'on_correction' ? 'Сохранить' : 'Сохранить Проект'

  $('#form-footer').html(`
    <button class="btn ghost" id="btn-cancel">Отмена</button>
    <button class="btn" id="btn-saveDraft">${saveLabel}</button>
    ${sendBtn}
  `)

  $('#btn-cancel').on('click', () => {
    setActiveDraft(null)
    navigateTo('archive')
  })
  $('#btn-saveDraft').on('click', () => saveActToServer(saveStatus))
  $('#btn-saveActive').on('click', () => saveActToServer('active'))
}
// Проверка формы перед сохранением
function validateForm(checkSigners) {
  const errors = []

  checkMainFields(errors)
  checkActDates(errors)
  if (checkSigners) checkRequiredSigners(errors)

  return errors
}
// Проверка основных полей формы
function checkMainFields(errors) {
  if (!activeDraft.departmentCode) errors.push('Не указан цех')
  if (!activeDraft.reasonId) errors.push('Не указана причина составления')
  if (!String(activeDraft.circumstances).trim())
    errors.push('Не заполнены обстоятельства')
  // Вагоны обязательны (добавляются из таблицы дислокации), груз — тоже.
  // Накладная и груз — лишь помощники поиска вагонов, но груз обязателен к заполнению.
  if (!activeDraft.wagons.length)
    errors.push('Добавьте хотя бы один вагон (из таблицы дислокации)')
  if (
    (activeDraft.type === 'start' || activeDraft.type === 'other') &&
    !activeDraft.cargoReference
  )
    errors.push('Не указан груз')
  if (!activeDraft.stationId) errors.push('Не указана ст. составления')
  if (!activeDraft.stationFromId) errors.push('Не указана ст. отправления')
  /* if (!activeDraft.stationToId && !activeDraft.waybillNumber)
    errors.push('Не указана ст. назначения') */
  if (!activeDraft.stationToId) errors.push('Не указана ст. назначения')
}
// Проверка дат акта
function checkActDates(errors) {
  if (activeDraft.type === 'start' && !activeDraft.startAt)
    errors.push('Не указана дата начала простоя')
  if (activeDraft.type === 'other' && !activeDraft.startAt)
    errors.push('Не указана дата составления акта')
  if (activeDraft.type === 'end') {
    if (!activeDraft.linkedStartId)
      errors.push('Не выбран открытый акт начала простоя')
    if (!activeDraft.endAt) errors.push('Не указана дата окончания простоя')
    if (
      activeDraft.startAt &&
      activeDraft.endAt &&
      parseTimeToMilliseconds(activeDraft.endAt) <
        parseTimeToMilliseconds(activeDraft.startAt)
    ) {
      errors.push('Дата окончания меньше даты начала')
    }
  }
}
// Проверка обязательных подписантов
function checkRequiredSigners(errors) {
  const signerSlots = getSignerSlots(activeDraft.type)
  const emptySlot = signerSlots.findIndex(
    (slotCfg, slot) =>
      slotCfg.required && !isFilledSigner(activeDraft.signers[slot]),
  )
  if (emptySlot >= 0) errors.push(`Не указан подписант ${emptySlot + 1}`)
}
// Проверка, заполнен ли подписант (ФИО + должность + организация)
function isFilledSigner(signer) {
  if (!signer || !signer.fio || !signer.fio.trim()) return false
  if (signer.manual)
    return !!(
      signer.post &&
      signer.post.trim() &&
      signer.org &&
      signer.org.trim()
    )
  return true
}
// --- сохранение акта в БД ---
let actSaveInProcess = false

function setSaveButtonsDisabled(disabled) {
  $('#btn-saveDraft, #btn-saveActive').prop('disabled', disabled)
}

function finishSaveRequest() {
  actSaveInProcess = false
  setSaveButtonsDisabled(false)
}

// Созраняем акт в БД
function saveActToServer(status, skipWarning = false) {
  if (actSaveInProcess) return

  const errors = getSaveErrors(status)
  if (errors.length) return showToast(errors[0], 'err')

  actSaveInProcess = true
  setSaveButtonsDisabled(true)

  sendApiRequest('gu23_save_act', getActDataForSave(status, skipWarning))
    .done((response) => {
      if (response && response.ok) {
        afterActSaved(status, response)
      } else {
        finishSaveRequest()
        showSaveError(status, response)
      }
    })
    .fail(() => {
      finishSaveRequest()
    })
}
// Проверка ошибок перед сохранением
function getSaveErrors(status) {
  if (status === 'active') return validateForm(true)
  return activeDraft.departmentCode ? [] : ['Не указан цех']
}
// Формируем объект данных для сохранения акта
function getActDataForSave(status, skipWarning) {
  return {
    id: activeDraft.id || 0,
    type: activeDraft.type,
    status: status,
    dept: activeDraft.departmentCode,
    station: activeDraft.stationId || '',
    st_from: activeDraft.stationFromId || '',
    st_to: activeDraft.stationToId || '',
    // Номер накладной
    waybill_no: activeDraft.waybillNumber || '',
    // Груз
    cargo_ref: activeDraft.cargoReference || '',
    // Причина
    reason: activeDraft.reasonId,
    // обстоятельства
    circumstances: activeDraft.circumstances,
    start_at: formatToDatabaseDate(activeDraft.startAt),
    end_at: formatToDatabaseDate(activeDraft.endAt),
    // Признак, что акт составлен в рамках другого акта начала простоя (для актов окончания)
    linked_start_id: activeDraft.linkedStartId || '',
    wagons: JSON.stringify(activeDraft.wagons),
    // Подписанты — массив объектов с полями: id, fio, post, org, manual, stype
    signers: JSON.stringify(activeDraft.signers.filter(Boolean)),
    // Признак игнорирования предупреждения о дублирующемся открытом акте начала простоя
    force: skipWarning ? 'Y' : 'N',
  }
}
// После успешного сохранения акта
function afterActSaved(status, response) {
  setActiveDraft(null)

  if (status === 'active') {
    sendApiRequest('gu23_send_approval', {
      act_id: response.id,
    })
      .done((sendResponse) => {
        if (sendResponse && sendResponse.ok) {
          showToast(
            `Акт зарегистрирован${response.number ? ', № ' + response.number : ''}`,
            'ok',
          )
        } else {
          showToast(
            `Акт зарегистрирован, но ссылка не отправлена: ${sendResponse?.msg || 'ошибка рассылки'}`,
            'err',
          )
        }
      })
      .fail(() => {
        showToast('Акт зарегистрирован, но ссылка не отправлена', 'err')
      })
      .always(() => {
        finishSaveRequest()
        navigateTo('card', response.id)
      })
    return
  }

  showToast('Проект сохранён', 'ok')
  finishSaveRequest()
  navigateTo('card', response.id)
}
// Обработка ошибки сохранения акта
function showSaveError(status, response) {
  const msg = (response && response.msg) || 'Ошибка сохранения'
  if (/уже есть открытый акт начала/.test(msg)) {
    showConfirmBox(
      'Дубль открытого простоя',
      `${msg}. Зарегистрировать акт?`,
      () => saveActToServer(status, true),
    )
  } else {
    showToast(msg, 'err')
  }
}
