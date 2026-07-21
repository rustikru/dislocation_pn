import { sendApiRequest } from './api.js'
import { applicationState, hasPerm } from './state.js'
import { escapeHtml, formatDateTime } from './utils.js'
import { showToast, openModalWindow, closeModalWindow, showConfirmBox } from './ui.js'

export function loadNoticeCount() {
  return sendApiRequest('gu23_notice_count').done((response) => {
    applicationState.noticeCount = Number((response && response.count) || 0)
  })
}

export function showNotices(container) {
  $(container).load('pages/notices.php', () => {
    $('#btn-add-notice')
      .toggle(hasPerm('MANAGE_REFS'))
      .on('click', () => noticeForm(null))
    notices()
  })
}

function notices() {
  const action = hasPerm('MANAGE_REFS') ? 'gu23_notices_all' : 'gu23_notices'

  sendApiRequest(action).done((response) => {
    const rows = (response && response.rows) || []
    const $list = $('#notice-list').empty()

    if (!rows.length) {
      $list.html('<div class="empty-state">Уведомлений нет.</div>')
      return
    }

    rows.forEach((row) => {
      const isRead = row.IS_READ === 'Y'
      const canEdit = hasPerm('MANAGE_REFS')
      const $item = $(`
        <button type="button" class="notice-item ${isRead ? '' : 'unread'}" data-id="${escapeHtml(row.ID || '')}">
          <span class="notice-head">
            <strong>${escapeHtml(row.TITLE || '')}</strong>
            <em class="notice-kind ${noticeTypeClass(row.NOTICE_TYPE)}">${noticeKind(row.NOTICE_TYPE)}</em>
            ${canEdit ? `<i>${row.ACTIVE === 'Y' ? 'Активна' : 'Отключена'}</i>` : ''}
          </span>
          <span class="notice-date">${formatDateTime(row.CREATED_AT || '')}</span>
          <span class="notice-text">${escapeHtml(row.BODY || '')}</span>
          ${row.IMAGE_PATH ? `<img class="notice-image" src="${escapeHtml(row.IMAGE_PATH)}" alt="">` : ''}
          ${canEdit ? '<span class="notice-actions"><span class="btn ghost sm notice-edit">Изменить</span></span>' : ''}
        </button>
      `)

      $item.on('click', () => {
        if ($item.hasClass('unread')) {
          noticeRead(row.ID, $item)
        }
      })

      $item.find('.notice-edit').on('click', (event) => {
        event.stopPropagation()
        noticeForm(row)
      })

      $list.append($item)
    })
  })
}

function noticeRead(id, $item) {
  sendApiRequest('gu23_notice_read', { id: id }).done((response) => {
    if (!response || response.ok !== true) return

    $item.removeClass('unread')
    loadNoticeCount().done(() => {
      const count = applicationState.noticeCount || 0
      $('.notice-badge').text(count).toggle(count > 0)
    })
  })
}

function noticeForm(row) {
  const isNew = !row
  const type = String(row?.NOTICE_TYPE || 'news').toLowerCase()
  const content = `
    <div class="notice-form">
      <label>Заголовок</label>
      <input class="inp nf-title" value="${escapeHtml(row?.TITLE || '')}">

      <label>Тип</label>
      <select class="inp nf-type">
        <option value="news" ${type === 'news' ? 'selected' : ''}>Новость</option>
        <option value="hint" ${type === 'hint' ? 'selected' : ''}>Подсказка</option>
        <option value="warning" ${type === 'warning' ? 'selected' : ''}>Важно</option>
        <option value="update" ${type === 'update' ? 'selected' : ''}>Доработка</option>
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

  openModalWindow(isNew ? 'Новая запись' : 'Новость', content, buttons)

  $('.nf-image-btn').on('click', () => $('.nf-image-file').trigger('click'))
  $('.nf-image-file').on('change', function () {
    const file = this.files && this.files[0]
    if (file) noticeImageUpload(file)
  })
  $('.nf-image-text').on('input', function () {
    $('.nf-image-path').val($(this).val().trim())
  })
}

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
    loadNoticeCount()
  })
}

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
        loadNoticeCount()
      })
    },
  )
}

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

function noticeKind(value) {
  const names = {
    news: 'Новость',
    hint: 'Подсказка',
    warning: 'Важно',
    update: 'Доработка',
  }
  return names[String(value || '').toLowerCase()] || 'Сообщение'
}

function noticeTypeClass(value) {
  return `notice-kind-${String(value || '').toLowerCase() || 'news'}`
}
