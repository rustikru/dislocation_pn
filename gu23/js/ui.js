import { escapeHtml } from './utils.js'

// Справочники отображения статусов
const actTypeLabels = {
  start: { label: 'Начало простоя', className: 'typ-start' },
  end: { label: 'Окончание простоя', className: 'typ-end' },
  other: { label: 'Прочий акт', className: 'typ-other' },
}

const actStatusLabels = {
  draft: { label: 'Проект', className: 'st-draft' },
  active: { label: 'Открыт', className: 'st-signed' },
  closed: { label: 'Закрыт', className: 'st-closed' },
  annulled: { label: 'Аннулирован', className: 'st-annulled' },
  signed: { label: 'Подписан', className: 'st-signed' },
  rejected: { label: 'Отклонён', className: 'st-rejected' },
  on_correction: { label: 'На корректировке', className: 'st-oncorrection' },
}

export function showStatusChip(status) {
  const statusInfo = actStatusLabels[status] || {
    label: status,
    className: 'st-draft',
  }
  return `<span class="chip ${statusInfo.className}">${statusInfo.label}</span>`
}
/* Название типа акта */
export function showTypeName(type) {
  const typeInfo = actTypeLabels[type] || {
    label: type,
    className: 'typ-other',
  }
  return typeInfo.label
}

/* Название статуса акта */
export function showStatusName(status) {
  const statusInfo = actStatusLabels[status] || {
    label: status,
    className: 'st-draft',
  }
  return statusInfo.label
}

export function showTypeChip(type) {
  const typeInfo = actTypeLabels[type] || {
    label: type,
    className: 'typ-other',
  }
  return `<span class="typchip ${typeInfo.className}">${typeInfo.label}</span>`
}

// Шаблон поля формы
export function showFormField(label, inputHtml, isRequired = false) {
  return `
    <div class="frow">
      <label>${label} ${isRequired ? '<span class="req">*</span>' : ''}</label>
      ${inputHtml}
    </div>
  `
}

// Уведомления
export function showToast(message, type) {
  const duration = type === 'err' ? 7000 : type === 'ok' ? 4500 : 5000
  const $toast = $(
    `<div class="toast ${type || ''}" role="alert">${escapeHtml(message)}</div>`,
  ).appendTo('body')

  // плавное появление
  requestAnimationFrame(() => $toast.addClass('show'))

  const hide = () => {
    $toast.removeClass('show')
    setTimeout(() => $toast.remove(), 250)
  }

  const timer = setTimeout(hide, duration)
  // закрытие по клику
  $toast.on('click', () => {
    clearTimeout(timer)
    hide()
  })
}

// модальное окошко
export function openModalWindow(title, contentHtml, buttons = [], boxClass = '') {
  const className = String(boxClass || '').replace(/[^a-zA-Z0-9_-]/g, '')
  const footerButtonsHtml = buttons
    .map(
      (button, index) => `
    <button class="${button.className}" id="modal-btn-${index}">${button.label}</button>
  `,
    )
    .join('')

  const modalHtml = `
    <div class="scrim" id="modal-backdrop">
      <div class="modal${className ? ` ${className}` : ''}">
        <div class="mhead">
          <h3>${escapeHtml(title)}</h3>
          <button class="x" id="modal-close-x">×</button>
        </div>
        <div class="mbody">${contentHtml}</div>
        <div class="mfoot">${footerButtonsHtml}</div>
      </div>
    </div>
  `

  $('#modalRoot').html(modalHtml)

  // Навешиваем события на кнопки
  $('#modal-close-x, #modal-backdrop').on('click', function (e) {
    if (e.target === this) closeModalWindow()
  })

  buttons.forEach((button, index) => {
    $(`#modal-btn-${index}`).on('click', () => button.onClick())
  })
}

export function closeModalWindow() {
  $('#modalRoot').empty()
}

// Окно подтверждения
export function showConfirmBox(title, message, onConfirm) {
  const content = `<p>${escapeHtml(message)}</p>`
  openModalWindow(title, content, [
    { label: 'Отмена', className: 'btn ghost', onClick: closeModalWindow },
    {
      label: 'Подтвердить',
      className: 'btn primary',
      onClick: () => {
        closeModalWindow()
        onConfirm()
      },
    },
  ])
}

// Окно ввода текста
export function showPromptBox(title, message, onConfirm) {
  const content = `
    <p>${escapeHtml(message)}</p>
    <textarea class="inp" id="prompt-textarea" style="min-height:80px"></textarea>
  `
  openModalWindow(title, content, [
    { label: 'Отмена', className: 'btn ghost', onClick: closeModalWindow },
    {
      label: 'OK',
      className: 'btn primary',
      onClick: () => {
        const value = $('#prompt-textarea').val().trim()
        closeModalWindow()
        onConfirm(value)
      },
    },
  ])
}
