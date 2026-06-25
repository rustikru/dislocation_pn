import { sendApiRequest } from '../api.js'

// 'send_mail' — реальная отправка email, 'send_file' — сохранить письмо в папку mail/, false — не отправлять
const APPROVAL_MODE = 'send_file'
import {
  references,
  activeDraft,
  createNewDraft,
  setActiveDraft,
} from '../state.js'
import { navigateTo } from '../app.js'
import {
  escapeHtml,
  formatToInputDate,
  formatToDatabaseDate,
  parseTimeToMilliseconds,
  calculateDuration,
  parseWagonsFromText,
} from '../utils.js'
import { showFormField, showToast, showConfirmBox } from './ui.js'

export function showForm(container) {
  if (!activeDraft) createNewDraft('start')

  //console.log('stationToName:', activeDraft.stationToName)

  $(container).html(`
    <div class="phead">
      <h1>${activeDraft.id ? 'Редактирование акта ГУ-23' : 'Создание акта ГУ-23'}</h1>
      <div class="spacer"></div>
    </div>
    <div class="seg" id="type-switcher" style="margin-bottom:18px"></div>
    <div class="card" id="form-card">
      <div class="cardpad" id="form-body"></div>
      <div class="cardpad" id="form-footer" style="border-top:1px solid var(--line);display:flex;gap:10px;justify-content:flex-end"></div>
    </div>
  `)

  showTypeSwitcher()
  showFormFields()
  showFormButtons()
}

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

function showFormFields() {
  const $body = $('#form-body')

  // Особенность для "акта Окончания простоя"
  // Акт окончания простоя создается только на основе акта на начало простоя
  if (activeDraft.type === 'end') {
    $body.append(`
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
  }

  if (dateRowHtml) {
    $body.append(`<div class="cols">${dateRowHtml}<div></div></div>`)
    // Подключаем маску/обработку из внешних модулей для дат, которые используются в general_function.js
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

  $body.append('<div id="duration-banner-place"></div>')
  showDurationBanner()

  // Строка Цех + Станции
  const deptsHtml = references.departmentsList
    .map(
      (d) =>
        `<option value="${d.CODE}" ${activeDraft.departmentCode === d.CODE ? 'selected' : ''}>${d.CODE}</option>`,
    )
    .join('')
  const stationsHtml = references.stationsList
    .map(
      (s) =>
        `<option value="${s.CODE}" ${activeDraft.stationId === String(s.CODE) ? 'selected' : ''}>${s.NAME}</option>`,
    )
    .join('')
  const stationsFromHtml = references.stationsFromList
    .map(
      (s) =>
        `<option value="${s.CODE}" ${activeDraft.stationFromId === String(s.CODE) ? 'selected' : ''}>${s.NAME}</option>`,
    )
    .join('')

  $body.append(`
    <div class="cols">
      ${showFormField('Цех составления', `<select class="inp" id="sel-dept">${deptsHtml}</select>`, true)}
      ${showFormField('Ст. составления', `<select class="inp" id="sel-station">${stationsHtml}</select>`, true)}
      ${showFormField('Ст. отправления', `<select class="inp" id="sel-stationFrom">${stationsFromHtml}</select>`, true)}
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
      showSignersFields()
    }
  })
  $('#sel-station').on('change', function () {
    activeDraft.stationId = this.value
  })
  $('#sel-stationFrom').on('change', function () {
    activeDraft.stationFromId = this.value
  })

  // Строка Назначение (Autocomplete) + Накладная + Груз
  const cargosHtml = ['']
    .concat(references.cargosList.map((c) => c.NAME || c.CODE))
    .map(
      (c) =>
        `<option value="${c}" ${activeDraft.cargoReference === c ? 'selected' : ''}>${c || '— выберите —'}</option>`,
    )
    .join('')

  $body.append(`
    <div class="cols">
      ${showFormField('Ст. назначения', `<div style="position:relative"><input class="inp" id="auto-stationTo" placeholder="Введите название (мин. 3 символа)…" value="${activeDraft.stationToName}"><div class="dropdown" id="auto-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`, true)}
      
      ${showFormField('Груз', `<select class="inp" id="sel-cargo">${cargosHtml}</select>`, true)}
      
    </div>
  `)

  initStationAutocomplete()
  $('#inp-waybill').on('input', function () {
    activeDraft.waybillNumber = this.value
  })
  $('#sel-cargo').on('change', function () {
    activeDraft.cargoReference = this.value
  })

  // Причина и обстоятельства
  const reasonsHtml = [
    //  добавляем пустой вариант
    `<option value="" ${!activeDraft.reasonId ? 'selected' : ''}>— выберите —</option>`,

    ...references.reasonsList.map((r) => {
      const label = r.NAME || r.CODE
      const isSelected = activeDraft.reasonId === r.CODE ? 'selected' : ''
      return `<option value="${r.CODE}" ${isSelected}>${label}</option>`
    }),
  ].join('')

  $body.append(`
    ${showFormField('Причина составления', `<select class="inp" id="sel-reason">${reasonsHtml}</select>`, true)}
    ${showFormField('Обстоятельства, вызвавшие составление акта', `<textarea class="inp" id="txt-circumstances">${activeDraft.circumstances || ''}</textarea>`, true)}
    ${showFormField('№ накладной', `<input class="inp" id="inp-waybill" value="${activeDraft.waybillNumber || ''}">`)}  `)

  $('#sel-reason').on('change', function () {
    activeDraft.reasonId = this.value
  })
  $('#txt-circumstances').on('change', function () {
    activeDraft.circumstances = this.value
  })

  // Вагоны
  $body.append(`
    <div style="height:6px"></div>
    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Вагоны</label>
    <textarea class="inp" id="txt-wagons" style="min-height:56px" placeholder="Введите номера вагонов: через запятую, пробел, построчно…"></textarea>
    <div style="display:flex;gap:9px;flex-wrap:wrap;margin:10px 0" id="wagon-actions"></div>
    <div id="wagon-summary-place"></div>
    <div id="wagons-table-place"></div>
    <div id="signers-container"></div>
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

function showDurationBanner() {
  const $place = $('#duration-banner-place')
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
        $('#sel-cargo').val(act.CARGO_REF)
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

function initStationAutocomplete() {
  const $inp = $('#auto-stationTo')
  const $dropdown = $('#auto-dropdown')
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
    activeDraft.stationToId = $item.data('code')
    activeDraft.stationToName = $item.data('name')
    $dropdown.hide()
    activeIdx = -1
  }

  $inp.on('input', function () {
    const value = $(this).val().trim()
    clearTimeout(timer)
    activeIdx = -1
    if (value.length < 3) {
      $dropdown.hide().empty()
      if (!value) {
        activeDraft.stationToId = ''
        activeDraft.stationToName = ''
      }
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

function loadWagonsDataFromDislocation() {
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
  }).done((rows) => {
    const records = rows || []
    let foundCount = 0
    //activeDraft.wagons = []
    records.forEach((row) => {
      if (String(row.FOUND) === '1') {
        foundCount++
        activeDraft.wagons.push({
          n: String(row.WAGON_NO),
          owner: row.OWNER,
          kind: row.KIND,
          from: row.ST_FROM,
          to: row.ST_TO,
          cargo: row.CARGO,
          weight: row.WEIGHT,
        })
      }
    })

    activeDraft._summary = {
      req: inputNums.length,
      found: foundCount,
      text: `Запрошено ${inputNums.length} вагонов, найдено ${foundCount}.`,
    }

    showToast(
      `Получено ${foundCount} из ${inputNums.length}`,
      foundCount ? 'ok' : 'err',
    )
    $('#txt-wagons').val('')
    showForm($('#view')[0])
  })
}

function findOpenStayByWagons() {
  const rawText = $('#txt-wagons').val()
  const nums = parseWagonsFromText(rawText)
  if (!nums.length) return showToast('Введите номер вагона', 'err')

  const runSearch = () => {
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
      runSearch()
    })
  } else {
    runSearch()
  }
}

function ClearTableDislocation() {
  $('#wtbl').empty()
}

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
          const dur = calculateDuration(startMs, endMs)
          durationText = `${dur.days} дн. ${dur.hours} ч.`
        }
      }

      return `
      <tr>
        <td class="wn">${wagon.n}</td>
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
          <tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th><th>Вес(кг)</th>${isEndType ? '<th>Простой</th>' : ''}<th></th></tr>
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

function showSignersFields() {
  const $container = $('#signers-container')
    .empty()
    .append(
      '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Подписанты</label>',
    )
  const countNeeded = activeDraft.type === 'other' ? 2 : 3

  const dept = activeDraft.departmentCode
  const ownFiltered = (references.signersOwnList || []).filter(
    (s) => !dept || !s.UNIT || s.UNIT === dept,
  )

  for (let i = 0; i < countNeeded; i++) {
    let signersList = []
    let helpText = ''

    if (activeDraft.type === 'other') {
      signersList = ownFiltered
      helpText = i === 0 ? 'Представитель предприятия' : 'Второй подписант'
    } else {
      if (i < 2) {
        signersList = ownFiltered
        helpText = 'Работник предприятия'
      } else {
        signersList = references.signersRzdList || []
        helpText = 'Работник станции ОАО «РЖД»'
      }
    }

    const signer = activeDraft.signers[i]
    const isManual = signer && signer.manual === true

    const toggleHtml = `
      <div style="display:flex;gap:6px;margin-bottom:6px">
        <button type="button" class="btn sm signer-mode-btn ${!isManual ? 'primary' : ''}" data-slot="${i}" data-mode="ref">Из справочника</button>
        <button type="button" class="btn sm signer-mode-btn ${isManual ? 'primary' : ''}" data-slot="${i}" data-mode="manual">Вручную</button>
      </div>
    `

    let inputHtml = ''
    if (isManual) {
      inputHtml = `
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:5px">
          <input class="inp signer-fio" data-slot="${i}" placeholder="ФИО" value="${escapeHtml(signer.fio || '')}">
          <input class="inp signer-post" data-slot="${i}" placeholder="Должность" value="${escapeHtml(signer.post || '')}">
          <input class="inp signer-org" data-slot="${i}" placeholder="Организация" value="${escapeHtml(signer.org || '')}">
        </div>
      `
    } else {
      const optionsHtml = signersList
        .map(
          (s) =>
            `<option value="${s.ID}" ${signer && String(signer.id) === String(s.ID) ? 'selected' : ''}>${s.FIO} · ${s.POST || ''} · ${s.ORG || ''}</option>`,
        )
        .join('')
      inputHtml = `
        <select class="inp signer-select" data-slot="${i}">
          <option value="">— выберите —</option>
          ${optionsHtml}
        </select>
      `
    }

    $container.append(
      showFormField(
        `Подписант ${i + 1} <span class="muted" style="font-weight:400">· ${helpText}</span>`,
        `<div>${toggleHtml}${inputHtml}</div>`,
      ),
    )
  }

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

  $('.signer-select').on('change', function () {
    const slot = $(this).data('slot')
    const value = this.value
    const pool =
      activeDraft.type === 'other'
        ? ownFiltered
        : slot < 2
          ? ownFiltered
          : references.signersRzdList
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
  })

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

function showFormButtons() {
  $('#form-footer').html(`
    <button class="btn ghost" id="btn-cancel">Отмена</button>
    <button class="btn" id="btn-saveDraft">Сохранить черновик</button>
    <button class="btn primary" id="btn-saveActive">Сохранить и отправить на подписание</button>
  `)

  $('#btn-cancel').on('click', () => {
    setActiveDraft(null)
    navigateTo('archive')
  })
  $('#btn-saveDraft').on('click', () => saveActToServer('draft'))
  $('#btn-saveActive').on('click', () => saveActToServer('active'))
}

function validateForm(checkSigners) {
  const errors = []
  if (!activeDraft.departmentCode) errors.push('Не указан цех')
  if (!activeDraft.reasonId) errors.push('Не указана причина составления')
  if (!String(activeDraft.circumstances).trim())
    errors.push('Не заполнены обстоятельства')
  if (
    !activeDraft.wagons.length &&
    !activeDraft.cargoReference &&
    !activeDraft.waybillNumber
  )
    errors.push('Добавьте вагоны или укажите груз / номер накладной')
  if (!activeDraft.stationId) errors.push('Не указана ст. составления')
  if (!activeDraft.stationFromId) errors.push('Не указана ст. отправления')
  if (!activeDraft.stationToId) errors.push('Не указана ст. назначения')

  if (activeDraft.type === 'start' && !activeDraft.startAt)
    errors.push('Не указана дата начала простоя')
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

  if (checkSigners) {
    const needed = activeDraft.type === 'other' ? 2 : 3
    const filled = activeDraft.signers.filter((s) => {
      if (!s || !s.fio || !s.fio.trim()) return false
      if (s.manual) return !!(s.post && s.post.trim() && s.org && s.org.trim())
      return true
    }).length
    if (filled < needed)
      errors.push(`Указано подписантов ${filled} из ${needed}`)
  }
  return errors
}

function saveActToServer(status, skipWarning = false) {
  const errors =
    status === 'active'
      ? validateForm(true)
      : activeDraft.departmentCode
        ? []
        : ['Не указан цех']
  if (errors.length) return showToast(errors[0], 'err')

  const payload = {
    id: activeDraft.id || 0,
    type: activeDraft.type,
    status: status,
    dept: activeDraft.departmentCode,
    station: activeDraft.stationId || '',
    st_from: activeDraft.stationFromId || '',
    st_to: activeDraft.stationToId || '',
    waybill_no: activeDraft.waybillNumber || '',
    cargo_ref: activeDraft.cargoReference || '',
    reason: activeDraft.reasonId,
    circumstances: activeDraft.circumstances,
    start_at: formatToDatabaseDate(activeDraft.startAt),
    end_at: formatToDatabaseDate(activeDraft.endAt),
    linked_start_id: activeDraft.linkedStartId || '',
    wagons: JSON.stringify(activeDraft.wagons),
    signers: JSON.stringify(activeDraft.signers.filter(Boolean)),
    force: skipWarning ? 'Y' : 'N',
  }

  sendApiRequest('gu23_save_act', payload).done((response) => {
    if (response && response.ok) {
      setActiveDraft(null)
      if (status === 'active' && APPROVAL_MODE) {
        sendApiRequest('gu23_send_approval', { act_id: response.id, mode: APPROVAL_MODE }).done(
          (approvalResp) => {
            const approvalMsg =
              approvalResp && approvalResp.ok
                ? approvalResp.msg || 'Письма отправлены'
                : approvalResp && approvalResp.msg
                  ? 'Письма: ' + approvalResp.msg
                  : 'Письма не отправлены'
            showToast(
              `Акт зарегистрирован${response.number ? ', № ' + response.number : ''}. ${approvalMsg}`,
              'ok',
            )
            navigateTo('card', response.id)
          },
        )
      } else {
        const msg =
          status === 'active'
            ? `Акт зарегистрирован${response.number ? ', № ' + response.number : ''}`
            : 'Черновик сохранён'
        showToast(msg, 'ok')
        navigateTo('card', response.id)
      }
    } else {
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
  })
}
