import { sendApiRequest } from '../api.js'
import { escapeHtml } from '../utils.js'
import { showToast, showConfirmBox } from './ui.js'

export function showRoles(container) {
  currentSearch = ''
  currentPage = 1
  currentItems = []

  $(container).html(`
    <h1>Hello</h1>
`)
}
