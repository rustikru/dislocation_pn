import { sendApiRequest } from './api.js'
import { navigateTo } from './app.js'
import { escapeHtml, formatDateTime, formatToInputDate } from './utils.js'
import {
  showTypeChip,
  showToast,
  showConfirmBox,
  showPromptBox,
  showTypeName,
  showStatusName,
} from './ui.js'
import { setActiveDraft, hasPerm, isAdmin } from './state.js'

const activeUploads = new Set()

export function showCard(container) {
  const currentId = $('#view').data('selected-id')

  sendApiRequest('gu23_get_act', { id: currentId }).done((data) => {
    $(container).empty()
    if (!data || !data.ok) {
      $(container).append('<div class="empty-state">Акт не найден</div>')
      return
    }
    $(container).load('pages/card.php', () => {
      showCardView(data)
    })
  })
}

function showCardView(data) {
  const act = data.act

  $('#card-act-number').text(act.ACT_NUMBER)
  $('#btn-back-to-archive').on('click', () => navigateTo('archive'))

  showDetailsBlock(act)
  showActionsMenu(act, data)
  showWagonsBlock(data.wagons)
  showSignersBlock(
    act,
    data.signers,
    data.approvals || [],
    data.myApproval || 'none',
    !!data.isUserSigner,
    data.currentUserId || 0,
  )
  showAttachmentsBlock(
    act,
    data.files,
    !!data.canChangeFiles,
    !!data.canDeleteFiles,
    !!data.isAdmin,
  )
  showHistoryBlock(data.history)
}

function showActionsMenu(act, data) {
  const $menu = $('#actions-menu')
  let count = 0

  // helper: пункт меню
  const addItem = (label, onClick, variant = '') => {
    const $item = $(
      `<button class="menu-item${variant ? ' ' + variant : ''}">${label}</button>`,
    )
    $item.on('click', () => {
      closeActionsMenu()
      onClick()
    })
    $menu.append($item)
    count++
  }

  // --- черновик: редактирование / удаление ---
  // Редактировать и удалять можно только Проект (draft).
  if (act.STATUS === 'draft' && hasPerm('EDIT_OWN_ACT') && data.canEditDraft) {
    addItem('Редактировать', () => editDraftAct(data))
    addItem('Удалить проект', () => deleteDraftAct(act), 'danger')
  }
  //  Правка акта «на подписании» администратором — пока отключено.
  // gu23_save_act). ограничить типом: добавить && act.ACT_TYPE === 'other'.
  // else if (act.STATUS === 'active' && isAdmin()) {
  //   addItem('Редактировать', () => editDraftAct(data))
  // }

  // --- рассылка ссылок на подписание ---
  if (
    act.STATUS === 'active' &&
    hasPerm('SEND_APPROVAL') &&
    data.canSendApprovalLinks &&
    data.signers &&
    data.signers.length
  ) {
    const approvalMap = {}
    ;(data.approvals || []).forEach((a) => {
      approvalMap[a.APPROVER_ID] = a
    })
    const hasUnsigned = data.signers.some((s) => {
      if (s.STYPE === 'rzd' || !s.USER_ID) return false
      const appr = approvalMap[s.USER_ID]
      return !appr || appr.STATUS !== 'approved'
    })

    if (hasUnsigned) {
      addItem('Рассылка ссылок на подписание', () =>
        resendApprovalLinks(act, data.signers, data.approvals || []),
      )
    }
  }

  // --- закрытие акта окончания ---
  if (
    (act.STATUS === 'active' || act.STATUS === 'signed') &&
    (act.ACT_TYPE === 'end' || act.ACT_TYPE === 'other') &&
    hasPerm('CLOSE_ACT')
  ) {
    addItem('Закрыть акт', () => closeAct(act))
  }

  // --- аннулирование ---
  if (
    (act.STATUS === 'active' ||
      act.STATUS === 'signed' ||
      act.STATUS === 'closed') &&
    hasPerm('ANNUL_ACT')
  ) {
    addItem('Аннулировать акт', () => annulActiveAct(act), 'danger')
  }

  // показываем меню, только если есть хотя бы одно действие
  if (count > 0) {
    $('#actions-dd').show()
    $('#btn-actions').on('click', (e) => {
      e.stopPropagation()
      $('#actions-menu').toggle()
    })
    // закрытие по клику вне меню
    $(document)
      .off('click.actionsMenu')
      .on('click.actionsMenu', () => closeActionsMenu())
  }

  if (act.STATUS === 'annulled' && act.ANNUL_REASON) {
    $('#annulled-banner-place').html(`
      <div class="banner err"><b>Аннулирован.</b> Причина: ${escapeHtml(act.ANNUL_REASON)}</div>
    `)
  }
}

function closeActionsMenu() {
  $('#actions-menu').hide()
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
  ]

  let dlHtml = rows
    .filter((r) => r.v)
    .map((r) => `<dt>${r.l}</dt><dd>${escapeHtml(r.v)}</dd>`)
    .join('')

  if (act.ACT_TYPE !== 'other') {
    dlHtml += `<dt>Начало простоя</dt><dd class="mono">${formatDateTime(act.START_AT)}</dd>`
  }
  if (act.ACT_TYPE === 'other') {
    dlHtml += `<dt>Начало составления акта</dt><dd class="mono">${formatDateTime(act.START_AT)}</dd>`
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
  dlHtml += `<dt>Дата создания</dt><dd>${formatDateTime(act.CREATED_AT)}</dd>`
  dlHtml += `<dt>Создал</dt><dd>${escapeHtml(act.CREATED_BY)}</dd>`

  const docxLink = `report/report.php?id=${act.ID}`
  const pdfLink = `report/report.php?id=${act.ID}&format=pdf`

  const wordButton = `
    <a class="btn report-word" id="btn-download" target="_blank" title="Скачать акт в docx" href="${docxLink}">
      <img src="/img/ms_word.svg" alt="Word" width="18" height="18" style="flex-shrink:0">
    </a>
  `

  const pdfButton = `
    <a class="btn report-pdf" target="_blank" title="Открыть акт в PDF" href="${pdfLink}">
      <img src="/img/ms_pdf.svg" alt="PDF" width="18" height="18" style="flex-shrink:0">
    </a>
  `

  const downloadHtml =
    act.STATUS !== 'draft' &&
    act.STATUS !== 'annulled' &&
    act.STATUS !== 'rejected'
      ? wordButton + pdfButton
      : ''

  $('#card-report-buttons').html(downloadHtml)
  $('#card-details-list')
    .html(dlHtml)
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
      <td>${escapeHtml(w.WAYBILL_NO || '—')}</td>
      <td>${escapeHtml(w.OWNER || '—')}</td>
      <td>${escapeHtml(w.KIND || '—')}</td>
      <td>${escapeHtml(w.ST_FROM || '—')}</td>
      <td>${escapeHtml(w.ST_TO || '—')}</td>
      <td>${escapeHtml(w.CARGO || '—')}</td>
      <td>${escapeHtml(w.WEIGHT || '—')}</td>
      
    </tr>
  `,
    )
    .join('')

  $('#card-wagons-title').text(`Вагоны (${wagons.length})`)
  $('#card-wagons-rows').html(rowsHtml)
}

function showSignersBlock(
  act,
  signers,
  approvals,
  myApproval,
  isUserSigner,
  currentUserId,
) {
  // map: approver_id → approval record
  const approvalMap = {}
  approvals.forEach((a) => {
    approvalMap[a.APPROVER_ID] = a
  })
  const currentSigner = (signers || []).find((s) => {
    if (s.STYPE === 'rzd' || !s.USER_ID) return false
    const approval = approvalMap[s.USER_ID]
    return !approval || approval.STATUS === 'pending'
  })
  const currentSignerId = currentSigner ? String(currentSigner.USER_ID) : ''
  // Статусы для подписантов
  const statusPill = (status) => {
    if (status === 'approved')
      return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#d1f0db;color:#2d7a47"> Подписано</span>'
    if (status === 'rejected')
      return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fddede;color:#a03030"> Отклонено</span>'
    if (status === 'pending')
      return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fff3cc;color:#7a5900"> В процессе</span>'
    return ''
  }
  // Версия документа
  const versionBadge = (approval) => {
    if (!approval || approval.STATUS !== 'approved') return ''
    const sv = approval.SIGNED_VERSION
    const cv = act.CONTENT_VERSION
    if (!sv || !cv) return ''
    const match = String(sv) === String(cv)
    return ''
    return match
      ? `<span title="Подписано версию ${sv}, текущая версия ${cv}" style="font-size:10px;color:#2d7a47;margin-left:4px">v${sv}</span>`
      : `<span title="Подписано версию ${sv}, но документ изменён (текущая v${cv})" style="font-size:10px;color:#b45309;margin-left:4px;font-weight:600">v${sv} </span>`
  }

  const listHtml = signers.length
    ? signers
        .map((s) => {
          const isRzd = s.STYPE === 'rzd'
          const approval = !isRzd && s.USER_ID ? approvalMap[s.USER_ID] : null
          const isCurrentSigner =
            currentSignerId !== '' && String(s.USER_ID) === currentSignerId
          let pill = ''
          if (isRzd) {
            pill =
              '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#f0f0f0;color:#888">РЖД</span>'
          } else if (
            approval?.STATUS === 'approved' ||
            approval?.STATUS === 'rejected'
          ) {
            pill = statusPill(approval.STATUS)
          } else if (isCurrentSigner && act.STATUS === 'active') {
            pill = statusPill('pending')
          }
          const subtitle = [s.POST, s.ORG].filter(Boolean).join(' · ')
          const rejectReason =
            approval && approval.STATUS === 'rejected' && approval.COMMENT_TXT
              ? `<div style="margin-top:6px;padding:6px 9px;background:#fddede;border-radius:6px;font-size:11.5px;color:#a03030"><b>Причина:</b> ${escapeHtml(approval.COMMENT_TXT)}</div>`
              : ''
          return `
        <div style="padding:8px 0;border-bottom:1px solid var(--line,#eee)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px"><b>${escapeHtml(s.FIO)}</b></div>
              ${subtitle ? `<div class="muted" style="font-size:11.5px">${escapeHtml(subtitle)}</div>` : ''}
            </div>
            <div style="flex-shrink:0">${pill}${versionBadge(approval)}</div>
          </div>
          ${rejectReason}
        </div>`
        })
        .join('')
    : '<div class="muted">Подписанты не назначены</div>'

  //  "подписать" — только для пользователей с правом SIGN_ACT
  const canSign =
    act.STATUS === 'active' &&
    hasPerm('SIGN_ACT') &&
    currentSignerId !== '' &&
    String(currentUserId) === currentSignerId &&
    (myApproval === 'pending' || (myApproval === 'none' && isUserSigner))
  let myBannerHtml = ''
  if (canSign) {
    myBannerHtml = `
      <div id="my-approval-banner" style="border-radius:6px;padding:12px 14px;margin-bottom:4px">
        <div style="font-size:13px;margin-bottom:8px;color:#1d4ed8"></div>
        <div style="display:flex;gap:8px">
          <button class="btn sm" id="btn-sign-approve" style="background:#2d7a47;color:#fff">Подписать</button>
          <button class="btn sm" id="btn-sign-reject"  style="background:#a03030;color:#fff">Отклонить</button>
        </div>
        <div id="reject-reason-box" style="display:none;margin-top:8px">
          <textarea id="reject-reason-txt" placeholder="Причина отклонения…"
            style="width:100%;min-height:60px;padding:6px 10px;border:1px solid var(--line2,#ddd);border-radius:5px;font-size:13px;resize:vertical"></textarea>
          <button class="btn sm" id="btn-sign-reject-confirm" style="margin-top:6px;background:#a03030;color:#fff">Отклоненить</button>
        </div>
      </div>`
  }

  $('#card-signers-body').html(`${myBannerHtml}${listHtml}`)

  if (canSign) {
    $('#btn-sign-approve').on('click', () =>
      submitInAppDecision(act.ID, 'approved', ''),
    )

    $('#btn-sign-reject').on('click', () => {
      const box = $('#reject-reason-box')
      box.toggle()
      if (box.is(':visible')) $('#reject-reason-txt').focus()
    })

    $('#btn-sign-reject-confirm').on('click', () => {
      const reason = $('#reject-reason-txt').val().trim()
      if (!reason) {
        showToast('Укажите причину', 'err')
        return
      }
      submitInAppDecision(act.ID, 'rejected', reason)
    })
  }
}

function submitInAppDecision(actId, decision, comment) {
  sendApiRequest('gu23_approve_in_app', {
    act_id: actId,
    decision,
    comment,
  }).done((resp) => {
    if (resp && resp.ok) {
      showToast(resp.msg || 'Готово', 'ok')
      navigateTo('card', actId)
    } else {
      showToast((resp && resp.msg) || 'Ошибка', 'err')
    }
  })
}

function showAttachmentsBlock(
  act,
  files,
  canChangeFiles,
  canDeleteFiles,
  userIsAdmin,
) {
  const accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.sig,.p7s'

  const addBtn = canChangeFiles
    ? `
    <div style="display:flex;gap:4px">
      <label title="Прикрепить общий файл" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border:1px solid var(--line);border-radius:6px;font-size:11px;color:var(--ink2);line-height:1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        Общий
        <input type="file" multiple class="file-cat-input" data-cat="general" style="display:none" accept="${accept}">
      </label>
      <label title="Прикрепить подписанный файл" style="cursor:pointer;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border:1px solid var(--line);border-radius:6px;font-size:11px;color:var(--ink2);line-height:1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Подписан.
        <input type="file" multiple class="file-cat-input" data-cat="signed" style="display:none" accept="${accept}">
      </label>
    </div>
  `
    : ''

  const showFileSection = (label, items) => {
    if (!items.length) return ''
    const rows = items
      .map((file) => {
        const isImage = /(png|jpe?g|gif|bmp|webp)$/i.test(file.FILE_EXT || '')
        const isSignedFile = file.FILE_CATEGORY === 'signed'
        const canDeleteFile = canDeleteFiles && (!isSignedFile || userIsAdmin)
        return `
        <div style="display:flex;gap:9px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line)">
          ${isImage ? `<img src="get_file.php?inline=1&id=${file.ID}" class="img-preview" data-id="${file.ID}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;cursor:pointer">` : ''}
          <div style="flex:1;font-size:12.5px">
            <a href="get_file.php?id=${file.ID}">${escapeHtml(file.FILE_NAME)}</a>
            <div class="muted" style="font-size:11px">${formatDateTime(file.CREATED_AT)} · ${escapeHtml(file.CREATED_BY || '')}</div>
          </div>
          ${canDeleteFile ? `<button class="delx file-delete-btn" data-id="${file.ID}">×</button>` : ''}
        </div>`
      })
      .join('')
    return `
      <div style="font-size:11px;font-weight:600;color:#999;letter-spacing:.05em;margin:10px 0 4px">${label}</div>
      ${rows}`
  }

  const general = files.filter(
    (f) => (f.FILE_CATEGORY || 'general') === 'general',
  )
  const signed = files.filter((f) => f.FILE_CATEGORY === 'signed')

  const bodyHtml = files.length
    ? showFileSection('ОБЩИЕ', general) + showFileSection('ПОДПИСАННЫЕ', signed)
    : '<div class="muted" style="font-size:12.5px">Файлы не прикреплены.</div>'

  $('#card-files-buttons').html(addBtn)
  $('#card-files-body').html(bodyHtml)
  const $block = $('#card-files-block')

  $block
    .find('.file-cat-input')
    .off('change.gu23Upload')
    .on('change.gu23Upload', function () {
      const files = Array.from(this.files || [])
      const category = $(this).data('cat')
      this.value = ''
      uploadFilesToServer(act.ID, files, category)
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

  $('#card-history-list').html(itemsHtml)
}
// --- редактирование черновика ---
function editDraftAct(data) {
  const act = data.act
  const firstWagon = (data.wagons || []).find((w) => w.WAYBILL_NO)
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
    waybillNumber:
      act.WAYBILL_NO || (firstWagon && firstWagon.WAYBILL_NO) || '',
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
      weight: w.WEIGHT,
      waybill: w.WAYBILL_NO || '',
    })),
    signers: data.signers.map((s) => ({
      id: s.SIGNER_REF_ID || null,
      fio: s.FIO,
      post: s.POST,
      org: s.ORG,
      manual: !s.SIGNER_REF_ID,
      stype: s.STYPE || null,
    })),
    _summary: null,
    _openStarts: null,
  })
  navigateTo('new')
}
// --- удаление черновика ---
function deleteDraftAct(act) {
  showConfirmBox(
    'Удаление черновика',
    `Удалить Проект ${act.ACT_NUMBER}? Действие необратимо.`,
    () => {
      sendApiRequest('gu23_del_act', { id: act.ID }).done((response) => {
        if (response && response.ok) {
          showToast('Проект удалён', 'ok')
          navigateTo('archive')
        } else {
          showToast((response && response.msg) || 'Ошибка удаления', 'err')
        }
      })
    },
  )
}
// --- аннулирование акта ---
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
// --- закрытие акта окончания ---
function closeAct(act) {
  showConfirmBox(
    'Закрыть акт',
    `Закрыть акт ${act.ACT_NUMBER}? Статус изменится на «Закрыт».`,
    () => {
      sendApiRequest('gu23_close_act', { id: act.ID }).done((response) => {
        if (response && response.ok) {
          showToast('Акт закрыт', 'ok')
          navigateTo('card', act.ID)
        } else {
          showToast((response && response.msg) || 'Ошибка', 'err')
        }
      })
    },
  )
}
// --- рассылка ссылок на подписание ---
function resendApprovalLinks(act, signers, approvals) {
  const approvalMap = {}
  ;(approvals || []).forEach((a) => {
    approvalMap[a.APPROVER_ID] = a
  })

  const unsigned = (signers || [])
    .filter((s) => {
      if (s.STYPE === 'rzd' || !s.USER_ID) return false
      const appr = approvalMap[s.USER_ID]
      return !appr || appr.STATUS !== 'approved'
    })
    .slice(0, 1)

  if (!unsigned.length) {
    showToast('Все подписанты уже согласовали акт', 'ok')
    return
  }

  const rows = unsigned
    .map(
      (s) => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer">
      <input type="checkbox" class="resend-chk" value="${s.USER_ID}" style="width:16px;height:16px">
      <span>
        <b>${escapeHtml(s.FIO || '')}</b>
        ${s.POST ? '<br><span class="muted" style="font-size:12px">' + escapeHtml(s.POST) + '</span>' : ''}
      </span>
    </label>
  `,
    )
    .join('')

  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:440px;max-width:96vw;padding:24px;position:relative">
        <h3 style="margin:0 0 6px">Сформировать повторно ссылку на подписание</h3>
        <p class="muted" style="margin:0 0 16px;font-size:13px">Ссылка будет отправлена текущему подписанту:</p>
        <div style="max-height:300px;overflow-y:auto;margin-bottom:16px">${rows}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn ghost" id="resend-cancel">Отмена</button>
          <button class="btn" id="resend-send">Отправить</button>
        </div>
      </div>
    </div>
  `)

  $('body').append($modal)

  $('#resend-cancel').on('click', () => $modal.remove())
  $modal.on('click', (e) => {
    if ($(e.target).is($modal)) $modal.remove()
  })

  $('#resend-send').on('click', () => {
    const selected = []
    $modal.find('.resend-chk:checked').each(function () {
      selected.push($(this).val())
    })
    if (!selected.length) {
      showToast('Выберите хотя бы одного подписанта', 'err')
      return
    }

    $('#resend-send').prop('disabled', true).text('Отправка…')
    let done = 0
    let errors = 0
    const errorMessages = []
    selected.forEach((userId) => {
      sendApiRequest('gu23_resend_approval', {
        act_id: act.ID,
        user_id: userId,
      }).done((r) => {
        done++
        if (!r || !r.ok) {
          errors++
          errorMessages.push(r?.msg || 'Ошибка отправки')
        }
        if (done === selected.length) {
          $modal.remove()
          if (errors === 0) {
            showToast(`Ссылки отправлены (${done})`, 'ok')
          } else {
            showToast(errorMessages.join('; '), 'err')
          }
        }
      })
    })
  })
}

// Загрузка файла на сервер (приложение)
function uploadFilesToServer(actId, files, category) {
  if (!files || !files.length) return
  const uploadKey = `${actId}:${category || 'general'}`
  if (activeUploads.has(uploadKey)) return
  activeUploads.add(uploadKey)

  const formData = new FormData()
  formData.append('ajax_action', 'gu23_upload_file')
  formData.append('act_id', actId)
  formData.append('file_category', category || 'general')

  for (let i = 0; i < files.length; i++) {
    formData.append(`file${i}`, files[i])
  }

  $.ajax({
    url: '/gu23/data.php',
    type: 'POST',
    data: formData,
    processData: false,
    contentType: false,
    dataType: 'json',
  })
    .done((response) => {
      if (response && response.ok) showToast('Файлы загружены', 'ok')
      else showToast('Часть файлов не загружена', 'err')
      navigateTo('card', actId)
    })
    .always(() => {
      activeUploads.delete(uploadKey)
    })
}
// Удаляем (приложение)
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
