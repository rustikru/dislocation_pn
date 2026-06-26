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
  showSignersBlock(
    act,
    data.signers,
    data.approvals || [],
    data.myApproval || 'none',
    !!data.isUserSigner,
  )
  showAttachmentsBlock(act, data.files)
  showHistoryBlock(data.history)
}

function showToolbarButtons(act, data) {
  const $toolbar = $('#card-toolbar')

  if (act.STATUS === 'draft') {
    const $editBtn = $('<button class="btn primary">Редактировать</button>')
    const $delBtn = $('<button class="btn danger">Удалить Проект</button>')

    $editBtn.on('click', () => editDraftAct(data))
    $delBtn.on('click', () => deleteDraftAct(act))

    $toolbar.append($editBtn, $delBtn)
  }

  if ((act.STATUS === 'active' || act.STATUS === 'closed') && data.isAdmin) {
    const $annulBtn = $('<button class="btn danger">Аннулировать</button>')
    $annulBtn.on('click', () => annulActiveAct(act))
    $toolbar.append($annulBtn)
  }

  if (act.STATUS === 'active' && act.ACT_TYPE === 'end' && data.isAdmin) {
    const $closeBtn = $('<button class="btn">Закрыть акт</button>')
    $closeBtn.on('click', () => closeAct(act))
    $toolbar.append($closeBtn)
  }

  if (
    act.STATUS === 'active' &&
    data.isAdmin &&
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
      const $resendBtn = $(
        '<button class="btn sm ghost">Переотправить ссылки</button>',
      )
      $resendBtn.on('click', () =>
        resendApprovalLinks(act, data.signers, data.approvals || []),
      )
      $toolbar.append($resendBtn)
    }
  }

  // Кнопка скачивания DOCX доступна для всех статусов, кроме черновика
  if (act.STATUS !== 'draft' && act.STATUS !== 'annulled') {
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

function showSignersBlock(act, signers, approvals, myApproval, isUserSigner) {
  // Строим map: approver_id → approval record
  const approvalMap = {}
  approvals.forEach((a) => {
    approvalMap[a.APPROVER_ID] = a
  })

  const statusPill = (status) => {
    if (status === 'approved')
      return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#d1f0db;color:#2d7a47">✓ Подписано</span>'
    if (status === 'rejected')
      return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fddede;color:#a03030">✕ Отклонено</span>'
    if (status === 'pending')
      return '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#fff3cc;color:#7a5900">⏳ Ожидает</span>'
    return ''
  }

  const versionBadge = (approval) => {
    if (!approval || approval.STATUS !== 'approved') return ''
    const sv = approval.SIGNED_VERSION
    const cv = act.CONTENT_VERSION
    if (!sv || !cv) return ''
    const match = String(sv) === String(cv)
    return match
      ? `<span title="Подписано версию ${sv}, текущая версия ${cv}" style="font-size:10px;color:#2d7a47;margin-left:4px">v${sv} ✓</span>`
      : `<span title="Подписано версию ${sv}, но документ изменён (текущая v${cv})" style="font-size:10px;color:#b45309;margin-left:4px;font-weight:600">v${sv} ⚠</span>`
  }

  const listHtml = signers.length
    ? signers
        .map((s) => {
          const isRzd = s.STYPE === 'rzd'
          const approval = !isRzd && s.USER_ID ? approvalMap[s.USER_ID] : null
          const pill = approval
            ? statusPill(approval.STATUS)
            : isRzd
              ? '<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;background:#f0f0f0;color:#888">РЖД</span>'
              : ''
          const subtitle = [s.POST, s.ORG].filter(Boolean).join(' · ')
          return `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--line,#eee)">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px"><b>${escapeHtml(s.FIO)}</b></div>
            ${subtitle ? `<div class="muted" style="font-size:11.5px">${escapeHtml(subtitle)}</div>` : ''}
          </div>
          <div style="flex-shrink:0">${pill}${versionBadge(approval)}</div>
        </div>`
        })
        .join('')
    : '<div class="muted">Подписанты не назначены</div>'

  // Баннер "подписать" — для подписантов акта (pending = ждёт решения, none = ещё не инициировано)
  const canSign =
    act.STATUS === 'active' &&
    (myApproval === 'pending' || (myApproval === 'none' && isUserSigner))
  let myBannerHtml = ''
  if (canSign) {
    myBannerHtml = `
      <div id="my-approval-banner" style="background:#f0f4ff;border-radius:6px;padding:12px 14px;margin-bottom:4px">
        <div style="font-size:13px;margin-bottom:8px;color:#1d4ed8"></div>
        <div style="display:flex;gap:8px">
          <button class="btn sm" id="btn-sign-approve" style="background:#2d7a47;color:#fff">✓ Согласовать</button>
          <button class="btn sm" id="btn-sign-reject"  style="background:#a03030;color:#fff">✕ Отклонить</button>
        </div>
        <div id="reject-reason-box" style="display:none;margin-top:8px">
          <textarea id="reject-reason-txt" placeholder="Причина отклонения…"
            style="width:100%;min-height:60px;padding:6px 10px;border:1px solid var(--line2,#ddd);border-radius:5px;font-size:13px;resize:vertical"></textarea>
          <button class="btn sm" id="btn-sign-reject-confirm" style="margin-top:6px;background:#a03030;color:#fff">Подтвердить отклонение</button>
        </div>
      </div>`
  }

  $('#card-right-column').append(`
    <div class="card">
      <div class="cardpad" style="border-bottom:1px solid var(--line)"><b>Подписанты</b></div>
      <div style="padding:8px 16px 4px">
        ${myBannerHtml}
        ${listHtml}
      </div>
    </div>
  `)

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

function showAttachmentsBlock(act, files) {
  const isAnnulled = act.STATUS === 'annulled'
  const accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.sig,.p7s'

  const addBtn = isAnnulled
    ? ''
    : `
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

  const renderSection = (label, items) => {
    if (!items.length) return ''
    const rows = items
      .map((file) => {
        const isImage = /(png|jpe?g|gif|bmp|webp)$/i.test(file.FILE_EXT || '')
        return `
        <div style="display:flex;gap:9px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line)">
          ${isImage ? `<img src="get_file.php?inline=1&id=${file.ID}" class="img-preview" data-id="${file.ID}" style="width:34px;height:34px;object-fit:cover;border-radius:4px;cursor:pointer">` : ''}
          <div style="flex:1;font-size:12.5px">
            <a href="get_file.php?id=${file.ID}">${escapeHtml(file.FILE_NAME)}</a>
            <div class="muted" style="font-size:11px">${formatDateTime(file.CREATED_AT)} · ${escapeHtml(file.CREATED_BY || '')}</div>
          </div>
          ${!isAnnulled ? `<button class="delx file-delete-btn" data-id="${file.ID}">×</button>` : ''}
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
    ? renderSection('ОБЩИЕ', general) + renderSection('ПОДПИСАННЫЕ', signed)
    : '<div class="muted" style="font-size:12.5px">Файлы не прикреплены.</div>'

  const $block = $(`
    <div class="card" style="margin-top:16px">
      <div class="cardpad" style="border-bottom:1px solid var(--line);display:flex;align-items:center">
        <b>Приложения</b>
        <div style="flex:1"></div>
        ${addBtn}
      </div>
      <div class="cardpad">${bodyHtml}</div>
    </div>
  `)

  $('#card-right-column').append($block)

  $('.file-cat-input').on('change', function () {
    uploadFilesToServer(act.ID, this.files, $(this).data('cat'))
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
      stype: s.STYPE || null,
    })),
    _summary: null,
    _openStarts: null,
  })
  navigateTo('new')
}

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

function resendApprovalLinks(act, signers, approvals) {
  const approvalMap = {}
  ;(approvals || []).forEach((a) => {
    approvalMap[a.APPROVER_ID] = a
  })

  const unsigned = (signers || []).filter((s) => {
    if (s.STYPE === 'rzd' || !s.USER_ID) return false
    const appr = approvalMap[s.USER_ID]
    return !appr || appr.STATUS !== 'approved'
  })

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
        <h3 style="margin:0 0 6px">Переотправить ссылки</h3>
        <p class="muted" style="margin:0 0 16px;font-size:13px">Выберите подписантов, которым нужно отправить новые ссылки согласования:</p>
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
    selected.forEach((userId) => {
      sendApiRequest('gu23_resend_approval', {
        act_id: act.ID,
        user_id: userId,
        mode: 'send_file',
      }).done((r) => {
        done++
        if (!r || !r.ok) errors++
        if (done === selected.length) {
          $modal.remove()
          if (errors === 0) {
            showToast(`Ссылки отправлены (${done})`, 'ok')
          } else {
            showToast(
              `Отправлено ${done - errors} из ${done}, ошибок: ${errors}`,
              'err',
            )
          }
        }
      })
    })
  })
}

function sendForApproval(act) {
  if (!(act.WAGON_CNT > 0)) {
    showToast('Нельзя отправить на согласование: в акте нет вагонов', 'err')
    return
  }
  showConfirmBox(
    'Отправить на согласование',
    'Запросить электронное согласование у подписантов акта?',
    () => {
      sendApiRequest('gu23_send_approval', { act_id: act.ID }).done(
        (response) => {
          if (response && response.ok) {
            showToast(response.msg || 'Письма отправлены', 'ok')
            navigateTo('card', act.ID)
          } else {
            showToast((response && response.msg) || 'Ошибка отправки', 'err')
          }
        },
      )
    },
  )
}

function uploadFilesToServer(actId, files, category) {
  if (!files || !files.length) return
  const formData = new FormData()
  formData.append('ajax_action', 'gu23_upload_file')
  formData.append('act_id', actId)
  formData.append('file_category', category || 'general')

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
