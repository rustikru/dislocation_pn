class Directory {
  // Кол-во записей для отображения на странице
  static PAGE_SIZE = 15
  static GLOBAL_PAGE_SIZE = 100

  constructor(data) {
    this.data = data || []   
    this.tableRegistry = {}
    this.tableIdCounter = 0
    this._cachedRows = null
    this._lastCacheKey = null

    const loader = document.getElementById('loadingState')
    if (loader) loader.style.display = 'none'

    this._bindEvents()
    this._initFilters()
    this.render()
  }

  _debounce(fn, delay = 250) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => fn.apply(this, args), delay)
    }
  }

  _bindEvents() {
    document.getElementById('searchInput').addEventListener(
      'input',
      this._debounce(() => this.render(), 250),
    )

    document.getElementById('filterOrg').addEventListener('change', () => {
      document.getElementById('filterDiv').value = ''
      document.getElementById('filterDep').value = ''
      this._updateCascade()
    })

    document.getElementById('filterDiv').addEventListener('change', () => {
      document.getElementById('filterDep').value = ''
      this._updateCascade()
    })

    document
      .getElementById('filterDep')
      .addEventListener('change', () => this.render())
  }

  _initFilters() {
    this._populateSelect('filterOrg', this._unique('org'))
    this._updateCascade()
    //document.getElementById('totalCount').textContent = this.data.length
  }

  _updateCascade() {
    const orgF = document.getElementById('filterOrg').value

    const divSource = orgF ? this.data.filter((r) => r.org === orgF) : this.data
    const divs = [
      ...new Set(divSource.map((r) => r.div).filter(Boolean)),
    ].sort()
    this._populateSelect('filterDiv', divs)

    const actualDiv = document.getElementById('filterDiv').value
    let depSource = this.data
    if (orgF) depSource = depSource.filter((r) => r.org === orgF)
    if (actualDiv) depSource = depSource.filter((r) => r.div === actualDiv)
    const deps = [
      ...new Set(depSource.map((r) => r.dep).filter(Boolean)),
    ].sort()
    this._populateSelect('filterDep', deps)

    this.render()
  }

  _populateSelect(id, values) {
    const sel = document.getElementById(id)
    const current = sel.value
    while (sel.options.length > 1) sel.remove(1)
    values.forEach((v) => {
      const o = document.createElement('option')
      o.value = o.textContent = v
      sel.appendChild(o)
    })
    sel.value = values.includes(current) ? current : ''
  }

  _unique(key) {
    return [...new Set(this.data.map((r) => r[key]).filter(Boolean))].sort()
  }

  _invalidateCache() {
    this._cachedRows = null
    this._lastCacheKey = null
  }

  _getFiltered() {
    const q = document.getElementById('searchInput').value.toLowerCase().trim()
    const orgF = document.getElementById('filterOrg').value
    const divF = document.getElementById('filterDiv').value
    const depF = document.getElementById('filterDep').value

    const key = `${q}|${orgF}|${divF}|${depF}`
    if (this._lastCacheKey === key && this._cachedRows) return this._cachedRows

    this._cachedRows = this.data.filter((r) => {
      if (orgF && r.org !== orgF) return false
      if (divF && r.div !== divF) return false
      if (depF && r.dep !== depF) return false
      if (q) {
        const hay = [
          r.org,
          r.div,
          r.dep,
          r.sector,
          r.name,
          r.pos,
          ...(r.phone_inner || []),
          ...(r.phone_city || []),
          ...(r.phone_mobile || []),
          ...(r.phone_fmc || []),
          
          ...(r.place || []),
        ]
          .join(' ')
          .toLowerCase()
        if (hay.includes(q)) return true
        const qDigits = q.replace(/\D/g, '')
        if (qDigits.length >= 2) {
          const phones = [
            ...(r.phone_inner || []),
            ...(r.phone_city || []),
            ...(r.phone_mobile || []),
            ...(r.phone_fmc || []),
          ]
          if (phones.some((p) => p.replace(/\D/g, '').includes(qDigits)))
            return true
        }
        return false
      }
      return true
    })
    this._lastCacheKey = key
    return this._cachedRows
  }

  _hasActiveFilter() {
    const q = document.getElementById('searchInput').value.trim()
    const orgF = document.getElementById('filterOrg').value
    const divF = document.getElementById('filterDiv').value
    const depF = document.getElementById('filterDep').value
    return !!(q || orgF || divF || depF)
  }

  // Рендер дерева
  render() {
    this.tableIdCounter = 0
    this.tableRegistry = {}
    this._globalShown = 0 // глобальный счётчик показанных строк

    const q = document.getElementById('searchInput').value.toLowerCase().trim()
    const treeEl = document.getElementById('tree')
    const noResults = document.getElementById('noResults')
    const noSearch = document.getElementById('noSearch')

    // Нет активного поиска/фильтра 
    if (!this._hasActiveFilter()) {
      treeEl.innerHTML = ''
      noResults.style.display = 'none'
      if (noSearch) noSearch.style.display = ''
      document.getElementById('foundCount').textContent = '—'
      return
    }

    if (noSearch) noSearch.style.display = 'none'

    const rows = this._getFiltered()

    document.getElementById('foundCount').textContent = rows.length
    noResults.style.display = rows.length ? 'none' : ''

    treeEl.innerHTML = ''
    if (!rows.length) return

    const tree = this._buildTree(rows)

    Object.entries(tree).forEach(([org, orgData]) => {
      const rootCount = orgData._root.length
      const divCount = Object.values(orgData.divs).flatMap((d) => [
        ...d._root,
        ...Object.values(d.deps).flat(),
      ]).length
      const orgCount = rootCount + divCount

      const l1 = document.createElement('div')
      l1.className = 'l1-block'

      let html = `
        <div class="l1-header" onclick="app.toggle(this)">
          ${this._chevronSVG()}
          <span class="g-name">${this._hl(org, q)}</span>
          <span class="g-count">${orgCount} чел.</span>
        </div>
        <div class="collapsible open"><div class="collapsible-inner">`

      // Корневые записи (только организация, без подразд-я) — запихиываем прямо в организацию
      if (rootCount > 0) {
        html += this._renderTable(orgData._root, q)
      }

      Object.entries(orgData.divs).forEach(([div, divData]) => {
        const divCount =
          divData._root.length + Object.values(divData.deps).flat().length
        html += `
          <div class="l2-block">
            <div class="l2-header" onclick="app.toggle(this)">
              ${this._chevronSVG()}
              <span class="g-name">${this._hl(div, q)}</span>
              <span class="g-count">${divCount} чел.</span>
            </div>
            <div class="collapsible open"><div class="collapsible-inner">`

        // Записи с орагнизация+подразд, но без отдела — запихиываем прямо в подразделение
        if (divData._root.length > 0) {
          html += this._renderTable(divData._root, q)
        }

        Object.entries(divData.deps).forEach(([dep, depRows]) => {
          html += `
            <div class="l3-block">
              <div class="l3-header" onclick="app.toggle(this)">
                ${this._chevronSVG()}
                <span class="g-name">${this._hl(dep, q)}</span>
                <span class="g-count">${depRows.length} чел.</span>
              </div>
              <div class="collapsible open"><div class="collapsible-inner">
                ${this._renderTable(depRows, q)}
              </div></div>
            </div>`
        })

        html += `</div></div></div>`
      })

      html += `</div></div>`
      l1.innerHTML = html
      l1.querySelectorAll('.chevron').forEach((ch) => ch.classList.add('open'))
      treeEl.appendChild(l1)
    })
  }

  _renderTable(rows, q) {
    const tid = 'tbl_' + ++this.tableIdCounter

    const globalLimit = Directory.GLOBAL_PAGE_SIZE
    const alreadyShown = this._globalShown || 0
    const canShow =
      globalLimit > 0 ? Math.max(0, globalLimit - alreadyShown) : rows.length

    const firstPageCount = Math.min(Directory.PAGE_SIZE, canShow)
    const firstPage = rows.slice(0, firstPageCount)
    this._globalShown = (this._globalShown || 0) + firstPage.length

    const hasMore = rows.length > firstPage.length

    this.tableRegistry[tid] = { allRows: rows, q, shown: firstPage.length }

    const moreHtml = hasMore
      ? `
      <div class="load-more-row" id="lmrow_${tid}">
        <span class="load-more-info">Показано <strong id="lmshown_${tid}">${firstPage.length}</strong> из <strong>${rows.length}</strong></span>
        <button class="btn-load-more" onclick="app.loadMore('${tid}')">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
          Загрузить ещё
        </button>
      </div>`
      : ''

    return `<div class="table-wrap" id="${tid}">
      <table>
        <thead><tr>
          <th>Сектор</th>
          <th>Должность</th>
          <th>ФИО</th>
          <th>Внутр. номер</th>
          <th>Город. номер</th>
          <th>FMC номер</th>
          <th>Сотовый</th>
          <th>Расположение</th>
        </tr></thead>
        <tbody id="tbody_${tid}">${firstPage.map((r) => this._renderRow(r, q)).join('')}</tbody>
      </table>
    </div>${moreHtml}`
  }
  /* Загрузить еще */
  loadMore(tid) {
    const state = this.tableRegistry[tid]
    if (!state) return
    const { allRows, q, shown } = state
    const nextBatch = allRows.slice(shown, shown + Directory.PAGE_SIZE)
    if (!nextBatch.length) return

    document
      .getElementById('tbody_' + tid)
      .insertAdjacentHTML(
        'beforeend',
        nextBatch.map((r) => this._renderRow(r, q)).join(''),
      )

    state.shown += nextBatch.length
    document.getElementById('lmshown_' + tid).textContent = state.shown

    if (state.shown >= allRows.length) {
      document.getElementById('lmrow_' + tid)?.remove()
    }
  }
  /* Дерево */
  _buildTree(rows) {
    const tree = {}
    rows.forEach((r) => {
      // Определяем ключ организации
      const orgKey = r.org || r.div || '—'

      if (!tree[orgKey]) tree[orgKey] = { _root: [], divs: {} }

      // Нет подразд — в корень организацию
      if (!r.div || (r.org === orgKey && !r.div)) {
        tree[orgKey]._root.push(r)
        return
      }

      // Если orgKey === r.div, значит org был пустой — в _root
      if (orgKey === r.div) {
        tree[orgKey]._root.push(r)
        return
      }

      // Есть организация и подразд, но нет отдел — кладём прямо в подразд
      if (!r.dep) {
        if (!tree[orgKey].divs[r.div])
          tree[orgKey].divs[r.div] = { _root: [], deps: {} }
        tree[orgKey].divs[r.div]._root.push(r)
        return
      }

      // Есть организация, подразд и отдел
      if (!tree[orgKey].divs[r.div])
        tree[orgKey].divs[r.div] = { _root: [], deps: {} }
      if (!tree[orgKey].divs[r.div].deps[r.dep])
        tree[orgKey].divs[r.div].deps[r.dep] = []
      tree[orgKey].divs[r.div].deps[r.dep].push(r)
    })
    return tree
  }
  // Строка таблицы
  _renderRow(r, q) {
    const v = (s) => this._hl(s || '', q) || '<span class="dash">—</span>'

    return `<tr>
      <td class="td-sector" data-label="Сектор">${v(r.sector)}</td>
      <td class="td-pos" data-label="Должность">${v(r.pos)}</td>
      <td class="td-name">${v(r.name)}</td>
      <td data-label="Внутр. номер">${this._renderList(r.phone_inner, q, 'inner', '/')}</td>
      <td data-label="Город. номер">${this._renderList(r.phone_city, q, 'city', '/')}</td>
      <td data-label="FMC">${this._renderList(r.phone_fmc, q, 'fmc', '/')}</td>
      <td data-label="Сотовый">${this._renderList(r.phone_mobile, q, 'mobile', '/')}</td>
      <td data-label="Расположение">${this._renderList(r.place, q, 'corp', ';')}</td>
    </tr>`
  }
  // Вывод телефона или корпуса 
  _renderList(arr, q, type = 'phone', separator = '/') {
    if (!arr || !arr.length) return '<span class="dash">—</span>'

    // Убираем нецифровые символы
    const qDigits = q ? q.replace(/\D/g, '') : ''

    const items = [
      ...new Set( // для уникальности
        arr.flatMap((n) =>
          n
            .split(separator)
            .map((p) => p.trim())
            .filter(Boolean),
        ),
      ),
    ]

    if (!items.length) return '<span class="dash">—</span>'

    return (
      '<div class="phone-list">' +
      items
        .map((n) => {
          const matched = q && n.toLowerCase().includes(q)
          const digitMatched =
            !matched &&
            qDigits.length >= 2 &&
            n.replace(/\D/g, '').includes(qDigits)

          const cls = `phone-chip phone-chip--${type}${digitMatched ? ' phone-chip--hit' : ''}`

          return `<span class="${cls}">${this._hl(n, q)}</span>`
        })
        .join('') +
      '</div>'
    )
  }

  // Экранирование HTML
  _escape(text) {
    if (!text) return ''
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  _hl(text, q) {
    const escaped = this._escape(text)
    if (!q || !escaped) return escaped
    const re = new RegExp(
      `(${q
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')})`,
      'gi',
    )
    return escaped.replace(re, '<mark>$1</mark>')
  }

  _chevronSVG() {
    return `<svg class="chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,3 11,8 5,13"/></svg>`
  }

  toggle(el) {
    const body = el.nextElementSibling
    const ch = el.querySelector('.chevron')
    const isOpen = !body.classList.contains('closed')
    body.classList.toggle('closed', isOpen)
    ch.classList.toggle('open', !isOpen)
  }

  expandAll() {
    this._setAll(true)
  }
  collapseAll() {
    this._setAll(false)
  }

  _setAll(open) {
    document
      .querySelectorAll('.collapsible')
      .forEach((b) => b.classList.toggle('closed', !open))
    document
      .querySelectorAll('.chevron')
      .forEach((ch) => ch.classList.toggle('open', open))
  }

  resetAll() {
    document.getElementById('searchInput').value = ''
    ;['filterOrg', 'filterDiv', 'filterDep'].forEach((id) => {
      document.getElementById(id).value = ''
    })
    this._invalidateCache()
    this._updateCascade()
  }
  // Экспорт в эксель
  exportExcel() {
    const doExport = () => {
      const rows = this._hasActiveFilter() ? this._getFiltered() : this.data
      const wsData = [
        [
          'Организация',
          'Подразделение',
          'Отдел/Участок',
          'Сектор',
          'ФИО',
          'Должность',
          'Внутр. номер',
          'Город. номер',
          'Сотовый',
          'FMC номер',
          'Расположение',
        ],
      ]
      rows.forEach((r) =>
        wsData.push([
          r.org,
          r.div,
          r.dep,
          r.sector,
          r.name,
          r.pos,
          (r.phone_inner || []).join(', '),
          (r.phone_city || []).join(', '),
          (r.phone_mobile || []).join(', '),
          (r.phone_fmc || []).join(', '),
          
          r.place,
        ]),
      )
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(wsData)
      ws['!cols'] = [
        { wch: 28 },
        { wch: 14 },
        { wch: 14 },
        { wch: 22 },
        { wch: 36 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 8 },
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Справочник')
      const date = new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')
      XLSX.writeFile(wb, 'Справочник_${date}.xlsx')
    }

    if (typeof XLSX !== 'undefined') {
      doExport()
    } else {
      const script = document.createElement('script')
      script.src = 'js/xlsx.full.min.js'
      script.onload = doExport
      script.onerror = () =>
        alert('Не удалось загрузить модуль экспорта. Проверьте соединение.')
      document.head.appendChild(script)
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('api/data.php')
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then((data) => {
      window.app = new Directory(data)
    })
    .catch((err) => {
      console.error('Телефонный справочник: не удалось загрузить данные.', err)
      const noResults = document.getElementById('noResults')
      if (noResults) {
        noResults.style.display = ''
        const p = noResults.querySelector('p')
        if (p)
          p.innerHTML =
            'Не удалось загрузить данные справочника.<br/>Обратитесь к администратору.'
      }
      const loader = document.getElementById('loadingState')
      if (loader) loader.style.display = 'none'
      window.app = new Directory([])
    })
})


function expandAll() {
  app.expandAll()
}
function collapseAll() {
  app.collapseAll()
}
/* Сбросить параметры */
function resetAll() {
  app.resetAll()
}
/* Экспорт в эксельку */
function exportExcel() {
  app.exportExcel()
}
/* Загрузить еще */
function loadMore(tid) {
  app.loadMore(tid)
}
