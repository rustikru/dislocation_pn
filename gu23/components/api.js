import { showToast } from './ui.js'

export function sendApiRequest(action, data) {
  return $.ajax({
    url: '/data.php',
    type: 'POST',
    dataType: 'json',
    data: $.extend({ ajax_action: action }, data || {}),
  })
}

// Настройка индикатора загрузки и перехват ошибок сервера
$(document).ready(() => {
  $(document).ajaxStart(() => $('.loadImg').show())
  $(document).ajaxStop(() => $('.loadImg').hide())

  $(document).ajaxError((event, jqXHR, settings, thrownError) => {
    const errorDetail = thrownError || jqXHR.statusText || ''
    const responseBody = jqXHR.responseText || ''
    let serverMessage = ''

    try {
      serverMessage = JSON.parse(responseBody).msg || ''
    } catch (e) {}

    let actionName = ''
    try {
      actionName = new URLSearchParams(settings.data).get('ajax_action') || ''
    } catch (e) {}

    console.error(`Ajax ошибка [${actionName}]`, jqXHR.status, errorDetail)

    const finalMessage = serverMessage
      ? `: ${serverMessage}`
      : errorDetail
        ? `: ${errorDetail}`
        : ''
    showToast(
      `Ошибка сервера [${actionName || jqXHR.status}]${finalMessage}`,
      'err',
    )
  })
})
