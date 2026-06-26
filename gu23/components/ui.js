import { escapeHtml } from '../utils.js'

// Справочники отображения статусов
const actTypesConfig = {
  start: { label: 'Начало простоя', className: 'typ-start' },
  end: { label: 'Окончание простоя', className: 'typ-end' },
  other: { label: 'Прочий акт', className: 'typ-other' },
}

const actStatusesConfig = {
  draft: { label: 'Проект', className: 'st-draft' },
  active: { label: 'Открыт', className: 'st-signed' },
  closed: { label: 'Закрыт', className: 'st-closed' },
  annulled: { label: 'Аннулирован', className: 'st-annulled' },
  signed: { label: 'Подписан', className: 'st-signed' },
  rejected: { label: 'Отклонён', className: 'st-annulled' },
}

export function showStatusChip(status) {
  const config = actStatusesConfig[status] || {
    label: status,
    className: 'st-draft',
  }
  return `<span class="chip ${config.className}">${config.label}</span>`
}
/* Название типа акта */
export function showTypeName(type) {
  const config = actTypesConfig[type] || { label: type, className: 'typ-other' }
  return config.label
}

/* Название статуса акта */
export function showStatusName(status) {
  const config = actStatusesConfig[status] || {
    label: status,
    className: 'st-draft',
  }
  return config.label
}

export function showTypeChip(type) {
  const config = actTypesConfig[type] || { label: type, className: 'typ-other' }
  return `<span class="typchip ${config.className}">${config.label}</span>`
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
  const icon = type === 'ok' ? ' ' : type === 'err' ? ' ' : ''
  const toastHtml = `
    <div class="toast ${type || ''}">
      ${icon}${escapeHtml(message)}
    </div>
  `
  const $toast = $(toastHtml).appendTo('body')
  setTimeout(() => $toast.remove(), 3200)
}

// модальное окошко
export function openModalWindow(title, contentHtml, buttons = []) {
  const footerButtonsHtml = buttons
    .map(
      (button, index) => `
    <button class="${button.className}" id="modal-btn-${index}">${button.label}</button>
  `,
    )
    .join('')

  const modalHtml = `
    <div class="scrim" id="modal-backdrop">
      <div class="modal">
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
    $(`#modal-btn-${index}`).on('click', () => button.callback())
  })
}

export function closeModalWindow() {
  $('#modalRoot').empty()
}

// Окно подтверждения
export function showConfirmBox(title, message, onConfirm) {
  const content = `<p>${escapeHtml(message)}</p>`
  openModalWindow(title, content, [
    { label: 'Отмена', className: 'btn ghost', callback: closeModalWindow },
    {
      label: 'Подтвердить',
      className: 'btn primary',
      callback: () => {
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
    { label: 'Отмена', className: 'btn ghost', callback: closeModalWindow },
    {
      label: 'OK',
      className: 'btn primary',
      callback: () => {
        const value = $('#prompt-textarea').val().trim()
        closeModalWindow()
        onConfirm(value)
      },
    },
  ])
}
