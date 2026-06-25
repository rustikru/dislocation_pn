import { sendApiRequest } from '../api.js'
import { escapeHtml } from '../utils.js'
import { showToast, showConfirmBox } from './ui.js'

let currentTab = 'signers'
let cachedData = null

export function showRefs(container) {
  $(container).html(`
    <div class="phead">
      <h1>Справочники</h1>
    </div>
    <div id="refs-tabs" style="display:flex;gap:2px;margin-bottom:20px;border-bottom:2px solid var(--line)">
      <button class="refs-tab" data-tab="signers" style="${tabStyle(true)}">Подписанты РЖД</button>
      <button class="refs-tab" data-tab="reasons" style="${tabStyle(false)}">Причины составления</button>
    </div>
    <div id="refs-body"><div class="muted">Загрузка…</div></div>
  `)

  $(container).on('click', '.refs-tab', function () {
    currentTab = $(this).data('tab')
    $('.refs-tab').each(function () {
      $(this).attr('style', tabStyle($(this).data('tab') === currentTab))
    })
    if (cachedData) renderTab()
  })

  sendApiRequest('gu23_refs_get_all').done((data) => {
    if (!data || !data.ok) {
      $('#refs-body').html('<div class="muted">Ошибка загрузки данных</div>')
      return
    }
    cachedData = data
    renderTab()
  })
}

function tabStyle(active) {
  return active
    ? 'padding:8px 20px;border:none;background:none;font-size:14px;font-weight:600;color:var(--accent,#2563eb);border-bottom:2px solid var(--accent,#2563eb);margin-bottom:-2px;cursor:pointer'
    : 'padding:8px 20px;border:none;background:none;font-size:14px;font-weight:400;color:var(--muted,#888);cursor:pointer'
}

function renderTab() {
  if (currentTab === 'signers') renderSigners(cachedData.signers || [])
  else renderReasons(cachedData.reasons || [])
}

function reloadRefs() {
  sendApiRequest('gu23_refs_get_all').done((data) => {
    if (data && data.ok) { cachedData = data; renderTab() }
  })
}

// ─────────────────────────────────────────────
// Подписанты РЖД
// ─────────────────────────────────────────────

function renderSigners(signers) {
  const rows = signers.map((s) => {
    const active = s.ACTIVE === 'Y'
    return `
      <tr data-id="${s.ID}" class="${active ? '' : 'row-inactive'}" style="cursor:pointer" title="Нажмите для редактирования">
        <td><b>${escapeHtml(s.FIO || '')}</b></td>
        <td class="muted">${escapeHtml(s.POST || '—')}</td>
        <td class="muted">${escapeHtml(s.ORG || '—')}</td>
        <td class="muted">${escapeHtml(s.UNIT || '—')}</td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;
            background:${active ? '#d1f0db' : '#f0f0f0'};color:${active ? '#2d7a47' : '#888'}">
            <span style="width:7px;height:7px;border-radius:50%;background:${active ? '#2d7a47' : '#aaa'}"></span>
            ${active ? 'Активен' : 'Неактивен'}
          </span>
        </td>
      </tr>`
  }).join('')

  $('#refs-body').html(`
    <div class="card">
      <div class="cardpad" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)">
        <b>Справочник подписантов РЖД</b>
        <button class="btn sm" id="btn-add-signer">+ Добавить</button>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl" style="width:100%">
          <thead>
            <tr><th>ФИО</th><th>Должность</th><th>Организация</th><th>Подразделение</th><th>Статус</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="muted" style="padding:16px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `)

  $('#btn-add-signer').on('click', () => showSignerForm(null))

  $('#refs-body').on('click', 'tbody tr', function () {
    const id = $(this).data('id')
    const signer = (cachedData.signers || []).find((s) => String(s.ID) === String(id))
    if (signer) showSignerForm(signer)
  })
}

function showSignerForm(signer) {
  const isNew = !signer
  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:500px;max-width:96vw;padding:28px;position:relative">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0">Подписант</h3>
          <button class="sf-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#888">×</button>
        </div>
        <div class="frow" style="margin-bottom:12px">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">ФИО</label>
          <input class="inp sf-fio" value="${escapeHtml(signer?.FIO || '')}" placeholder="Фамилия И.О.">
        </div>
        <div class="frow" style="margin-bottom:12px">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">Должность</label>
          <input class="inp sf-post" value="${escapeHtml(signer?.POST || '')}" placeholder="Начальник станции">
        </div>
        <div class="frow" style="margin-bottom:12px">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">Организация</label>
          <input class="inp sf-org" value="${escapeHtml(signer?.ORG || '')}" placeholder="ОАО РЖД">
        </div>
        <div class="frow" style="margin-bottom:20px">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">Подразделение</label>
          <input class="inp sf-unit" value="${escapeHtml(signer?.UNIT || '')}" placeholder="ст. Углеуральская">
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn ghost sf-cancel">Отмена</button>
          ${!isNew ? `<button class="btn danger sf-toggle">${signer?.ACTIVE === 'Y' ? 'Деактивировать' : 'Активировать'}</button>` : ''}
          <button class="btn sf-save">Сохранить</button>
        </div>
      </div>
    </div>
  `)

  $('body').append($modal)
  $modal.find('.sf-fio').focus()

  const close = () => $modal.remove()

  $modal.find('.sf-close, .sf-cancel').on('click', close)
  $modal.on('click', (e) => { if ($(e.target).is($modal)) close() })

  $modal.find('.sf-toggle').on('click', () => {
    const msg = signer?.ACTIVE === 'Y' ? 'Деактивировать подписанта?' : 'Активировать подписанта?'
    showConfirmBox('Изменить статус', msg, () => {
      sendApiRequest('gu23_ref_signer_toggle', { id: signer.ID }).done((r) => {
        if (r && r.ok) { close(); reloadRefs() }
        else showToast((r && r.msg) || 'Ошибка', 'err')
      })
    })
  })

  $modal.find('.sf-save').on('click', () => {
    const fio = $modal.find('.sf-fio').val().trim()
    if (!fio) { showToast('ФИО обязательно', 'err'); return }
    sendApiRequest('gu23_ref_signer_save', {
      id:   signer?.ID || 0,
      fio,
      post: $modal.find('.sf-post').val().trim(),
      org:  $modal.find('.sf-org').val().trim(),
      unit: $modal.find('.sf-unit').val().trim(),
    }).done((r) => {
      if (r && r.ok) {
        close()
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
    const active = r.ACTIVE === 'Y'
    return `
      <tr data-id="${r.ID}" class="${active ? '' : 'row-inactive'}" style="cursor:pointer" title="Нажмите для редактирования">
        <td><b>${escapeHtml(r.NAME || '')}</b></td>
        <td class="muted">${KIND_LABELS[r.ACT_KIND] || r.ACT_KIND}</td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;
            background:${active ? '#d1f0db' : '#f0f0f0'};color:${active ? '#2d7a47' : '#888'}">
            <span style="width:7px;height:7px;border-radius:50%;background:${active ? '#2d7a47' : '#aaa'}"></span>
            ${active ? 'Активна' : 'Неактивна'}
          </span>
        </td>
      </tr>`
  }).join('')

  $('#refs-body').html(`
    <div class="card">
      <div class="cardpad" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)">
        <b>Справочник причин составления</b>
        <button class="btn sm" id="btn-add-reason">+ Добавить</button>
      </div>
      <div style="overflow-x:auto">
        <table class="tbl" style="width:100%">
          <thead>
            <tr><th>Название</th><th>Тип акта</th><th>Статус</th></tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" class="muted" style="padding:16px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `)

  $('#btn-add-reason').on('click', () => showReasonForm(null))

  $('#refs-body').on('click', 'tbody tr', function () {
    const id = $(this).data('id')
    const reason = (cachedData.reasons || []).find((r) => String(r.ID) === String(id))
    if (reason) showReasonForm(reason)
  })
}

function showReasonForm(reason) {
  const isNew = !reason
  const kindOptions = Object.entries(KIND_LABELS).map(([val, label]) =>
    `<option value="${val}" ${reason?.ACT_KIND === val ? 'selected' : ''}>${label}</option>`
  ).join('')

  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:500px;max-width:96vw;padding:28px;position:relative">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h3 style="margin:0">Причина составления</h3>
          <button class="rf-close" style="border:none;background:none;font-size:20px;cursor:pointer;color:#888">×</button>
        </div>
        <div class="frow" style="margin-bottom:12px">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">Название <span style="color:red">*</span></label>
          <input class="inp rf-name" value="${escapeHtml(reason?.NAME || '')}" placeholder="Простой под выгрузкой">
        </div>
        <div class="frow" style="margin-bottom:20px">
          <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">Тип акта</label>
          <select class="inp rf-kind">${kindOptions}</select>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn ghost rf-cancel">Отмена</button>
          ${!isNew ? `<button class="btn danger rf-toggle">${reason?.ACTIVE === 'Y' ? 'Деактивировать' : 'Активировать'}</button>` : ''}
          <button class="btn rf-save">Сохранить</button>
        </div>
      </div>
    </div>
  `)

  $('body').append($modal)
  $modal.find('.rf-name').focus()

  const close = () => $modal.remove()

  $modal.find('.rf-close, .rf-cancel').on('click', close)
  $modal.on('click', (e) => { if ($(e.target).is($modal)) close() })

  $modal.find('.rf-toggle').on('click', () => {
    const msg = reason?.ACTIVE === 'Y' ? 'Деактивировать причину?' : 'Активировать причину?'
    showConfirmBox('Изменить статус', msg, () => {
      sendApiRequest('gu23_ref_reason_toggle', { id: reason.ID }).done((r) => {
        if (r && r.ok) { close(); reloadRefs() }
        else showToast((r && r.msg) || 'Ошибка', 'err')
      })
    })
  })

  $modal.find('.rf-save').on('click', () => {
    const name = $modal.find('.rf-name').val().trim()
    if (!name) { showToast('Название обязательно', 'err'); return }
    sendApiRequest('gu23_ref_reason_save', {
      id:       reason?.ID || 0,
      name,
      act_kind: $modal.find('.rf-kind').val(),
    }).done((r) => {
      if (r && r.ok) {
        close()
        showToast(isNew ? 'Причина добавлена' : 'Изменения сохранены', 'ok')
        reloadRefs()
      } else {
        showToast((r && r.msg) || 'Ошибка', 'err')
      }
    })
  })
}
