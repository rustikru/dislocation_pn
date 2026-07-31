import { sendApiRequest } from './api.js'
import { escapeHtml } from './utils.js'
import {
  showToast,
  showConfirmBox,
  openModalWindow,
  closeModalWindow,
} from './ui.js'
import { hasPerm } from './state.js'

let refsTab = 'signers'
let refsSearch = ''
let refsPage = 1
let currentItems = []
let reasonCategories = []
let reasonCateg = ''
let searchTimer = null

const REFS_PAGE_SIZE = 20 //
let refsPageSize = REFS_PAGE_SIZE

export function showRefs(container) {
  refsSearch = ''
  refsPage = 1
  currentItems = []
  reasonCategories = []
  reasonCateg = ''

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
    reasonCateg = ''
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
        <input type="hidden" name="categ">
      </form>
    `)
    $form.find('[name="search"]').val(refsSearch)
    $form.find('[name="categ"]').val(reasonCateg)
    $('body').append($form)
    $form.trigger('submit')
    $form.remove()
  })

  $(container).on('change.refs', '.reason-filter', function () {
    reasonCateg = $('#reason-filter-categ').val() || ''
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
    categ: refsTab === 'reasons' ? reasonCateg : '',
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

function reasonsPageButtonsHtml(total, page) {
  const pages = Math.ceil(total / refsPageSize)
  if (pages <= 1)
    return `<div class="reasons-pagination-total">Всего: ${total}</div>`

  const pageNumbers = []
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNumbers.push(i)
  } else if (page <= 3) {
    pageNumbers.push(1, 2, 3, 'ellipsis', pages)
  } else if (page >= pages - 2) {
    pageNumbers.push(1, 'ellipsis', pages - 2, pages - 1, pages)
  } else {
    pageNumbers.push(
      1,
      'ellipsis-left',
      page - 1,
      page,
      page + 1,
      'ellipsis-right',
      pages,
    )
  }

  const buttons = pageNumbers
    .map((item) => {
      if (String(item).startsWith('ellipsis')) {
        return '<span class="reasons-page-ellipsis">…</span>'
      }
      return `
        <button
          type="button"
          class="pager-btn page-btn ${item === page ? 'page-btn-active' : ''}"
          data-page="${item}"
          aria-label="Страница ${item}"
          ${item === page ? 'aria-current="page"' : ''}
        >${item}</button>`
    })
    .join('')

  return `
    <div class="reasons-pagination" aria-label="Страницы справочника причин">
      <button
        type="button"
        class="pager-btn page-btn"
        data-page="${page - 1}"
        aria-label="Предыдущая страница"
        ${page <= 1 ? 'disabled' : ''}
      >‹</button>
      ${buttons}
      <button
        type="button"
        class="pager-btn page-btn"
        data-page="${page + 1}"
        aria-label="Следующая страница"
        ${page >= pages ? 'disabled' : ''}
      >›</button>
    </div>
  `
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
            ${active ? 'Активный' : 'Неактивный'}
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

  const content = `
    <div class="ref-form">
      <div class="frow">
        <label>ФИО <span class="req">*</span></label>
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
  `

  const saveSigner = () => {
    const fio = $('.sf-fio').val().trim()
    if (!fio) {
      showToast('ФИО обязательно', 'err')
      return
    }
    sendApiRequest('gu23_ref_signer_save', {
      id: signer?.ID || 0,
      fio,
      post: $('.sf-post').val().trim(),
      org: $('.sf-org').val().trim(),
      unit: $('.sf-unit').val().trim(),
    }).done((r) => {
      if (r && r.ok) {
        closeModalWindow()
        showToast(isNew ? 'Подписант добавлен' : 'Изменения сохранены', 'ok')
        reloadRefs()
      } else {
        showToast((r && r.msg) || 'Ошибка', 'err')
      }
    })
  }

  const toggleSigner = () => {
    const msg =
      signer?.ACTIVE === 'Y'
        ? 'Отключить подписанта?'
        : 'Активировать подписанта?'
    showConfirmBox('Изменить статус', msg, () => {
      sendApiRequest('gu23_ref_signer_toggle', { id: signer.ID }).done((r) => {
        if (r && r.ok) {
          closeModalWindow()
          reloadRefs()
        } else showToast((r && r.msg) || 'Ошибка', 'err')
      })
    })
  }

  const buttons = [
    { label: 'Отмена', className: 'btn ghost', onClick: closeModalWindow },
  ]
  if (!isNew) {
    buttons.push({
      label: signer?.ACTIVE === 'Y' ? 'Отключить' : 'Активировать',
      className: 'btn ghost',
      onClick: toggleSigner,
    })
  }
  buttons.push({
    label: 'Сохранить',
    className: 'btn primary',
    onClick: saveSigner,
  })

  openModalWindow(
    isNew ? 'Новый подписант' : 'Подписант',
    content,
    buttons,
    'notice-modal',
  )
  $('.sf-fio').focus()
}

// ─────────────────────────────────────────────
// Причины составления
// ─────────────────────────────────────────────

function showReasonsList(items, total, page) {
  const canEditRefs = hasPerm('MANAGE_REFS')
  const categoryOptions =
    '<option value="">Все</option>' +
    reasonCategories
      .map(
        (category) =>
          `<option value="${category.ID}" ${String(reasonCateg) === String(category.ID) ? 'selected' : ''}>${escapeHtml(category.NAME || '')}</option>`,
      )
      .join('')
  const rows = items
    .map(
      (reason) => `
        <tr data-id="${escapeHtml(reason.ID || '')}" style="${canEditRefs ? 'cursor:pointer;' : ''}font-size:13px" title="${canEditRefs ? 'Нажмите для редактирования' : ''}">
          <td style="padding:5px 8px" class="muted">${escapeHtml(reason.ID || '')}</td>
          <td style="padding:5px 8px">${escapeHtml(reason.NAME || '')}</td>
          <td style="padding:5px 8px" class="muted">${escapeHtml(reason.CATEG_NAME || '—')}</td>
        </tr>`,
    )
    .join('')

  $('#refs-body').html(`
    <div class="card">
      <div style="overflow-x:auto">
        <table class="tbl" style="width:100%;font-size:13px">
          <thead>
            <tr style="font-size:12px">
              <th style="padding:5px 8px">Код причины</th>
              <th style="padding:5px 8px">Название</th>
              <th style="padding:5px 8px">Категория</th>
            </tr>
            <tr>
              <th style="padding:3px 8px"></th>
              <th style="padding:3px 8px"></th>
              <th style="padding:3px 8px">
                <select class="inp reason-filter" id="reason-filter-categ" style="font-size:12px;padding:3px 7px;min-width:140px;height:30px">${categoryOptions}</select>
              </th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="3" class="muted" style="padding:4px 8px;font-size:12px;line-height:18px">Нет записей</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    ${reasonsPageButtonsHtml(total, page)}
  `)

  $('#refs-body')
    .off('click', 'tbody tr')
    .on('click', 'tbody tr', function () {
      if (!canEditRefs) return
      const id = String($(this).attr('data-id') || '')
      const reason = currentItems.find((item) => String(item.ID) === id)
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
  const categoryOptions =
    '<option value="">—</option>' +
    reasonCategories
      .map(
        (category) =>
          `<option value="${category.ID}" ${String(reason?.CATEG || '') === String(category.ID) ? 'selected' : ''}>${escapeHtml(category.NAME || '')}</option>`,
      )
      .join('')

  const content = `
    <div class="ref-form">
      <div class="frow">
        <label>Код причины <span class="req">*</span></label>
        <input class="inp rf-short-code" value="${escapeHtml(reason?.ID || '')}" ${isNew ? '' : 'readonly'} placeholder="Код причины">
      </div>
      <div class="frow">
        <label>Название <span class="req">*</span></label>
        <input class="inp rf-name" value="${escapeHtml(reason?.NAME || '')}" placeholder="Название причины...">
      </div>
      <div class="frow">
        <label>Категория</label>
        <select class="inp rf-categ">${categoryOptions}</select>
      </div>
    </div>
  `

  const saveReason = () => {
    const shortCode = $('.rf-short-code').val().trim()
    const name = $('.rf-name').val().trim()
    if (!shortCode) {
      showToast('Код причины обязателен', 'err')
      return
    }
    if (!name) {
      showToast('Название обязательно', 'err')
      return
    }
    sendApiRequest('gu23_ref_reason_save', {
      short_code: shortCode,
      name,
      categ: $('.rf-categ').val(),
      is_new: isNew ? 'Y' : 'N',
    }).done((response) => {
      if (response && response.ok) {
        closeModalWindow()
        showToast(isNew ? 'Причина добавлена' : 'Изменения сохранены', 'ok')
        reloadRefs()
      } else {
        showToast((response && response.msg) || 'Ошибка', 'err')
      }
    })
  }

  openModalWindow(
    isNew ? 'Новая причина' : 'Причина составления',
    content,
    [
      { label: 'Отмена', className: 'btn ghost', onClick: closeModalWindow },
      { label: 'Сохранить', className: 'btn primary', onClick: saveReason },
    ],
    'notice-modal',
  )
  $(isNew ? '.rf-short-code' : '.rf-name').focus()
}
