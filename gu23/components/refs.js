import { sendApiRequest } from '../api.js'
import { escapeHtml } from '../utils.js'
import { showToast, showConfirmBox } from './ui.js'

export function showRefs(container) {
  $(container).html(`
    <div class="phead">
      <h1>Справочники</h1>
    </div>
    <div id="refs-content"><div class="muted">Загрузка…</div></div>
  `)

  sendApiRequest('gu23_refs_get_all').done((data) => {
    if (!data || !data.ok) {
      $('#refs-content').html('<div class="muted">Ошибка загрузки данных</div>')
      return
    }
    renderRefs(data.signers || [], data.reasons || [])
  })
}

function renderRefs(signers, reasons) {
  $('#refs-content').html(`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
      <div id="ref-signers-block"></div>
      <div id="ref-reasons-block"></div>
    </div>
  `)
  renderSigners(signers)
  renderReasons(reasons)
}

// ─────────────────────────────────────────────
// Подписанты РЖД
// ─────────────────────────────────────────────

function renderSigners(signers) {
  const rows = signers.map((s) => {
    const inactive = s.ACTIVE !== 'Y'
    return `
      <tr data-id="${s.ID}" class="${inactive ? 'row-inactive' : ''}">
        <td>${escapeHtml(s.FIO || '')}</td>
        <td class="muted">${escapeHtml(s.POST || '')}</td>
        <td class="muted">${escapeHtml(s.ORG || '')}</td>
        <td style="white-space:nowrap">
          <button class="btn xs" data-action="edit-signer" data-id="${s.ID}">Изменить</button>
          <button class="btn xs ${inactive ? '' : 'ghost'}" data-action="toggle-signer" data-id="${s.ID}" title="${inactive ? 'Активировать' : 'Деактивировать'}">
            ${inactive ? 'Вкл' : 'Выкл'}
          </button>
        </td>
      </tr>`
  }).join('')

  $('#ref-signers-block').html(`
    <div class="card">
      <div class="cardpad" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)">
        <b>Подписанты РЖД</b>
        <button class="btn sm" id="btn-add-signer">+ Добавить</button>
      </div>
      <div style="overflow-x:auto">
        <table class="ref-table" style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th>ФИО</th><th>Должность</th><th>Организация</th><th></th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" class="muted" style="padding:12px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `)

  $('#btn-add-signer').on('click', () => showSignerForm(null))

  $('#ref-signers-block').on('click', '[data-action="edit-signer"]', function () {
    const id = $(this).data('id')
    const tr = $(this).closest('tr')
    showSignerForm({
      ID:   id,
      FIO:  tr.find('td').eq(0).text(),
      POST: tr.find('td').eq(1).text(),
      ORG:  tr.find('td').eq(2).text(),
    })
  })

  $('#ref-signers-block').on('click', '[data-action="toggle-signer"]', function () {
    const id  = $(this).data('id')
    const btn = $(this)
    const active = btn.text().trim() === 'Выкл'
    const msg = active ? 'Деактивировать подписанта?' : 'Активировать подписанта?'
    showConfirmBox('Изменить статус', msg, () => {
      sendApiRequest('gu23_ref_signer_toggle', { id }).done((r) => {
        if (r && r.ok) {
          reloadRefs()
        } else {
          showToast((r && r.msg) || 'Ошибка', 'err')
        }
      })
    })
  })
}

function showSignerForm(signer) {
  const isNew = !signer
  const title  = isNew ? 'Добавить подписанта РЖД' : 'Изменить подписанта'
  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:440px;max-width:96vw;padding:24px;position:relative">
        <h3 style="margin:0 0 18px">${title}</h3>
        <div class="frow" style="margin-bottom:10px">
          <label>ФИО <span class="req">*</span></label>
          <input class="inp" id="sf-fio" value="${escapeHtml(signer?.FIO || '')}">
        </div>
        <div class="frow" style="margin-bottom:10px">
          <label>Должность</label>
          <input class="inp" id="sf-post" value="${escapeHtml(signer?.POST || '')}">
        </div>
        <div class="frow" style="margin-bottom:10px">
          <label>Организация</label>
          <input class="inp" id="sf-org" value="${escapeHtml(signer?.ORG || '')}">
        </div>
        <div class="frow" style="margin-bottom:18px">
          <label>Подразделение</label>
          <input class="inp" id="sf-unit" value="${escapeHtml(signer?.UNIT || '')}">
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn ghost" id="sf-cancel">Отмена</button>
          <button class="btn" id="sf-save">Сохранить</button>
        </div>
      </div>
    </div>
  `)

  $('body').append($modal)
  $('#sf-fio').focus()

  $('#sf-cancel').on('click', () => $modal.remove())
  $modal.on('click', (e) => { if ($(e.target).is($modal)) $modal.remove() })

  $('#sf-save').on('click', () => {
    const fio = $('#sf-fio').val().trim()
    if (!fio) { showToast('ФИО обязательно', 'err'); return }
    sendApiRequest('gu23_ref_signer_save', {
      id:   signer?.ID || 0,
      fio,
      post: $('#sf-post').val().trim(),
      org:  $('#sf-org').val().trim(),
      unit: $('#sf-unit').val().trim(),
    }).done((r) => {
      if (r && r.ok) {
        $modal.remove()
        showToast(isNew ? 'Подписант добавлен' : 'Изменения сохранены', 'ok')
        reloadRefs()
      } else {
        showToast((r && r.msg) || 'Ошибка', 'err')
      }
    })
  })
}

// ─────────────────────────────────────────────
// Причины составления
// ─────────────────────────────────────────────

const KIND_LABELS = { start: 'Начало', end: 'Окончание', other: 'Прочий', any: 'Любой' }

function renderReasons(reasons) {
  const rows = reasons.map((r) => {
    const inactive = r.ACTIVE !== 'Y'
    return `
      <tr data-id="${r.ID}" class="${inactive ? 'row-inactive' : ''}">
        <td>${escapeHtml(r.NAME || '')}</td>
        <td class="muted" style="white-space:nowrap">${KIND_LABELS[r.ACT_KIND] || r.ACT_KIND}</td>
        <td style="white-space:nowrap">
          <button class="btn xs" data-action="edit-reason" data-id="${r.ID}">Изменить</button>
          <button class="btn xs ${inactive ? '' : 'ghost'}" data-action="toggle-reason" data-id="${r.ID}">
            ${inactive ? 'Вкл' : 'Выкл'}
          </button>
        </td>
      </tr>`
  }).join('')

  $('#ref-reasons-block').html(`
    <div class="card">
      <div class="cardpad" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)">
        <b>Причины составления</b>
        <button class="btn sm" id="btn-add-reason">+ Добавить</button>
      </div>
      <div style="overflow-x:auto">
        <table class="ref-table" style="width:100%;border-collapse:collapse">
          <thead>
            <tr><th>Название</th><th>Тип акта</th><th></th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" class="muted" style="padding:12px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `)

  $('#btn-add-reason').on('click', () => showReasonForm(null))

  $('#ref-reasons-block').on('click', '[data-action="edit-reason"]', function () {
    const id = $(this).data('id')
    const tr = $(this).closest('tr')
    showReasonForm({
      ID:       id,
      NAME:     tr.find('td').eq(0).text(),
      ACT_KIND: Object.keys(KIND_LABELS).find((k) => KIND_LABELS[k] === tr.find('td').eq(1).text()) || 'any',
    })
  })

  $('#ref-reasons-block').on('click', '[data-action="toggle-reason"]', function () {
    const id  = $(this).data('id')
    const active = $(this).text().trim() === 'Выкл'
    showConfirmBox('Изменить статус', active ? 'Деактивировать причину?' : 'Активировать причину?', () => {
      sendApiRequest('gu23_ref_reason_toggle', { id }).done((r) => {
        if (r && r.ok) {
          reloadRefs()
        } else {
          showToast((r && r.msg) || 'Ошибка', 'err')
        }
      })
    })
  })
}

function showReasonForm(reason) {
  const isNew = !reason
  const kindOptions = Object.entries(KIND_LABELS).map(([val, label]) =>
    `<option value="${val}" ${reason?.ACT_KIND === val ? 'selected' : ''}>${label}</option>`
  ).join('')

  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:440px;max-width:96vw;padding:24px">
        <h3 style="margin:0 0 18px">${isNew ? 'Добавить причину' : 'Изменить причину'}</h3>
        <div class="frow" style="margin-bottom:10px">
          <label>Название <span class="req">*</span></label>
          <input class="inp" id="rf-name" value="${escapeHtml(reason?.NAME || '')}">
        </div>
        <div class="frow" style="margin-bottom:18px">
          <label>Тип акта</label>
          <select class="inp" id="rf-kind">${kindOptions}</select>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn ghost" id="rf-cancel">Отмена</button>
          <button class="btn" id="rf-save">Сохранить</button>
        </div>
      </div>
    </div>
  `)

  $('body').append($modal)
  $('#rf-name').focus()

  $('#rf-cancel').on('click', () => $modal.remove())
  $modal.on('click', (e) => { if ($(e.target).is($modal)) $modal.remove() })

  $('#rf-save').on('click', () => {
    const name = $('#rf-name').val().trim()
    if (!name) { showToast('Название обязательно', 'err'); return }
    sendApiRequest('gu23_ref_reason_save', {
      id:       reason?.ID || 0,
      name,
      act_kind: $('#rf-kind').val(),
    }).done((r) => {
      if (r && r.ok) {
        $modal.remove()
        showToast(isNew ? 'Причина добавлена' : 'Изменения сохранены', 'ok')
        reloadRefs()
      } else {
        showToast((r && r.msg) || 'Ошибка', 'err')
      }
    })
  })
}

// ─────────────────────────────────────────────
// Перезагрузка данных
// ─────────────────────────────────────────────

function reloadRefs() {
  sendApiRequest('gu23_refs_get_all').done((data) => {
    if (data && data.ok) renderRefs(data.signers || [], data.reasons || [])
  })
}
