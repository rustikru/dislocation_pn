import { sendApiRequest } from '../api.js'
import { escapeHtml } from '../utils.js'
import { showToast, showConfirmBox } from './ui.js'

let refsTab = 'signers'
let refsSearch = ''
let refsPage = 1
let currentItems = []
let searchTimer = null

const REFS_PAGE_SIZE = 20

export function showRefs(container) {
  refsSearch = ''
  refsPage = 1
  currentItems = []

  $(container).html(`
    <div class="phead" style="padding-bottom:10px">
      <h2 style="margin:0;font-size:16px">Справочники</h2>
    </div>
    <div id="refs-tabs" style="display:flex;gap:3px;margin-bottom:10px;border-bottom:1px solid var(--line2)">
      <button class="refs-tab" data-tab="signers" style="${tabStyle(true)}">Подписанты</button>
      <button class="refs-tab" data-tab="reasons" style="${tabStyle(false)}">Причины</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <input class="inp" id="refs-search" value="" placeholder="Поиск…" style="flex:1;font-size:13px;height:34px;padding:0 10px;box-sizing:border-box">
      <button class="btn sm" id="btn-add-ref" style="font-size:13px;height:34px;padding:0 14px;box-sizing:border-box;white-space:nowrap">+ Добавить</button>
    </div>
    <div id="refs-body"><div class="muted" style="font-size:13px">Загрузка…</div></div>
  `)

  $(container).on('click', '.refs-tab', function () {
    const tab = $(this).data('tab')
    if (tab === refsTab) return
    refsTab = tab
    refsSearch = ''
    refsPage = 1
    $('#refs-search').val('')
    $('.refs-tab').each(function () {
      $(this).attr('style', tabStyle($(this).data('tab') === refsTab))
    })
    fetchTab()
  })

  $(container).on('input', '#refs-search', function () {
    clearTimeout(searchTimer)
    const val = $(this).val()
    searchTimer = setTimeout(() => {
      refsSearch = val
      refsPage = 1
      fetchTab()
    }, 400)
  })

  $(container).on('click', '#btn-add-ref', () => {
    if (refsTab === 'signers') showSignerForm(null)
    else showReasonForm(null)
  })

  fetchTab()
}

function fetchTab() {
  $('#refs-body').html(
    '<div class="muted" style="font-size:13px">Загрузка…</div>',
  )
  sendApiRequest('gu23_refs_get_all', {
    tab: refsTab,
    search: refsSearch,
    page: refsPage,
  }).done((data) => {
    if (!data || !data.ok) {
      $('#refs-body').html(
        '<div class="muted" style="font-size:13px">Ошибка загрузки данных</div>',
      )
      return
    }
    currentItems = data.items || []
    if (refsTab === 'signers')
      renderSigners(currentItems, data.total, data.page)
    else renderReasons(currentItems, data.total, data.page)
  })
}

function reloadRefs() {
  fetchTab()
}

function tabStyle(active) {
  // Вкладки в стиле браузера (Safari), но с прямыми углами:
  // активная — «карточка», сливающаяся с контентом снизу.
  const base =
    'padding:8px 20px;font-size:13px;border-radius:0;cursor:pointer;'
  return active
    ? base +
        'border:1px solid var(--line2);border-bottom-color:var(--surface,#fff);' +
        'background:var(--surface,#fff);color:var(--ink);font-weight:600;margin-bottom:-1px'
    : base +
        'border:1px solid var(--line);border-bottom:none;' +
        'background:var(--surface2,#f7f7f4);color:var(--muted,#888);font-weight:500'
}

function renderPager(total, page) {
  const pages = Math.ceil(total / REFS_PAGE_SIZE)
  if (pages <= 1)
    return `<div style="font-size:12px;color:#888;margin-top:8px">Всего: ${total}</div>`
  let html =
    '<div style="display:flex;align-items:center;gap:4px;margin-top:10px;flex-wrap:wrap">'
  html += `<button class="btn ghost pager-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} style="padding:3px 8px;font-size:12px">←</button>`
  const start = Math.max(1, page - 2)
  const end = Math.min(pages, start + 4)
  for (let i = start; i <= end; i++) {
    html += `<button class="${i === page ? 'btn' : 'btn ghost'} pager-btn" data-page="${i}" style="padding:3px 8px;font-size:12px;min-width:28px">${i}</button>`
  }
  html += `<button class="btn ghost pager-btn" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} style="padding:3px 8px;font-size:12px">→</button>`
  html += `<span class="muted" style="margin-left:6px;font-size:12px">Всего: ${total}</span>`
  html += '</div>'
  return html
}

// ─────────────────────────────────────────────
// Подписанты РЖД
// ─────────────────────────────────────────────

function renderSigners(items, total, page) {
  const rows = items
    .map((s) => {
      const active = s.ACTIVE === 'Y'
      return `
      <tr data-id="${s.ID}" class="${active ? '' : 'row-inactive'}" style="cursor:pointer;font-size:13px" title="Нажмите для редактирования">
        <td style="padding:5px 8px">${escapeHtml(s.FIO || '')}</td>
        <td style="padding:5px 8px" class="muted">${escapeHtml(s.POST || '—')}</td>
        <td style="padding:5px 8px" class="muted">${escapeHtml(s.ORG || '—')}</td>
        <td style="padding:5px 8px" class="muted">${escapeHtml(s.UNIT || '—')}</td>
        <td style="padding:5px 8px">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;
            background:${active ? '#d1f0db' : '#f0f0f0'};color:${active ? '#2d7a47' : '#888'}">
            <span style="background:${active ? '#2d7a47' : '#aaa'}"></span>
            ${active ? 'Активен' : 'Неактивен'}
          </span>
        </td>
      </tr>`
    })
    .join('')

  $('#refs-body').html(`
    <div class="card">
      <div style="overflow-x:auto">
        <table class="tbl" style="width:100%;font-size:13px">
          <thead>
            <tr style="font-size:12px">
              <th style="padding:5px 8px">ФИО</th>
              <th style="padding:5px 8px">Должность</th>
              <th style="padding:5px 8px">Организация</th>
              <th style="padding:5px 8px">Подразделение</th>
              <th style="padding:5px 8px">Статус</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="5" class="muted" style="padding:10px 8px;font-size:13px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    ${renderPager(total, page)}
  `)

  $('#refs-body')
    .off('click', 'tbody tr')
    .on('click', 'tbody tr', function () {
      const id = $(this).data('id')
      const signer = currentItems.find((s) => String(s.ID) === String(id))
      if (signer) showSignerForm(signer)
    })

  $('#refs-body')
    .off('click', '.pager-btn')
    .on('click', '.pager-btn', function () {
      const p = parseInt($(this).data('page'))
      if (!p || p === refsPage) return
      refsPage = p
      fetchTab()
    })
}

function showSignerForm(signer) {
  const isNew = !signer
  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:520px;max-width:96vw;padding:28px;position:relative">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <b style="font-size:16px">Подписант</b>
          <button class="sf-close" style="border:none;background:none;font-size:22px;cursor:pointer;color:#888;line-height:1">×</button>
        </div>
        <div class="frow" style="margin-bottom:14px">
          <label style="display:block;font-size:13px;color:#666;margin-bottom:5px">ФИО</label>
          <input class="inp sf-fio" style="font-size:14px;padding:8px 10px" value="${escapeHtml(signer?.FIO || '')}" placeholder="Фамилия И.О.">
        </div>
        <div class="frow" style="margin-bottom:14px">
          <label style="display:block;font-size:13px;color:#666;margin-bottom:5px">Должность</label>
          <input class="inp sf-post" style="font-size:14px;padding:8px 10px" value="${escapeHtml(signer?.POST || '')}" placeholder="Начальник станции">
        </div>
        <div class="frow" style="margin-bottom:14px">
          <label style="display:block;font-size:13px;color:#666;margin-bottom:5px">Организация</label>
          <input class="inp sf-org" style="font-size:14px;padding:8px 10px" value="${escapeHtml(signer?.ORG || '')}" placeholder="ОАО РЖД">
        </div>
        <div class="frow" style="margin-bottom:22px">
          <label style="display:block;font-size:13px;color:#666;margin-bottom:5px">Подразделение</label>
          <input class="inp sf-unit" style="font-size:14px;padding:8px 10px" value="${escapeHtml(signer?.UNIT || '')}" placeholder="ст. Углеуральская">
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
  $modal.on('click', (e) => {
    if ($(e.target).is($modal)) close()
  })

  $modal.find('.sf-toggle').on('click', () => {
    const msg =
      signer?.ACTIVE === 'Y'
        ? 'Деактивировать подписанта?'
        : 'Активировать подписанта?'
    showConfirmBox('Изменить статус', msg, () => {
      sendApiRequest('gu23_ref_signer_toggle', { id: signer.ID }).done((r) => {
        if (r && r.ok) {
          close()
          reloadRefs()
        } else showToast((r && r.msg) || 'Ошибка', 'err')
      })
    })
  })

  $modal.find('.sf-save').on('click', () => {
    const fio = $modal.find('.sf-fio').val().trim()
    if (!fio) {
      showToast('ФИО обязательно', 'err')
      return
    }
    sendApiRequest('gu23_ref_signer_save', {
      id: signer?.ID || 0,
      fio,
      post: $modal.find('.sf-post').val().trim(),
      org: $modal.find('.sf-org').val().trim(),
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

const KIND_LABELS = {
  start: 'Начало',
  end: 'Окончание',
  other: 'Прочий',
  any: 'Любой',
}

function renderReasons(items, total, page) {
  const rows = items
    .map((r) => {
      const active = r.ACTIVE === 'Y'
      return `
      <tr data-id="${r.ID}" class="${active ? '' : 'row-inactive'}" style="cursor:pointer;font-size:13px" title="Нажмите для редактирования">
        <td style="padding:5px 8px">${escapeHtml(r.NAME || '')}</td>
        <td style="padding:5px 8px" class="muted">${KIND_LABELS[r.ACT_KIND] || r.ACT_KIND}</td>
        <td style="padding:5px 8px">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;
            background:${active ? '#d1f0db' : '#f0f0f0'};color:${active ? '#2d7a47' : '#888'}">
            <span style="background:${active ? '#2d7a47' : '#aaa'}"></span>
            ${active ? 'Активна' : 'Неактивна'}
          </span>
        </td>
      </tr>`
    })
    .join('')

  $('#refs-body').html(`
    <div class="card">
      <div style="overflow-x:auto">
        <table class="tbl" style="width:100%;font-size:13px">
          <thead>
            <tr style="font-size:12px">
              <th style="padding:5px 8px">Название</th>
              <th style="padding:5px 8px">Тип акта</th>
              <th style="padding:5px 8px">Статус</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" class="muted" style="padding:10px 8px;font-size:13px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    ${renderPager(total, page)}
  `)

  $('#refs-body')
    .off('click', 'tbody tr')
    .on('click', 'tbody tr', function () {
      const id = $(this).data('id')
      const reason = currentItems.find((r) => String(r.ID) === String(id))
      if (reason) showReasonForm(reason)
    })

  $('#refs-body')
    .off('click', '.pager-btn')
    .on('click', '.pager-btn', function () {
      const p = parseInt($(this).data('page'))
      if (!p || p === refsPage) return
      refsPage = p
      fetchTab()
    })
}

function showReasonForm(reason) {
  const isNew = !reason
  const kindOptions = Object.entries(KIND_LABELS)
    .map(
      ([val, label]) =>
        `<option value="${val}" ${reason?.ACT_KIND === val ? 'selected' : ''}>${label}</option>`,
    )
    .join('')

  const $modal = $(`
    <div class="modal-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:1000;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:480px;max-width:96vw;padding:28px;position:relative">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <b style="font-size:16px">Причина составления</b>
          <button class="rf-close" style="border:none;background:none;font-size:22px;cursor:pointer;color:#888;line-height:1">×</button>
        </div>
        <div class="frow" style="margin-bottom:14px">
          <label style="display:block;font-size:13px;color:#666;margin-bottom:5px">Название <span style="color:red">*</span></label>
          <input class="inp rf-name" style="font-size:14px;padding:8px 10px" value="${escapeHtml(reason?.NAME || '')}" placeholder="Простой под выгрузкой">
        </div>
        <div class="frow" style="margin-bottom:22px">
          <label style="display:block;font-size:13px;color:#666;margin-bottom:5px">Тип акта</label>
          <select class="inp rf-kind" style="font-size:14px;padding:8px 10px">${kindOptions}</select>
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
  $modal.on('click', (e) => {
    if ($(e.target).is($modal)) close()
  })

  $modal.find('.rf-toggle').on('click', () => {
    const msg =
      reason?.ACTIVE === 'Y'
        ? 'Деактивировать причину?'
        : 'Активировать причину?'
    showConfirmBox('Изменить статус', msg, () => {
      sendApiRequest('gu23_ref_reason_toggle', { id: reason.ID }).done((r) => {
        if (r && r.ok) {
          close()
          reloadRefs()
        } else showToast((r && r.msg) || 'Ошибка', 'err')
      })
    })
  })

  $modal.find('.rf-save').on('click', () => {
    const name = $modal.find('.rf-name').val().trim()
    if (!name) {
      showToast('Название обязательно', 'err')
      return
    }
    sendApiRequest('gu23_ref_reason_save', {
      id: reason?.ID || 0,
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
