import { sendApiRequest } from '../api.js'
import { navigateTo } from '../app.js'
import { escapeHtml, formatDateTime, formatToInputDate } from '../utils.js'
import {
  showStatusChip,
  showTypeChip,
  showToast,
  showConfirmBox,
  showPromptBox,
  showTypeName,
  showStatusName,
} from './ui.js'
import { setActiveDraft } from '../state.js'

export function showCard(container) {
  const currentId = $('#view').data('selected-id')

  sendApiRequest('gu23_get_act', { id: currentId }).done((data) => {
    $(container).empty()
    if (!data || !data.ok) {
      $(container).append('<div class="empty-state">Акт не найден</div>')
      return
    }
    buildCardView(container, data)
  })
}

function buildCardView(container, data) {
  const act = data.act
  //console.log(act)

  $(container).html(`
    <div class="phead">
      <button class="btn sm ghost" id="btn-back-to-archive">Назад</button>
      <h1 style="font-family:var(--mono);font-size:18px; margin-left: 16px;">${act.ACT_NUMBER}</h1>
      <div class="spacer"></div>
    </div>
    <div id="card-toolbar" style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px"></div>
    <div id="annulled-banner-place"></div>
    <div class="grid-layout" style="display:grid;grid-template-columns:1fr 320px;gap:16px;align-items:start">
      <div id="card-left-column"></div>
      <div id="card-right-column"></div>
    </div>
  `)

  $('#btn-back-to-archive').on('click', () => navigateTo('archive'))

  showToolbarButtons(act, data)
  showDetailsBlock(act)
  showWagonsBlock(data.wagons)
  showSignersBlock(act, data.signers, data.approvals || [], data.myApproval || 'none')
  showAttachmentsBlock(act, data.files)
  showHistoryBlock(data.history)
}

function showToolbarButtons(act, data) {
  const $toolbar = $('#card-toolbar')

  if (act.STATUS === 'draft') {
    const $editBtn = $('<button class="btn primary">Редактировать</button>')
    const $delBtn = $('<button class="btn danger">Удалить черновик</button>')

    $editBtn.on('click', () => editDraftAct(data))
    $delBtn.on('click', () => deleteDraftAct(act))

    $toolbar.append($editBtn, $delBtn)
  }

  if (act.STATUS === 'active' || act.STATUS === 'closed') {
    const $annulBtn = $('<button class="btn danger">Аннулировать</button>')
    $annulBtn.on('click', () => annulActiveAct(act))
    $toolbar.append($annulBtn)
  }

  // Кнопка скачивания DOCX доступна для всех статусов, кроме черновика
  if (act.STATUS !== 'draft') {
    const $docxBtn = $(`
        <a class="btn report-word" target="_blank" title="Скачать акт">
            <img src="/img/ms_word.svg" alt="Word" width="18" height="18" style="flex-shrink: 0;">
        </a>
    `)
    $docxBtn.attr('href', 'report/report.php?id=' + act.ID)
    $toolbar.append($docxBtn)
  }

  if (act.STATUS === 'annulled' && act.ANNUL_REASON) {
    $('#annulled-banner-place').html(`
      <div class="banner err"><b>Аннулирован.</b> Причина: ${escapeHtml(act.ANNUL_REASON)}</div>
    `)
  }
}

function showDetailsBlock(act) {
  const rows = [
    { l: '№ Акта', v: act.ACT_NUMBER },
    { l: 'Тип акта', v: showTypeName(act.ACT_TYPE) },
    { l: 'Статус акта', v: showStatusName(act.STATUS) },
    { l: ' ', v: ' ' },
    { l: ' ', v: ' ' },
    { l: 'Цех составления', v: act.DEPT },
    { l: 'Ст. составления', v: act.STATION },
    { l: 'Ст. отправления', v: act.ST_FROM },
    { l: 'Ст. назначения', v: act.ST_TO },
    { l: 'Груз', v: act.CARGO_REF },
    { l: 'Причина', v: act.REASON_NAME },
    { l: 'Дата составления', v: formatDateTime(act.CREATED_AT) },
  ]

  let dlHtml = rows
    .filter((r) => r.v)
    .map((r) => `<dt>${r.l}</dt><dd>${escapeHtml(r.v)}</dd>`)
    .join('')

  if (act.ACT_TYPE !== 'other') {
    dlHtml += `<dt>Начало простоя</dt><dd class="mono">${formatDateTime(act.START_AT)}</dd>`
  }
  if (act.ACT_TYPE === 'end') {
    dlHtml += `
      <dt>Окончание простоя</dt><dd class="mono">${formatDateTime(act.END_AT)}</dd>
      <dt>Длительность</dt>
      <dd><b class="mono" style="color:var(--sign)">${act.DUR_DAYS || 0} дн. ${act.DUR_HOURS || 0} ч.</b> · всего ${act.DUR_TOTAL_H || 0} ч. · ${act.CAL_DAYS || 0} кал. дн.</dd>
    `
    if (act.LINKED_START_ID) {
      dlHtml += `<dt>Связан с актом начала</dt><dd><a href="#" class="link-act" data-linked="${act.LINKED_START_ID}">${escapeHtml(act.LINKED_START_NUMBER || '—')}</a></dd>`
    }
  }

  dlHtml += `<dt>Обстоятельства</dt><dd>${escapeHtml(act.CIRCUMSTANCES)}</dd>`
  dlHtml += `<dt>Создал</dt><dd>${escapeHtml(act.CREATED_BY)}</dd>`

  $('#card-left-column')
    .append(
      `
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>Реквизиты акта</b></div>
      <dl class="kv" style="padding:16px 18px">${dlHtml}</dl>
    </div>
  `,
    )
    .find('.link-act')
    .on('click', function (e) {
      e.preventDefault()
      navigateTo('card', $(this).data('linked'))
    })
}

function showWagonsBlock(wagons) {
  const rowsHtml = wagons
    .map(
      (w) => `
    <tr>
      <td class="num" style="color:var(--signal);font-weight:600">${escapeHtml(w.WAGON_NO)}</td>
      <td>${escapeHtml(w.OWNER || '—')}</td>
      <td>${escapeHtml(w.KIND || '—')}</td>
      <td>${escapeHtml(w.ST_FROM || '—')}</td>
      <td>${escapeHtml(w.ST_TO || '—')}</td>
      <td>${escapeHtml(w.CARGO || '—')}</td>
      <td>${escapeHtml(w.WEIGHT || '—')}</td>
      
      <td class="num"></td>
    </tr>
  `,
    )
    .join('')

  $('#card-left-column').append(`
    <div class="card" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>Вагоны (${wagons.length})</b></div>
      <div style="overflow:auto;max-height:360px">
        <table class="tbl">
          <thead><tr><th>№ вагона</th><th>Собственник</th><th>Род</th><th>Ст. отпр.</th><th>Ст. назн.</th><th>Груз</th><th>Вес(кг)</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `)
}

function showSignersBlock(act, signers, approvals, myApproval) {
  const statusBadge = (status) => {
    if (status === 'approved') return '<span style="color:var(--ok,#5a7a60);font-size:11px">✓ Согласован</span>'
    if (status === 'rejected') return '<span style="color:var(--danger,#9e5b52);font-size:11px">✕ Отклонён</span>'
    if (status === 'pending')  return '<span style="color:#b08000;font-size:11px">⏳ Ожидает</span>'
    return ''
  }

  // Строим map: approver_id → approval record
  const approvalMap = {}
  approvals.forEach((a) => { approvalMap[a.APPROVER_ID] = a })

  const listHtml = signers.length
    ? signers.map((s) => {
        const approval = s.USER_ID ? approvalMap[s.USER_ID] : null
        let badge = ''
        if (approval) {
          if (approval.STATUS === 'approved') badge = ' <span style="color:var(--ok,#5a7a60);font-size:11px">✓ Подписано</span>'
          else if (approval.STATUS === 'rejected') badge = ' <span style="color:var(--danger,#9e5b52);font-size:11px">✕ Отклонено</span>'
          else if (approval.STATUS === 'pending')  badge = ' <span style="color:#b08000;font-size:11px">⏳ Ожидает</span>'
        }
        return `
        <div class="signrow">
          <div style="flex:1">
            <div><b>${escapeHtml(s.FIO)}</b>${badge}</div>
            <div class="muted" style="font-size:11.5px">${s.POST || ''} · ${s.ORG || ''}</div>
          </div>
        </div>`
      }).join('')
    : '<div class="muted">Подписанты не назначены</div>'

  // Баннер "подписать" — только если текущему пользователю прислали запрос (pending)
  let myBannerHtml = ''
  if (act.STATUS === 'active' && myApproval === 'pending') {
    const isPending = myApproval === 'pending'
    myBannerHtml = `
      <div id="my-approval-banner" style="background:#f0f4ff;border-radius:6px;padding:12px 14px;margin-bottom:12px">
        <div style="font-size:13px;margin-bottom:8px;color:#1d4ed8">
          ${isPending ? '⏳ Ожидается ваше согласование' : 'Вы указаны как подписант'}
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn sm" id="btn-sign-approve" style="background:#5a7a60;color:#fff">✓ Согласовать</button>
          <button class="btn sm" id="btn-sign-reject"  style="background:#9e5b52;color:#fff">✕ Отклонить</button>
        </div>
        <div id="reject-reason-box" style="display:none;margin-top:8px">
          <textarea id="reject-reason-txt" placeholder="Причина отклонения…"
            style="width:100%;min-height:60px;padding:6px 10px;border:1px solid var(--line2,#ddd);border-radius:5px;font-size:13px;resize:vertical"></textarea>
          <button class="btn sm" id="btn-sign-reject-confirm" style="margin-top:6px;background:#9e5b52;color:#fff">Подтвердить отклонение</button>
        </div>
      </div>`
  } else if (myApproval === 'approved') {
    myBannerHtml = '<div style="color:#5a7a60;font-size:13px;margin-bottom:10px">✓ Вы согласовали этот акт</div>'
  } else if (myApproval === 'rejected') {
    myBannerHtml = '<div style="color:#9e5b52;font-size:13px;margin-bottom:10px">✕ Вы отклонили этот акт</div>'
  }

  $('#card-right-column').append(`
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>Подписанты</b></div>
      <div class="cardpad">
        ${myBannerHtml}
        ${listHtml}
      </div>
    </div>
  `)

  if (act.STATUS === 'active' && myApproval === 'pending') {
    $('#btn-sign-approve').on('click', () => submitInAppDecision(act.ID, 'approved', ''))

    $('#btn-sign-reject').on('click', () => {
      const box = $('#reject-reason-box')
      box.toggle()
      if (box.is(':visible')) $('#reject-reason-txt').focus()
    })

    $('#btn-sign-reject-confirm').on('click', () => {
      const reason = $('#reject-reason-txt').val().trim()
      if (!reason) { showToast('Укажите причину', 'err'); return }
      submitInAppDecision(act.ID, 'rejected', reason)
    })
  }
}

function submitInAppDecision(actId, decision, comment) {
  sendApiRequest('gu23_approve_in_app', { act_id: actId, decision, comment }).done((resp) => {
    if (resp && resp.ok) {
      showToast(resp.msg || 'Готово', 'ok')
      navigateTo('card', actId)
    } else {
      showToast((resp && resp.msg) || 'Ошибка', 'err')
    }
  })
}

function showAttachmentsBlock(act, files) {
  const isAnnulled = act.STATUS === 'annulled'

  const headHtml = `
    <div class="cardpad" style="border-bottom:1px solid var(--line);display:flex;align-items:center">
      <b>Приложения</b>
      <div style="flex:1"></div>
      ${!isAnnulled ? `<label class="btn sm" id="lbl-upload">＋ Файл<input type="file" multiple id="file-input-field" style="display:none" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></label>` : ''}
    </div>
  `

  const bodyHtml = files.length
    ? files
        .map((file) => {
          const isImage = /(png|jpe?g|gif|bmp|webp)$/i.test(file.FILE_EXT || '')
          return `
      <div style="display:flex;gap:9px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line)">
        ${isImage ? `<img src="get_file.php?inline=1&id=${file.ID}" class="img-preview" data-id="${file.ID}" style="width:38px;height:38px;object-fit:cover;border-radius:5px;cursor:pointer">` : ``}
        <div style="flex:1;font-size:12.5px">
          <a href="get_file.php?id=${file.ID}">${escapeHtml(file.FILE_NAME)}</a>
          <div class="muted" style="font-size:11px">${formatDateTime(file.CREATED_AT)} · ${escapeHtml(file.CREATED_BY || '')}</div>
        </div>
        ${!isAnnulled ? `<button class="delx file-delete-btn" data-id="${file.ID}">×</button>` : ''}
      </div>
    `
        })
        .join('')
    : '<div class="muted" style="font-size:12.5px">Фото и файлы не прикреплены.</div>'

  const $block = $(`
    <div class="card" style="margin-top:16px">
      ${headHtml}
      <div class="cardpad">${bodyHtml}</div>
    </div>
  `)

  $('#card-right-column').append($block)

  // Навешивание событий
  $('#file-input-field').on('change', function () {
    uploadFilesToServer(act.ID, this.files)
  })
  $('.img-preview').on('click', function () {
    window.open(`get_file.php?inline=1&id=${$(this).data('id')}`)
  })
  $('.file-delete-btn').on('click', function () {
    deleteAttachedFile($(this).data('id'), act.ID)
  })
}

function showHistoryBlock(history) {
  const itemsHtml = history
    .map(
      (log) => `
    <li>
      <span class="t">${formatDateTime(log.TS)}</span>
      <span>${escapeHtml(log.TXT)} ${log.USR ? `· <span class="muted">${escapeHtml(log.USR)}</span>` : ''}</span>
    </li>
  `,
    )
    .join('')

  $('#card-right-column').append(`
    <div class="card" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>История</b></div>
      <div class="hist-container">
        <ul class="hist" style="padding:0 18px">${itemsHtml}</ul>
      </div>
    </div>
  `)
}

function editDraftAct(data) {
  const act = data.act
  //console.log('ST_TO => :', act.ST_TO)
  //console.log('ST_TO_ID =>:', act.ST_TO_ID)
  setActiveDraft({
    id: act.ID,
    type: act.ACT_TYPE,
    status: 'draft',
    departmentCode: act.DEPT,
    stationId: String(act.STATION_ID || ''),
    stationFromId: String(act.ST_FROM_ID || ''),
    stationFromName: act.ST_FROM || '',
    stationToId: String(act.ST_TO_ID || ''),
    stationToName: act.ST_TO || '',
    waybillNumber: '',
    cargoReference: act.CARGO_REF || '',
    reasonId: String(act.REASON_ID || ''),
    reasonName: act.REASON_NAME,
    circumstances: act.CIRCUMSTANCES || '',
    startAt: formatToInputDate(act.START_AT),
    endAt: formatToInputDate(act.END_AT),
    linkedStartId: act.LINKED_START_ID || '',
    linkedStartNumber: act.LINKED_START_NUMBER || '',
    wagons: data.wagons.map((w) => ({
      n: w.WAGON_NO,
      owner: w.OWNER,
      kind: w.KIND,
      from: w.ST_FROM,
      to: w.ST_TO,
      cargo: w.CARGO,
    })),
    signers: data.signers.map((s) => ({
      id: s.SIGNER_REF_ID || null,
      fio: s.FIO,
      post: s.POST,
      org: s.ORG,
      manual: !s.SIGNER_REF_ID,
    })),
    _summary: null,
    _openStarts: null,
  })
  navigateTo('new')
}

function deleteDraftAct(act) {
  showConfirmBox(
    'Удаление черновика',
    `Удалить черновик ${act.ACT_NUMBER}? Действие необратимо.`,
    () => {
      sendApiRequest('gu23_del_act', { id: act.ID }).done((response) => {
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

function annulActiveAct(act) {
  showPromptBox(
    'Аннулирование акта',
    'Укажите причину аннулирования:',
    (reason) => {
      if (!reason) return
      sendApiRequest('gu23_annul_act', { id: act.ID, reason: reason }).done(
        (response) => {
          if (response && response.ok) {
            showToast('Акт аннулирован', 'ok')
            navigateTo('card', act.ID)
          } else {
            showToast((response && response.msg) || 'Ошибка', 'err')
          }
        },
      )
    },
  )
}

function sendForApproval(act) {
  showConfirmBox(
    'Отправить на согласование',
    'Запросить электронное согласование у подписантов акта?',
    () => {
      sendApiRequest('gu23_send_approval', { act_id: act.ID }).done((response) => {
        if (response && response.ok) {
          showToast(response.msg || 'Письма отправлены', 'ok')
          navigateTo('card', act.ID)
        } else {
          showToast((response && response.msg) || 'Ошибка отправки', 'err')
        }
      })
    },
  )
}

function uploadFilesToServer(actId, files) {
  if (!files || !files.length) return
  const formData = new FormData()
  formData.append('ajax_action', 'gu23_upload_file')
  formData.append('act_id', actId)

  for (let i = 0; i < files.length; i++) {
    formData.append(`file${i}`, files[i])
  }

  $.ajax({
    url: '/data.php',
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    dataType: 'json',
  }).done((response) => {
    if (response && response.ok) showToast('Файлы загружены', 'ok')
    else showToast('Часть файлов не загружена', 'err')
    navigateTo('card', actId)
  })
}

function deleteAttachedFile(fileId, actId) {
  showConfirmBox('Удаление файла', 'Удалить приложение?', () => {
    sendApiRequest('gu23_del_file', { file_id: fileId }).done((response) => {
      if (response && response.ok) {
        showToast('Файл удалён', 'ok')
        navigateTo('card', actId)
      } else {
        showToast((response && response.msg) || 'Ошибка', 'err')
      }
    })
  })
}
