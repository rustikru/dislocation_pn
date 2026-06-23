import { sendApiRequest } from '../api.js'
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
import { renderFormField, showToast, showConfirmBox } from './ui.js'

export function showForm(container) {
  if (!activeDraft) createNewDraft('start')

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

  renderTypeSwitcher()
  renderFormFields()
  renderFormButtons()
}

function renderTypeSwitcher() {
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

function renderFormFields() {
  const $body = $('#form-body')

  // Особенность для акта Окончания простоя
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
    dateRowHtml = renderFormField(
      'Дата и время начала простоя',
      `<input class="inp datetime-inp" id="inp-startAt" placeholder="ддммгг ччмм" value="${activeDraft.startAt}">`,
      true,
    )
  } else if (activeDraft.type === 'end') {
    dateRowHtml = renderFormField(
      'Дата и время окончания простоя',
      `<input class="inp datetime-inp" id="inp-endAt" placeholder="ддммгг ччмм" value="${activeDraft.endAt}">`,
      true,
    )
  }

  if (dateRowHtml) {
    $body.append(`<div class="cols">${dateRowHtml}<div></div></div>`)
    // Подключаем твою маску/обработку из внешних модулей
    if (typeof init_date_time_input === 'function') {
      init_date_time_input($('.datetime-inp'))
    }

    // Слушатели на дату
    $('#inp-startAt').on('blur', function () {
      activeDraft.startAt = validateAndGetDate($(this))
    })
    $('#inp-endAt').on('blur', function () {
      activeDraft.endAt = validateAndGetDate($(this))
      renderDurationBanner()
    })
  }

  $body.append('<div id="duration-banner-place"></div>')
  renderDurationBanner()

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
      ${renderFormField('Цех составления', `<select class="inp" id="sel-dept">${deptsHtml}</select>`, true)}
      ${renderFormField('Ст. составления', `<select class="inp" id="sel-station">${stationsHtml}</select>`, true)}
      ${renderFormField('Ст. отправления', `<select class="inp" id="sel-stationFrom">${stationsFromHtml}</select>`, true)}
    </div>
  `)

  // Привязка селектов к модели
  $('#sel-dept').on('change', function () {
    activeDraft.departmentCode = this.value
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
      ${renderFormField('Ст. назначения', `<div style="position:relative"><input class="inp" id="auto-stationTo" placeholder="Введите название (мин. 3 символа)…" value="${activeDraft.stationToName}"><div class="dropdown" id="auto-dropdown" style="display:none;position:absolute;z-index:99;background:var(--surface);border:1px solid var(--line);width:100%;max-height:200px;overflow-y:auto;"></div></div>`)}
      ${renderFormField('№ накладной', `<input class="inp" id="inp-waybill" value="${activeDraft.waybillNumber || ''}">`)}
      ${renderFormField('Груз', `<select class="inp" id="sel-cargo">${cargosHtml}</select>`)}
    </div>
  `)

  initStationAutocomplete()
  $('#inp-waybill').on('change', function () {
    activeDraft.waybillNumber = this.value
  })
  $('#sel-cargo').on('change', function () {
    activeDraft.cargoReference = this.value
  })

  // Причина и обстоятельства
  const reasonsHtml = ['']
    .concat(references.reasonsList.map((r) => r.NAME || r.CODE))
    .map(
      (r) =>
        `<option value="${r}" ${activeDraft.reason === r ? 'selected' : ''}>${r || '— выберите —'}</option>`,
    )
    .join('')

  $body.append(`
    ${renderFormField('Причина составления', `<select class="inp" id="sel-reason">${reasonsHtml}</select>`, true)}
    ${renderFormField('Обстоятельства, вызвавшие составление акта', `<textarea class="inp" id="txt-circumstances">${activeDraft.circumstances || ''}</textarea>`, true)}
  `)

  $('#sel-reason').on('change', function () {
    activeDraft.reason = this.value
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
  `)

  renderWagonActions()
  renderWagonsTable()
}

function validateAndGetDate($inp) {
  const value = $inp.val()
  const isValid =
    /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(value) &&
    !$inp.hasClass('red_bckg_color')
  return isValid ? value : ''
}

function renderDurationBanner() {
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
        `<option value="${act.ID}" ${isSelected ? 'selected' : ''}>${act.ACT_NUMBER} · ${wagonNumbers} · ${act.REASON}</option>`,
      )
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

function applySelectedStartAct(id) {
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
  activeDraft.departmentCode = selectedAct.CEX
  activeDraft.stationId = String(selectedAct.STATION_ID || '')
  activeDraft.stationFromId = String(selectedAct.ST_FROM_ID || '')
  activeDraft.stationFromName = selectedAct.ST_FROM || ''
  activeDraft.stationToId = String(selectedAct.ST_TO_ID || '')
  activeDraft.stationToName = selectedAct.ST_TO || ''
  activeDraft.reason = selectedAct.REASON
  activeDraft.wagons = (selectedAct.WAGONS || []).map((w) => ({
    n: w.WAGON_NO,
    owner: w.OWNER,
    kind: w.KIND,
    from: w.ST_FROM,
    to: w.ST_TO,
    cargo: w.CARGO,
    weight: w.WEIGHT,
  }))

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

  $inp.on('input', function () {
    const value = $(this).val().trim()
    clearTimeout(timer)
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
            `<div style="padding:8px 12px;cursor:pointer;font-size:13px">${row.NAME}</div>`,
          )
          $item.on('click', () => {
            $inp.val(row.NAME)
            activeDraft.stationToId = String(row.CODE)
            activeDraft.stationToName = row.NAME
            $dropdown.hide()
          })
          $dropdown.append($item)
        })
        $dropdown.show()
      })
    }, 300)
  })

  $inp.on('blur', () => setTimeout(() => $dropdown.hide(), 200))
}

function renderWagonActions() {
  const $actions = $('#wagon-actions').empty()

  if (activeDraft.type === 'start' || activeDraft.type === 'other') {
    const $btn = $(
      '<button class="btn sm primary">Заполнить данные из Дислокации</button>',
    )
    $btn.on('click', () => loadWagonsDataFromDislocation())
    $actions.append($btn)
  }

  if (activeDraft.type === 'end') {
    const $btn = $('<button class="btn sm">Найти открытый простой</button>')
    $btn.on('click', () => findOpenStayByWagons())
    $actions.append($btn)
  }
}

function loadWagonsDataFromDislocation() {
  const rawText = $('#txt-wagons').val()
  const inputNums = parseWagonsFromText(rawText)
  const finalNums = inputNums.length
    ? inputNums
    : activeDraft.wagons.map((w) => w.n)

  if (!finalNums.length) return showToast('Введите номера вагонов', 'err')

  sendApiRequest('gu23_get_wagon_info', {
    wagons: JSON.stringify(finalNums),
    waybill_no: activeDraft.waybillNumber || '',
  }).done((rows) => {
    const records = rows || []
    let foundCount = 0

    records.forEach((row) => {
      let wagon = activeDraft.wagons.find((x) => x.n === row.WAGON_NO)
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
        activeDraft.wagons.push(wagon)
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

    activeDraft._summary = {
      req: finalNums.length,
      found: foundCount,
      text: `Запрошено ${finalNums.length} вагонов, найдено ${foundCount}.`,
    }

    showToast(
      `Получено ${foundCount} из ${finalNums.length}`,
      foundCount ? 'ok' : 'err',
    )
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
      applySelectedStartAct(ids[0])
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

function renderWagonsTable() {
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
        ${isEndType ? `<td class="dur">${durationText}</td>` : ''}
        <td><button class="delx" data-idx="${idx}">×</button></td>
      </tr>
    `
    })
    .join('')

  const tableHtml = `
    <div style="overflow:auto;border:1px solid var(--line);border-radius:7px">
      <table class="wtbl">
        <thead>
          <tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th>${isEndType ? '<th>Простой</th>' : ''}<th></th></tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="hint" style="margin-top:6px">Вагонов в акте: ${activeDraft.wagons.length}.</div>
    <div style="height:14px"></div>
    <div id="signers-container"></div>
  `

  $place
    .html(tableHtml)
    .find('.delx')
    .on('click', function () {
      activeDraft.wagons.splice($(this).data('idx'), 1)
      renderWagonsTable()
    })

  renderSignersFields()
}

function renderSignersFields() {
  const $container = $('#signers-container')
    .empty()
    .append(
      '<label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Подписанты</label>',
    )
  const countNeeded = activeDraft.type === 'other' ? 2 : 3

  for (let i = 0; i < countNeeded; i++) {
    let signersList = []
    let helpText = ''

    if (activeDraft.type === 'other') {
      signersList = references.signersOwnList || []
      helpText = i === 0 ? 'Представитель предприятия' : 'Второй подписант'
    } else {
      if (i < 2) {
        signersList = references.signersOwnList || []
        helpText = 'Работник предприятия'
      } else {
        signersList = references.signersRzdList || []
        helpText = 'Работник станции ОАО «РЖД»'
      }
    }

    const currentSigner = activeDraft.signers[i]
    const optionsHtml = signersList
      .map(
        (s) => `
      <option value="${s.ID}" ${currentSigner && String(currentSigner.id) === String(s.ID) ? 'selected' : ''}>${s.FIO} · ${s.POST || ''} · ${s.ORG || ''}</option>
    `,
      )
      .join('')

    const fieldHtml = renderFormField(
      `Подписант ${i + 1} <span class="muted" style="font-weight:400">· ${helpText}</span>`,
      `
      <select class="inp signer-select" data-slot="${i}">
        <option value="">— выберите —</option>
        ${optionsHtml}
      </select>
    `,
    )

    $container.append(fieldHtml)
  }

  $('.signer-select').on('change', function () {
    const slot = $(this).data('slot')
    const value = this.value
    let pool =
      activeDraft.type === 'other'
        ? references.signersOwnList
        : slot < 2
          ? references.signersOwnList
          : references.signersRzdList
    const matched = pool.find((x) => String(x.ID) === value)

    activeDraft.signers[slot] = matched
      ? {
          id: matched.ID,
          fio: matched.FIO,
          post: matched.POST,
          org: matched.ORG,
        }
      : null
  })
}

function renderFormButtons() {
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
  if (!activeDraft.reason) errors.push('Не указана причина составления')
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
    const filled = activeDraft.signers.filter(Boolean).length
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
    cex: activeDraft.departmentCode,
    station: activeDraft.stationId || '',
    st_from: activeDraft.stFromId || '',
    st_to: activeDraft.stationToId || '',
    waybill_no: activeDraft.waybillNumber || '',
    cargo_ref: activeDraft.cargoReference || '',
    reason: activeDraft.reason,
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
      showToast(
        status === 'draft'
          ? 'Черновик сохранён'
          : `Акт зарегистрирован ${response.number ? ', № ' + response.number : ''}`,
        'ok',
      )
      setActiveDraft(null)
      navigateTo('card', response.id)
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
