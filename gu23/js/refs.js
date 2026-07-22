import { sendApiRequest } from './api.js'
import { escapeHtml } from './utils.js'
import { showToast, showConfirmBox } from './ui.js'
import { hasPerm } from './state.js'

let refsTab = 'signers'
let refsSearch = ''
let refsPage = 1
let currentItems = []
let reasonCategories = []
let reasonKinds = []
let reasonKind = ''
let reasonCateg = ''
let reasonStatus = ''
let searchTimer = null

const REFS_PAGE_SIZE = 20 //
let refsPageSize = REFS_PAGE_SIZE

export function showRefs(container) {
  refsSearch = ''
  refsPage = 1
  currentItems = []
  reasonCategories = []
  reasonKinds = []
  reasonKind = ''
  reasonCateg = ''
  reasonStatus = ''

  $(container).load('pages/refs.php', () => {
    prepareRefsPage(container)
    loadRefsTab()
  })
}

function prepareRefsPage(container) {
  $(container).off('.refs')

  $('#btn-add-ref').toggle(hasPerm('MANAGE_REFS'))
  setActiveTab()

  $(container).on('click.refs', '.refs-tab', function () {
    const tab = $(this).data('tab')
    if (tab === refsTab) return
    refsTab = tab
    refsSearch = ''
    refsPage = 1
    reasonKind = ''
    reasonCateg = ''
    reasonStatus = ''
    $('#refs-search').val('')
    setActiveTab()
    loadRefsTab()
  })

  $(container).on('input.refs', '#refs-search', function () {
    clearTimeout(searchTimer)
    const searchText = $(this).val()
    searchTimer = setTimeout(() => {
      refsSearch = searchText
      refsPage = 1
      loadRefsTab()
    }, 400)
  })

  $(container).on('click.refs', '#btn-add-ref', () => {
    if (!hasPerm('MANAGE_REFS')) return
    if (refsTab === 'signers') showSignerForm(null)
    else showReasonForm(null)
  })

  $(container).on('click.refs', '#btn-export-reasons', () => {
    const $form = $(`
      <form method="post" action="/gu23/data.php" style="display:none">
        <input type="hidden" name="ajax_action" value="gu23_reasons_excel">
        <input type="hidden" name="search">
        <input type="hidden" name="act_kind">
        <input type="hidden" name="categ">
        <input type="hidden" name="active">
      </form>
    `)
    $form.find('[name="search"]').val(refsSearch)
    $form.find('[name="act_kind"]').val(reasonKind)
    $form.find('[name="categ"]').val(reasonCateg)
    $form.find('[name="active"]').val(reasonStatus)
    $('body').append($form)
    $form.trigger('submit')
    $form.remove()
  })

  $(container).on('change.refs', '.reason-filter', function () {
    reasonKind = $('#reason-filter-kind').val() || ''
    reasonCateg = $('#reason-filter-categ').val() || ''
    reasonStatus = $('#reason-filter-status').val() || ''
    refsPage = 1
    loadRefsTab()
  })
}

function loadRefsTab() {
  $('#refs-body').html(
    '<div class="muted" style="font-size:13px">Загрузка…</div>',
  )
  sendApiRequest('gu23_refs_get_all', {
    tab: refsTab,
    search: refsSearch,
    act_kind: refsTab === 'reasons' ? reasonKind : '',
    categ: refsTab === 'reasons' ? reasonCateg : '',
    active: refsTab === 'reasons' ? reasonStatus : '',
    page: refsPage,
  }).done((data) => {
    if (!data || !data.ok) {
      $('#refs-body').html(
        '<div class="muted" style="font-size:13px">Ошибка загрузки данных</div>',
      )
      return
    }
    currentItems = data.items || []
    reasonCategories = data.categories || []
    reasonKinds = data.actKinds || []
    refsPageSize = data.page_size || REFS_PAGE_SIZE
    if (refsTab === 'signers')
      showSignersList(currentItems, data.total, data.page)
    else showReasonsList(currentItems, data.total, data.page)
  })
}

function reloadRefs() {
  loadRefsTab()
}

function setActiveTab() {
  $('.refs-tab').each(function () {
    $(this).toggleClass('refs-tab-active', $(this).data('tab') === refsTab)
  })
  $('#btn-export-reasons').toggle(refsTab === 'reasons')
}

function refsPageButtonsHtml(total, page) {
  const pages = Math.ceil(total / refsPageSize)
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

function showSignersList(items, total, page) {
  const canEditRefs = hasPerm('MANAGE_REFS')
  const rows = items
    .map((s) => {
      const active = s.ACTIVE === 'Y'
      return `
      <tr data-id="${s.ID}" class="${active ? '' : 'row-inactive'}" style="${canEditRefs ? 'cursor:pointer;' : ''}font-size:13px" title="${canEditRefs ? 'Нажмите для редактирования' : ''}">
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
    ${refsPageButtonsHtml(total, page)}
  `)

  $('#refs-body')
    .off('click', 'tbody tr')
    .on('click', 'tbody tr', function () {
      if (!canEditRefs) return
      const id = $(this).data('id')
      const signer = currentItems.find((s) => String(s.ID) === String(id))
      if (signer) showSignerForm(signer)
    })

  $('#refs-body')
    .off('click', '.pager-btn')
    .on('click', '.pager-btn', function () {
      const pageNumber = parseInt($(this).data('page'))
      if (!pageNumber || pageNumber === refsPage) return
      refsPage = pageNumber
      loadRefsTab()
    })
}

function showSignerForm(signer) {
  if (!hasPerm('MANAGE_REFS')) return
  const isNew = !signer
  const $modal = $(`
    <div class="modal-backdrop ref-modal-wrap">
      <div class="card ref-modal-card">
        <div class="ref-modal-head">
          <b>Подписант</b>
          <button class="ref-close-btn sf-close">×</button>
        </div>
        <div class="ref-form">
          <div class="frow">
            <label>ФИО</label>
            <input class="inp sf-fio" value="${escapeHtml(signer?.FIO || '')}" placeholder="Фамилия И.О.">
          </div>
          <div class="frow">
            <label>Должность</label>
            <input class="inp sf-post" value="${escapeHtml(signer?.POST || '')}" placeholder="Начальник станции">
          </div>
          <div class="frow">
            <label>Организация</label>
            <input class="inp sf-org" value="${escapeHtml(signer?.ORG || '')}" placeholder="ОАО РЖД">
          </div>
          <div class="frow">
            <label>Подразделение</label>
            <input class="inp sf-unit" value="${escapeHtml(signer?.UNIT || '')}" placeholder="ст. Углеуральская">
          </div>
        </div>
        <div class="ref-modal-foot">
          <button class="btn ghost sf-cancel">Отмена</button>
          ${!isNew ? `<button class="btn danger sf-toggle">${signer?.ACTIVE === 'Y' ? 'Отключить' : 'Активировать'}</button>` : ''}
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
        ? 'Отключить подписанта?'
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

const DEFAULT_KIND_LABELS = {
  start: 'Начало',
  end: 'Окончание',
  other: 'Прочий',
  any: 'Любой',
}

function actKindItems() {
  if (reasonKinds.length) {
    return reasonKinds.map((row) => [String(row.CODE || row.ID || ''), row.NAME || ''])
  }
  return Object.entries(DEFAULT_KIND_LABELS)
}

function actKindLabel(code) {
  const item = actKindItems().find(([kindCode]) => kindCode === code)
  return item ? item[1] : code
}

function showReasonsList(items, total, page) {
  const canEditRefs = hasPerm('MANAGE_REFS')
  const kindOptions =
    '<option value="">Все</option>' +
    actKindItems()
      .map(
        ([kindCode, label]) =>
          `<option value="${kindCode}" ${reasonKind === kindCode ? 'selected' : ''}>${label}</option>`,
      )
      .join('')
  const categoryOptions =
    '<option value="">Все</option>' +
    reasonCategories
      .map(
        (category) =>
          `<option value="${category.ID}" ${String(reasonCateg) === String(category.ID) ? 'selected' : ''}>${escapeHtml(category.NAME || '')}</option>`,
      )
      .join('')
  const statusOptions = `
    <option value="" ${reasonStatus === '' ? 'selected' : ''}>Все</option>
    <option value="Y" ${reasonStatus === 'Y' ? 'selected' : ''}>Активен</option>
    <option value="N" ${reasonStatus === 'N' ? 'selected' : ''}>Неактивен</option>
  `
  const rows = items
    .map((r) => {
      const active = r.ACTIVE === 'Y'
      return `
      <tr data-id="${r.ID}" class="${active ? '' : 'row-inactive'}" style="${canEditRefs ? 'cursor:pointer;' : ''}font-size:13px" title="${canEditRefs ? 'Нажмите для редактирования' : ''}">
        <td style="padding:5px 8px">${escapeHtml(r.NAME || '')}</td>
        <td style="padding:5px 8px" class="muted">${actKindLabel(r.ACT_KIND || '')}</td>
        <td style="padding:5px 8px" class="muted">${escapeHtml(r.CATEG_NAME || '—')}</td>
        <td style="padding:5px 8px">
          <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;
            background:${active ? '#d1f0db' : '#f0f0f0'};color:${active ? '#2d7a47' : '#888'}">
            <span style="background:${active ? '#2d7a47' : '#aaa'}"></span>
            ${active ? 'Активн' : 'Неактивен'}
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
              <th style="padding:5px 8px">Категория</th>
              <th style="padding:5px 8px">Статус</th>
            </tr>
            <tr>
              <th style="padding:3px 8px"></th>
              <th style="padding:3px 8px">
                <select class="inp reason-filter" id="reason-filter-kind" style="font-size:12px;padding:3px 7px;min-width:120px;height:30px">${kindOptions}</select>
              </th>
              <th style="padding:3px 8px">
                <select class="inp reason-filter" id="reason-filter-categ" style="font-size:12px;padding:3px 7px;min-width:140px;height:30px">${categoryOptions}</select>
              </th>
              <th style="padding:3px 8px">
                <select class="inp reason-filter" id="reason-filter-status" style="font-size:12px;padding:3px 7px;min-width:110px;height:30px">${statusOptions}</select>
              </th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="4" class="muted" style="padding:4px 8px;font-size:12px;line-height:18px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    ${refsPageButtonsHtml(total, page)}
  `)

  $('#refs-body')
    .off('click', 'tbody tr')
    .on('click', 'tbody tr', function () {
      if (!canEditRefs) return
      const id = $(this).data('id')
      const reason = currentItems.find((r) => String(r.ID) === String(id))
      if (reason) showReasonForm(reason)
    })

  $('#refs-body')
    .off('click', '.pager-btn')
    .on('click', '.pager-btn', function () {
      const pageNumber = parseInt($(this).data('page'))
      if (!pageNumber || pageNumber === refsPage) return
      refsPage = pageNumber
      loadRefsTab()
    })
}

function showReasonForm(reason) {
  if (!hasPerm('MANAGE_REFS')) return
  const isNew = !reason
  const kindOptions = actKindItems()
    .map(
      ([kindCode, label]) =>
        `<option value="${kindCode}" ${reason?.ACT_KIND === kindCode ? 'selected' : ''}>${label}</option>`,
    )
    .join('')
  const categoryOptions =
    '<option value="">—</option>' +
    reasonCategories
      .map(
        (category) =>
          `<option value="${category.ID}" ${String(reason?.CATEG || '') === String(category.ID) ? 'selected' : ''}>${escapeHtml(category.NAME || '')}</option>`,
      )
      .join('')

  const $modal = $(`
    <div class="modal-backdrop ref-modal-wrap">
      <div class="card ref-modal-card ref-modal-card-sm">
        <div class="ref-modal-head">
          <b>Причина составления</b>
          <button class="ref-close-btn rf-close">×</button>
        </div>
        <div class="ref-form">
          <div class="frow">
            <label>Название <span class="ref-required">*</span></label>
            <input class="inp rf-name" value="${escapeHtml(reason?.NAME || '')}" placeholder="Название причины...">
          </div>
          <div class="frow">
            <label>Тип акта</label>
            <select class="inp rf-kind">${kindOptions}</select>
          </div>
          <div class="frow">
            <label>Категория</label>
            <select class="inp rf-categ">${categoryOptions}</select>
          </div>
        </div>
        <div class="ref-modal-foot">
          <button class="btn ghost rf-cancel">Отмена</button>
          ${!isNew ? `<button class="btn danger rf-toggle">${reason?.ACTIVE === 'Y' ? 'Отключить' : 'Активировать'}</button>` : ''}
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
      reason?.ACTIVE === 'Y' ? 'Отключить причину?' : 'Активировать причину?'
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
      categ: $modal.find('.rf-categ').val(),
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
