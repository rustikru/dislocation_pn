import { sendApiRequest } from './api.js'
import { navigateTo } from './app.js'
import { parseWagonsFromText, escapeHtml, formatDate } from './utils.js'
import { showStatusChip, showTypeChip } from './ui.js'

export function showWagonSearch(container) {
  $(container).load('pages/wagon_search.php', showWagonSearchPage)
}

function showWagonSearchPage() {
  const searchWagonActs = () => {
    const rawValue = $('#wagon-search-input').val()
    const parsedNumber = parseWagonsFromText(rawValue)[0] || rawValue.trim()

    if (!parsedNumber) return

    sendApiRequest('gu23_get_by_wagon', { wagon: parsedNumber }).done(
      (list) => {
        const acts = list || []
        let rowsHtml = ''

        if (!acts.length) {
          rowsHtml = `<tr><td colspan="7" class="muted" style="padding:24px;text-align:center">Актов не найдено</td></tr>`
        } else {
          rowsHtml = acts
            .map(
              (act) => `
          <tr class="wagon-act-row" data-id="${act.ID}">
            <td class="num">${escapeHtml(act.ACT_NUMBER)}</td>
            <td>${showTypeChip(act.ACT_TYPE)}</td>
            <td>${escapeHtml(act.DEPT)}</td>
            <td class="muted text-ellipsis" style="max-width:230px">${escapeHtml(act.REASON)}</td>
            <td class="num">${act.WAGON_CNT || 0}</td>
            <td class="muted">${formatDate(act.CREATED_AT)}</td>
            <td>${showStatusChip(act.STATUS)}</td>
          </tr>
        `,
            )
            .join('')
        }

        $('#wagon-search-results')
          .html(
            `
        <div class="card">
          <div style="overflow:auto">
            <table class="tbl">
              <thead><tr><th>Номер</th><th>Тип</th><th>Цех</th><th>Причина</th><th>Вагоны</th><th>Создан</th><th>Статус</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `,
          )
          .find('.wagon-act-row')
          .on('click', function () {
            navigateTo('card', $(this).data('id'))
          })
      },
    )
  }

  $('#btn-wagon-search-run').on('click', searchWagonActs)
  $('#wagon-search-input').on('keydown', (e) => {
    if (e.key === 'Enter') searchWagonActs()
  })
}
