import { sendApiRequest } from './api.js'
import { applicationState, hasPerm, references } from './state.js'
import { escapeHtml, formatDateTime } from './utils.js'
import {
  showToast,
  openModalWindow,
  closeModalWindow,
  showConfirmBox,
} from './ui.js'

let noticeRows = []
let noticePage = 1
let noticeTypeFilter = ''
const noticePageSize = 6
const noticeTextLimit = 180

// add 23.07.2026 BekmansurovRR
// значение фильтра вкладок для показа только непрочитанных уведомлений
const NOTICE_UNREAD_FILTER = '__unread__'

// add 23.07.2026 BekmansurovRR
// значение фильтра вкладок для показа только избранных уведомлений
const NOTICE_FAVORITE_FILTER = '__favorite__'

// add 23.07.2026 BekmansurovRR
// Иконки для строки уведомления
const NOTICE_STAR_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.6l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.1l6.1-.9z"/></svg>'
const NOTICE_MAIL_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7.5l8 5.2 8-5.2"/></svg>'

export function loadNoticeCount() {
  return sendApiRequest('gu23_notice_count').done((response) => {
    applicationState.noticeCount = Number((response && response.count) || 0)
  })
}

export function showNoticeCount() {
  const count = applicationState.noticeCount || 0
  $('.notice-badge, .notice-top-count')
    .text(count)
    .toggle(count > 0)
}

export function prepareNoticePanel() {
  const $headerForm = $('.headerrt .logout')
  if (!$('#notice-top').length && $headerForm.length) {
    $headerForm.prepend('<div class="notice-top" id="notice-top"></div>')
  }

  const $place = $('#notice-top')
  if (!$place.length || $place.children().length) return

  $place.html(`
    <button type="button" class="notice-top-btn" id="notice-top-btn" title="Уведомления">
      <img src="/img/nav/notification.svg" alt="">
      <b class="notice-top-count" style="display:none"></b>
    </button>
    <div class="notice-panel" id="notice-panel" style="display:none">
      <div class="notice-panel-tabs">
        <button type="button" class="active">Уведомления</button>
      </div>
      <div class="notice-panel-list" id="notice-panel-list"></div>
      <div class="notice-panel-foot">
        <button type="button" id="notice-panel-clear">Очистить</button>
        <button type="button" id="notice-panel-all">Все уведомления</button>
      </div>
    </div>
  `)

  $('#notice-top-btn').on('click', (event) => {
    event.stopPropagation()
    const $panel = $('#notice-panel')
    const isOpen = $panel.is(':visible')
    $('.notice-panel').hide()
    if (!isOpen) {
      $panel.show()
      noticePanelList()
    }
  })

  $('#notice-panel').on('click', (event) => event.stopPropagation())
  $('#notice-panel-clear').on('click', () => noticeClear())
  $('#notice-panel-all').on('click', () => {
    $('#notice-panel').hide()
    window.dispatchEvent(
      new CustomEvent('gu23-open-page', { detail: { page: 'notices' } }),
    )
  })
  $(document).on('click', () => $('#notice-panel').hide())
  $(window).on('scroll', () => $('#notice-panel').hide())
}
// Показ страницы уведомлений
export function showNotices(container) {
  $(container).load('pages/notices.php', () => {
    $('#btn-add-notice')
      .toggle(hasPerm('MANAGE_REFS'))
      .on('click', () => noticeForm(null))
    notices()
  })
}
// Список уведомлений
function notices() {
  const action = hasPerm('MANAGE_REFS') ? 'gu23_notices_all' : 'gu23_notices'

  sendApiRequest(action).done((response) => {
    noticeRows = (response && response.rows) || []
    noticePage = 1
    noticeTypeFilter = ''
    noticeRowsPage()
  })
}
// Список уведомлений для страницы
function noticeRowsPage() {
  const $list = $('#notice-list').empty()
  const filteredRows = noticeFilterRows()
  // add 23.07.2026 BekmansurovRR
  const lastPage = Math.max(1, Math.ceil(filteredRows.length / noticePageSize))
  if (noticePage > lastPage) noticePage = lastPage
  const start = (noticePage - 1) * noticePageSize
  const rows = filteredRows.slice(start, start + noticePageSize)

  noticeTypeTabs()

  if (!rows.length) {
    $list.html('<div class="empty-state">Уведомлений нет.</div>')
    $('#notice-pages').empty()
    return
  }

  rows.forEach((row) => {
    const isRead = row.IS_READ === 'Y'
    const isFavorite = row.IS_FAVORITE === 'Y'
    const canEdit = hasPerm('MANAGE_REFS')
    const bodyText = shortNoticeText(row.BODY || '')
    // add 23.07.2026 BekmansurovRR
    //  (избранное) слева,  (прочитано/не прочитано) справа
    const $item = $(`
      <button type="button" class="notice-item ${isRead ? '' : 'unread'}" data-id="${escapeHtml(row.ID || '')}">
        <span class="notice-fav ${isFavorite ? 'is-fav' : ''}" title="${isFavorite ? 'Убрать из избранного' : 'В избранное'}">${NOTICE_STAR_SVG}</span>
        <span class="notice-data">
          <span class="notice-head">
            <em class="notice-kind ${noticeTypeClass(row.NOTICE_TYPE)}">${noticeTypeName(row)}</em>
            <span class="notice-date">${formatDateTime(row.CREATED_AT || '')}</span>
            ${canEdit ? `<i>${row.ACTIVE === 'Y' ? 'Активна' : 'Отключена'}</i>` : ''}
          </span>
          <strong class="notice-title">${escapeHtml(row.TITLE || '')}</strong>
          ${bodyText ? `<span class="notice-text">${escapeHtml(bodyText)}</span>` : ''}
          ${row.IMAGE_PATH ? '<span class="notice-image-note"><b>Есть фото...</b></span>' : ''}
        </span>
        <span class="notice-actions">
          <span class="notice-mail ${isRead ? 'is-read' : 'is-unread'}" title="${isRead ? 'Прочитано (отметить непрочитанным)' : 'Не прочитано (отметить прочитанным)'}">${NOTICE_MAIL_SVG}</span>
          ${canEdit ? '<span class="notice-edit" title="Изменить">✎</span>' : ''}
        </span>
      </button>
    `)

    $item.on('click', () => {
      if ($item.hasClass('unread')) {
        noticeRead(row.ID, $item)
      }
      noticeView(row)
    })

    // add 23.07.2026 BekmansurovRR
    $item.find('.notice-fav').on('click', (event) => {
      event.stopPropagation()
      noticeFavorite(row, $item.find('.notice-fav'))
    })

    // add 23.07.2026 BekmansurovRR
    $item.find('.notice-mail').on('click', (event) => {
      event.stopPropagation()
      noticeReadToggle(row, $item, $item.find('.notice-mail'))
    })

    $item.find('.notice-edit').on('click', (event) => {
      event.stopPropagation()
      noticeForm(row)
    })

    $list.append($item)
  })

  noticePages()
}
// Фильтрация уведомлений по типу
function noticeFilterRows() {
  // add 23.07.2026 BekmansurovRR
  // вкладка "Непрочитанное"
  if (noticeTypeFilter === NOTICE_UNREAD_FILTER) {
    return noticeRows.filter((row) => row.IS_READ !== 'Y')
  }
  // add 23.07.2026 BekmansurovRR
  // вкладка "Избранное"
  if (noticeTypeFilter === NOTICE_FAVORITE_FILTER) {
    return noticeRows.filter((row) => row.IS_FAVORITE === 'Y')
  }
  if (!noticeTypeFilter) return noticeRows
  return noticeRows.filter(
    (row) => noticeTypeCode(row.NOTICE_TYPE) === noticeTypeFilter,
  )
}
// Вкладки типов уведомлений
function noticeTypeTabs() {
  const $place = $('#notice-type-tabs').empty()
  if (!$place.length) return

  const types = noticeTypes()
  //Вкладка "Все"
  const allCount = noticeRows.length
  let html = `<button type="button" class="notice-type-tab ${noticeTypeFilter === '' ? 'active' : ''}" data-type="">Все (${allCount})</button>`

  // add 23.07.2026 BekmansurovRR
  // вкладка "Избранное"
  const favoriteCount = noticeRows.filter(
    (row) => row.IS_FAVORITE === 'Y',
  ).length
  html += `<button type="button" class="notice-type-tab notice-type-tab-fav ${noticeTypeFilter === NOTICE_FAVORITE_FILTER ? 'active' : ''}" data-type="${NOTICE_FAVORITE_FILTER}" title="Избранное"><span class="notice-tab-star">${NOTICE_STAR_SVG}</span> (${favoriteCount})</button>`

  // add 23.07.2026 BekmansurovRR
  // вкладка "Непрочитанное"
  const unreadCount = noticeRows.filter((row) => row.IS_READ !== 'Y').length
  html += `<button type="button" class="notice-type-tab ${noticeTypeFilter === NOTICE_UNREAD_FILTER ? 'active' : ''}" data-type="${NOTICE_UNREAD_FILTER}">Непрочитанное (${unreadCount})</button>`

  types.forEach((type) => {
    const count = noticeRows.filter(
      (row) => noticeTypeCode(row.NOTICE_TYPE) === type.code,
    ).length
    html += `<button type="button" class="notice-type-tab ${noticeTypeFilter === type.code ? 'active' : ''}" data-type="${escapeHtml(type.code)}">${escapeHtml(type.name)} (${count})</button>`
  })

  $place.html(html)
  $place
    .off('click', '.notice-type-tab')
    .on('click', '.notice-type-tab', function () {
      noticeTypeFilter = String($(this).data('type') || '')
      noticePage = 1
      noticeRowsPage()
    })
}
// Получение списка типов уведомлений
function noticeTypes() {
  const fromRef = (references.noticeTypes || []).map((row) => ({
    code: noticeTypeCode(row.CODE || row.ID),
    name: row.NAME || row.CODE || row.ID,
  }))

  if (fromRef.length) return fromRef

  const types = {}
  noticeRows.forEach((row) => {
    const code = noticeTypeCode(row.NOTICE_TYPE)
    if (code) types[code] = row.NOTICE_TYPE_NAME || row.NOTICE_TYPE
  })

  return Object.keys(types).map((code) => ({ code, name: types[code] }))
}

function shortNoticeText(value) {
  const text = String(value || '').trim()
  if (text.length <= noticeTextLimit) return text
  return `${text.slice(0, noticeTextLimit).trim()}...`
}
// Просмотр уведомления
function noticeView(row) {
  const content = `
    <div class="notice-view">
      <div class="notice-view-info">
        <span class="notice-kind ${noticeTypeClass(row.NOTICE_TYPE)}">${noticeTypeName(row)}</span>
        <span>${formatDateTime(row.CREATED_AT || '')}</span>
        ${hasPerm('MANAGE_REFS') ? `<span>${row.ACTIVE === 'Y' ? 'Активна' : 'Отключена'}</span>` : ''}
      </div>
      <div class="notice-view-text">${escapeHtml(row.BODY || '')}</div>
      ${row.IMAGE_PATH ? `<img class="notice-view-image" src="${escapeHtml(row.IMAGE_PATH)}" alt="">` : ''}
    </div>
  `

  openModalWindow(row.TITLE || 'Уведомление', content, [
    { label: 'Закрыть', className: 'btn ghost', onClick: closeModalWindow },
  ])
}
// Список уведомлений для страницы
function noticePages() {
  const pages = Math.ceil(noticeFilterRows().length / noticePageSize)
  const $pages = $('#notice-pages').empty()
  if (pages <= 1) return

  let html = `<button class="page-btn notice-page-btn" data-page="${noticePage - 1}" ${noticePage <= 1 ? 'disabled' : ''}>‹</button>`
  for (let page = 1; page <= pages; page++) {
    html += `<button class="page-btn notice-page-btn ${page === noticePage ? 'page-btn-active' : ''}" data-page="${page}">${page}</button>`
  }
  html += `<button class="page-btn notice-page-btn" data-page="${noticePage + 1}" ${noticePage >= pages ? 'disabled' : ''}>›</button>`

  $pages.html(html)
  $pages
    .off('click', '.notice-page-btn')
    .on('click', '.notice-page-btn', function () {
      const page = Number($(this).data('page'))
      if (!page || page < 1 || page > pages || page === noticePage) return
      noticePage = page
      noticeRowsPage()
    })
}
// Отметка уведомления как прочитанного
function noticeRead(id, $item) {
  sendApiRequest('gu23_notice_read', { id: id }).done((response) => {
    if (!response || response.ok !== true) return

    $item.removeClass('unread')
    if ($item.hasClass('notice-panel-item')) {
      $item.remove()
      if (!$('#notice-panel-list .notice-panel-item').length) {
        $('#notice-panel-list').html(
          '<div class="notice-panel-empty">Новых уведомлений нет.</div>',
        )
      }
    }
    noticeRows.forEach((row) => {
      if (String(row.ID) === String(id)) row.IS_READ = 'Y'
    })
    loadNoticeCount().done(() => {
      showNoticeCount()
    })
    // add 23.07.2026 BekmansurovRR
    // держим список и счётчики вкладок актуальными на странице уведомлений
    if (!$item.hasClass('notice-panel-item') && $('#notice-list').length) {
      if (noticeTypeFilter === NOTICE_UNREAD_FILTER) {
        noticeRowsPage()
      } else {
        noticeTypeTabs()
      }
    }
  })
}
// add 23.07.2026 BekmansurovRR
// Переключение признака "избранное" (иконка-звезда)
function noticeFavorite(row, $fav) {
  sendApiRequest('gu23_notice_favorite', { id: row.ID }).done((response) => {
    if (!response || response.ok !== true) {
      showToast((response && response.msg) || 'Ошибка', 'err')
      return
    }

    const favorite = response.favorite === 'Y'
    row.IS_FAVORITE = favorite ? 'Y' : 'N'
    noticeRows.forEach((item) => {
      if (String(item.ID) === String(row.ID)) item.IS_FAVORITE = row.IS_FAVORITE
    })
    $fav
      .toggleClass('is-fav', favorite)
      .attr('title', favorite ? 'Убрать из избранного' : 'В избранное')
    // add 23.07.2026 BekmansurovRR
    // на вкладке "Избранное" убираем снятую запись из списка
    if (noticeTypeFilter === NOTICE_FAVORITE_FILTER) {
      noticeRowsPage()
    } else {
      noticeTypeTabs()
    }
  })
}
// add 23.07.2026 BekmansurovRR
// Ручное переключение признака прочтения (иконка-конверт)
function noticeReadToggle(row, $item, $mail) {
  const makeRead = row.IS_READ !== 'Y'
  sendApiRequest('gu23_notice_read_set', {
    id: row.ID,
    read: makeRead ? 'Y' : 'N',
  }).done((response) => {
    if (!response || response.ok !== true) {
      showToast((response && response.msg) || 'Ошибка', 'err')
      return
    }

    row.IS_READ = makeRead ? 'Y' : 'N'
    noticeRows.forEach((item) => {
      if (String(item.ID) === String(row.ID)) item.IS_READ = row.IS_READ
    })
    $item.toggleClass('unread', !makeRead)
    $mail
      .toggleClass('is-read', makeRead)
      .toggleClass('is-unread', !makeRead)
      .attr(
        'title',
        makeRead
          ? 'Прочитано (отметить непрочитанным)'
          : 'Не прочитано (отметить прочитанным)',
      )
    loadNoticeCount().done(showNoticeCount)
    // add 23.07.2026 BekmansurovRR
    // на вкладке "Непрочитанное" убираем прочитанную запись из списка,
    // иначе обновляем счётчики вкладок
    if (noticeTypeFilter === NOTICE_UNREAD_FILTER) {
      noticeRowsPage()
    } else {
      noticeTypeTabs()
    }
  })
}
// Список уведомлений
function noticePanelList() {
  sendApiRequest('gu23_notices').done((response) => {
    const rows = ((response && response.rows) || []).filter(
      (row) => row.IS_READ !== 'Y',
    )
    const $list = $('#notice-panel-list').empty()

    if (!rows.length) {
      $list.html('<div class="notice-panel-empty">Новых уведомлений нет.</div>')
      return
    }

    rows.forEach((row) => {
      const isRead = row.IS_READ === 'Y'
      const $item = $(`
        <button type="button" class="notice-panel-item ${isRead ? '' : 'unread'}" data-id="${escapeHtml(row.ID || '')}">
          <span class="notice-panel-kind ${noticeTypeClass(row.NOTICE_TYPE)}">${noticeTypeName(row)}</span>
          <strong>${escapeHtml(row.TITLE || '')}</strong>
          <small>${formatDateTime(row.CREATED_AT || '')}</small>
        </button>
      `)

      $item.on('click', () => {
        $('#notice-panel').hide()
        noticeView(row)
        if ($item.hasClass('unread')) {
          noticeRead(row.ID, $item)
        }
      })

      $list.append($item)
    })
  })
}
// Очистка уведомлений
function noticeClear() {
  sendApiRequest('gu23_notice_read_all').done((response) => {
    if (!response || response.ok !== true) {
      showToast((response && response.msg) || 'Ошибка', 'err')
      return
    }

    $('#notice-panel-list').html(
      '<div class="notice-panel-empty">Новых уведомлений нет.</div>',
    )
    noticeRows.forEach((row) => {
      row.IS_READ = 'Y'
    })
    if ($('#notice-list').length) {
      noticeRowsPage()
    }
    loadNoticeCount().done(showNoticeCount)
  })
}
// Форма редактирования/создания записи
function noticeForm(row) {
  const isNew = !row
  const firstType = (references.noticeTypes || [])[0] || {}
  const type = String(
    row?.NOTICE_TYPE || firstType.CODE || firstType.ID || '',
  ).toLowerCase()
  const typeOptions = noticeTypeOptions(type)
  const content = `
    <div class="notice-form">
      <label>Заголовок</label>
      <input class="inp nf-title" value="${escapeHtml(row?.TITLE || '')}">

      <label>Тип</label>
      <select class="inp nf-type">
        ${typeOptions}
      </select>

      <label>Текст</label>
      <textarea class="inp nf-body" rows="6">${escapeHtml(row?.BODY || '')}</textarea>

      <label>Картинка</label>
      <input type="hidden" class="nf-image-path" value="${escapeHtml(row?.IMAGE_PATH || '')}">
      <div class="notice-image-field">
        <input type="text" class="inp nf-image-text" value="${escapeHtml(row?.IMAGE_PATH || '')}" placeholder="/gu23/img/news/example.png">
        <input type="file" class="nf-image-file" accept="image/*" style="display:none">
        <button type="button" class="btn ghost sm nf-image-btn">Загрузить</button>
      </div>
      <div class="notice-image-preview">${row?.IMAGE_PATH ? `<img src="${escapeHtml(row.IMAGE_PATH)}" alt="">` : ''}</div>
    </div>
  `

  const buttons = [
    { label: 'Отмена', className: 'btn ghost', onClick: closeModalWindow },
  ]

  if (!isNew) {
    buttons.push({
      label: row.ACTIVE === 'Y' ? 'Отключить' : 'Активировать',
      className: 'btn ghost',
      onClick: () => noticeToggle(row),
    })
  }

  buttons.push({
    label: 'Сохранить',
    className: 'btn primary',
    onClick: () => noticeSave(row),
  })

  openModalWindow(
    isNew ? 'Новая запись' : 'Уведомление',
    content,
    buttons,
    'notice-modal',
  )

  $('.nf-image-btn').on('click', () => $('.nf-image-file').trigger('click'))
  $('.nf-image-file').on('change', function () {
    const file = this.files && this.files[0]
    if (file) noticeImageUpload(file)
  })
  $('.nf-image-text').on('input', function () {
    $('.nf-image-path').val($(this).val().trim())
  })
}
// Сохранение записи
function noticeSave(row) {
  const title = $('.nf-title').val().trim()
  if (!title) {
    showToast('Укажите заголовок', 'err')
    return
  }

  sendApiRequest('gu23_notice_save', {
    id: row?.ID || 0,
    title: title,
    notice_type: $('.nf-type').val(),
    body: $('.nf-body').val().trim(),
    image_path: $('.nf-image-path').val().trim(),
  }).done((response) => {
    if (!response || response.ok !== true) {
      showToast((response && response.msg) || 'Ошибка сохранения', 'err')
      return
    }

    closeModalWindow()
    showToast('Сохранено', 'ok')
    notices()
    loadNoticeCount().done(showNoticeCount)
  })
}
// Включение/отключение записи
function noticeToggle(row) {
  showConfirmBox(
    row.ACTIVE === 'Y' ? 'Отключить запись?' : 'Активировать запись?',
    row.TITLE || '',
    () => {
      sendApiRequest('gu23_notice_toggle', { id: row.ID }).done((response) => {
        if (!response || response.ok !== true) {
          showToast((response && response.msg) || 'Ошибка', 'err')
          return
        }

        closeModalWindow()
        notices()
        loadNoticeCount().done(showNoticeCount)
      })
    },
  )
}
// Загрузка картинки для уведомления
function noticeImageUpload(file) {
  const formData = new FormData()
  formData.append('ajax_action', 'gu23_notice_image_upload')
  formData.append('file', file)

  $.ajax({
    url: '/gu23/data.php',
    type: 'POST',
    dataType: 'json',
    data: formData,
    processData: false,
    contentType: false,
  }).done((response) => {
    if (!response || response.ok !== true) {
      showToast((response && response.msg) || 'Ошибка загрузки', 'err')
      return
    }

    $('.nf-image-path').val(response.path || '')
    $('.nf-image-text').val(response.path || '')
    $('.notice-image-preview').html(
      response.path ? `<img src="${escapeHtml(response.path)}" alt="">` : '',
    )
  })
}

function noticeTypeName(row) {
  const code = String(row?.NOTICE_TYPE || '').toLowerCase()
  const found = (references.noticeTypes || []).find((item) => {
    const itemCode = String(item.CODE || item.ID || '').toLowerCase()
    return itemCode === code
  })

  if (found)
    return escapeHtml(found.NAME || found.CODE || found.ID || 'Сообщение')

  const fromRow = row?.NOTICE_TYPE_NAME || ''
  if (fromRow) return escapeHtml(fromRow)

  return escapeHtml(found?.NAME || row?.NOTICE_TYPE || 'Сообщение')
}

function noticeTypeOptions(current) {
  const rows = references.noticeTypes || []
  if (!rows.length) {
    return `<option value="${escapeHtml(current || '')}">${escapeHtml(current || 'Сообщение')}</option>`
  }

  return rows
    .map((row) => {
      const value = String(row.CODE || row.ID || '')
      const selected = value.toLowerCase() === current ? 'selected' : ''
      return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(row.NAME || value)}</option>`
    })
    .join('')
}

function noticeTypeClass(value) {
  const code = noticeTypeCode(value)
  return `notice-kind-${code || 'notice'}`
}

function noticeTypeCode(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}
