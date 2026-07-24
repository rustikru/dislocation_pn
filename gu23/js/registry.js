import { sendApiRequest } from './api.js'
import { references } from './state.js'
import { navigateTo } from './app.js'
import { escapeHtml, formatDate, formatDateTime } from './utils.js'
import {
  showStatusChip,
  showTypeChip,
  showToast,
  showConfirmBox,
  openModalWindow,
  closeModalWindow,
} from './ui.js'

export function showArchive(container, options = {}) {
  $(container).load('pages/archive.php', () =>
    showArchivePage(container, options),
  )
}

function showArchivePage(container, options = {}) {
  // По умолчанию — текущий месяц (фильтр по дате начала ИЛИ окончания)
  const twoDigits = (n) => String(n).padStart(2, '0')
  const toFilterDate = (d) =>
    `${twoDigits(d.getDate())}.${twoDigits(d.getMonth() + 1)}.${d.getFullYear()}`
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const archiveFilter = {
    q: '',
    type: '',
    status: '',
    dept: '',
    reason_categ: '',
    date_from: toFilterDate(monthStart),
    date_to: toFilterDate(monthEnd),
    has_signed: '', // 'Y' = только с подписанным документом
    page: 1,
  }

  // add 24.07.2026 BekmansurovRR: личные шаблоны фильтров
  let presetList = [] // загруженные шаблоны пользователя
  const filterLabelMap = {} //{ значение: подпись } для сводки
  const filterTitles = {
    type: 'Тип',
    status: 'Статус',
    dept: 'Цех',
    reason_categ: 'Категория',
  }
  let selectedPresetId = ''

  const presetParams = () => ({
    q: archiveFilter.q,
    type: archiveFilter.type,
    status: archiveFilter.status,
    dept: archiveFilter.dept,
    reason_categ: archiveFilter.reason_categ,
    date_from: archiveFilter.date_from,
    date_to: archiveFilter.date_to,
    has_signed: archiveFilter.has_signed,
  })

  const filterDateToInput = (value) => {
    const parts = String(value || '').split('.')
    return parts.length === 3 ? parts.reverse().join('-') : ''
  }

  const placeMenuNearButton = ($btn, $menu) => {
    const buttonRect = $btn[0].getBoundingClientRect()
    const menuWidth = $menu.outerWidth()
    let left = buttonRect.left
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8)
    }
    $menu.css({
      position: 'fixed',
      top: buttonRect.bottom + 4 + 'px',
      left: left + 'px',
      right: 'auto',
    })
  }

  // Фильтр с данными
  const addMultiChoiceFilter = (options, labels, key) => {
    const allLabel = labels[0] // самый первый элемент — «Все …»
    filterLabelMap[key] = {}
    // текущее выбранное состояние (чтобы отразить применённый шаблон)
    const selected = String(archiveFilter[key] || '')
      .split(',')
      .filter(Boolean)
    const $wrap = $('<div class="ms-filter"></div>')
    const $btn = $(
      '<button type="button" class="inp ms-btn">' + allLabel + '</button>',
    )
    const $menu = $('<div class="ms-menu"></div>')

    // значения
    const realCount = options.filter((v) => v !== '').length

    // поиск внутри списка
    if (realCount > 8) {
      const $search = $(
        '<input type="text" class="ms-search" placeholder="Поиск…">',
      )
      $search.on('input', function () {
        const searchText = this.value.trim().toLowerCase()
        $menu.find('.ms-item').each(function () {
          const itemText = $(this).find('span').text().toLowerCase()
          $(this).toggle(itemText.indexOf(searchText) !== -1)
        })
      })
      $menu.append($search)
    }

    // чекбоксы для  значений
    options.forEach((filterValue, idx) => {
      if (filterValue === '') return
      filterLabelMap[key][filterValue] = labels[idx]
      const checkedAttr = selected.indexOf(filterValue) !== -1 ? ' checked' : ''
      $menu.append(
        '<label class="ms-item"><input type="checkbox" value="' +
          filterValue +
          '"' +
          checkedAttr +
          '><span>' +
          labels[idx] +
          '</span></label>',
      )
    })

    const refreshFilterButton = () => {
      const $checked = $menu.find('input:checked')
      if ($checked.length === 0) $btn.text(allLabel)
      else if ($checked.length === 1)
        $btn.text($checked.first().parent().find('span').text())
      else $btn.text(allLabel + ': ' + $checked.length)
      $btn.toggleClass('has-value', $checked.length > 0)
    }

    $menu.on('change', 'input', () => {
      archiveFilter[key] = $menu
        .find('input:checked')
        .map((i, el) => el.value)
        .get()
        .join(',')
      archiveFilter.page = 1
      refreshFilterButton()
      // add 24.07.2026 BekmansurovRR
      showFilterCount()
    })

    $menu.on('click', (e) => e.stopPropagation())
    $btn.on('click', (e) => {
      e.stopPropagation()
      const willOpen = !$menu.is(':visible')
      $('.ms-menu').hide() // закрыть все
      if (willOpen) {
        $menu.show() // показать, чтобы измерить ширину
        placeMenuNearButton($btn, $menu)
      }
    })

    // add 24.07.2026 BekmansurovRR: отразить состояние в подписи кнопки
    refreshFilterButton()

    $wrap.append($btn, $menu)
    // фильтры внутри скрытой панели
    $('#archive-filter-controls').append($wrap)
  }

  // add 24.07.2026 BekmansurovRR: собираем все фильтры
  function buildFilters() {
    $('#archive-filter-controls').empty()
    addMultiChoiceFilter(
      ['', 'start', 'end', 'other'],
      ['Все типы', 'Начало простоя', 'Окончание', 'Прочий'],
      'type',
    )
    addMultiChoiceFilter(
      [
        '',
        'draft',
        'active',
        'on_correction',
        'closed',
        'annulled',
        'signed',
        'rejected',
      ],
      [
        'Все статусы',
        'Проект',
        'Открыт',
        'На корректировке',
        'Закрыт',
        'Аннулирован',
        'Подписан',
        'Отклонён',
      ],
      'status',
    )

    const departmentCodes = references.departmentsList.map((d) => d.CODE)
    addMultiChoiceFilter(
      [''].concat(references.departmentsList.map((d) => String(d.ID))),
      ['Все цеха'].concat(departmentCodes),
      'dept',
    )

    // add 21.07.2026 BekmansurovRR
    // Категории причин
    const categCodes = references.reasonCategories.map((d) => d.NAME)
    addMultiChoiceFilter(
      [''].concat(references.reasonCategories.map((d) => String(d.ID))),
      ['Все категории'].concat(categCodes),
      'reason_categ',
    )

    // закрытие выпадающих меню по клику вне
    $(document)
      .off('click.msfilter')
      .on('click.msfilter', () => $('.ms-menu').hide())

    // Фильтр по периоду (дата начала или окончания). По умолчанию — текущий месяц.
    const $dateFrom = $(
      '<input type="date" class="inp" title="Дата с" value="' +
        filterDateToInput(archiveFilter.date_from) +
        '">',
    )
    const $dateTo = $(
      '<input type="date" class="inp" title="Дата по" value="' +
        filterDateToInput(archiveFilter.date_to) +
        '">',
    )
    $dateFrom.on('change', (e) => {
      archiveFilter.date_from = e.target.value
        ? e.target.value.split('-').reverse().join('.')
        : ''
      archiveFilter.page = 1
    })
    $dateTo.on('change', (e) => {
      archiveFilter.date_to = e.target.value
        ? e.target.value.split('-').reverse().join('.')
        : ''
      archiveFilter.page = 1
    })
    $('#archive-filter-controls').append($dateFrom, $dateTo)

    // Доп. фильтры: «Приложение» — Все / Подписанный документ
    const $extraWrap = $('<div class="ms-filter"></div>')
    const $extraBtn = $(
      '<button type="button" class="inp ms-btn" id="btn-extra-filters">Доп. фильтры</button>',
    )
    const $extraMenu = $(
      '<div class="ms-menu" style="padding:12px;min-width:240px"></div>',
    )
    $extraMenu.append(
      '<label style="display:block;font-size:12px;color:var(--muted);margin-bottom:6px">Приложение</label>' +
        '<select class="inp" id="filter-has-signed" style="width:100%">' +
        '<option value="">Все</option>' +
        '<option value="signed">Подписанный документ</option>' +
        '</select>',
    )
    $extraMenu.on('click', (e) => e.stopPropagation())
    $extraBtn.on('click', (e) => {
      e.stopPropagation()
      const willOpen = !$extraMenu.is(':visible')
      $('.ms-menu').hide()
      if (willOpen) {
        $extraMenu.show()
        placeMenuNearButton($extraBtn, $extraMenu)
      }
    })
    $extraMenu.on('change', '#filter-has-signed', function () {
      archiveFilter.has_signed = this.value === 'signed' ? 'Y' : ''
      archiveFilter.page = 1
      $extraBtn.toggleClass('has-value', !!archiveFilter.has_signed)
      // add 24.07.2026 BekmansurovRR: фильтр применяется только по кнопке
      showFilterCount()
    })
    $extraWrap.append($extraBtn, $extraMenu)
    $('#archive-filter-controls').append($extraWrap)

    // add 24.07.2026 BekmansurovRR: отразить доп. фильтр из состояния
    if (archiveFilter.has_signed === 'Y') {
      $extraMenu.find('#filter-has-signed').val('signed')
      $extraBtn.addClass('has-value')
    }
  }

  buildFilters()

  $('#btn-toggle-filters').on('click', (e) => {
    e.stopPropagation()
    $('#archive-filters-panel').toggle()
  })

  // Счётчик активных фильтров в кнопке «Фильтры (N)»
  function showFilterCount() {
    let count = 0
    if (archiveFilter.type) count++
    if (archiveFilter.status) count++
    if (archiveFilter.dept) count++
    if (archiveFilter.reason_categ) count++
    if (archiveFilter.has_signed) count++
    $('#btn-toggle-filters').text(count ? 'Фильтры (' + count + ')' : 'Фильтры')
  }
  showFilterCount()

  // Сводка по применённому шаблону: «Цех: АКМ», «Статус (3)» и т.п.
  function showFilterSummary(presetName) {
    const parts = []
    ;['type', 'status', 'dept', 'reason_categ'].forEach((key) => {
      const values = String(archiveFilter[key] || '')
        .split(',')
        .filter(Boolean)
      if (!values.length) return
      if (values.length === 1) {
        const label = (filterLabelMap[key] || {})[values[0]] || values[0]
        parts.push(filterTitles[key] + ': ' + label)
      } else {
        parts.push(filterTitles[key] + ' (' + values.length + ')')
      }
    })
    if (archiveFilter.has_signed === 'Y') parts.push('Подписанный документ')

    const $box = $('#archive-filters-summary')
    if (!parts.length) {
      $box.hide().empty()
      return
    }
    $box
      .html(
        '<b>' +
          escapeHtml(presetName || 'Фильтр') +
          ':</b> ' +
          escapeHtml(parts.join(' · ')),
      )
      .show()
  }

  // Применить выбранный шаблон
  function applyPreset(preset) {
    let params = {}
    try {
      params = JSON.parse(preset.PARAMS || '{}')
    } catch (e) {
      params = {}
    }
    archiveFilter.q = params.q || ''
    archiveFilter.type = params.type || ''
    archiveFilter.status = params.status || ''
    archiveFilter.dept = params.dept || ''
    archiveFilter.reason_categ = params.reason_categ || ''
    archiveFilter.date_from = params.date_from || toFilterDate(monthStart)
    archiveFilter.date_to = params.date_to || toFilterDate(monthEnd)
    archiveFilter.has_signed = params.has_signed || ''
    archiveFilter.page = 1
    selectedPresetId = String(preset.ID)
    $('#archive-preset-select').val(selectedPresetId)
    $('#search-input').val(archiveFilter.q)
    updatePresetActions()
    buildFilters()
    showFilterCount()
    loadArchiveData()
    showFilterSummary(preset.FILTER_NAME)
  }

  // add 24.07.2026 BekmansurovRR
  // Загрузка личных шаблонов пользователя в select «Мои шаблоны»
  function updatePresetActions() {
    const hasPreset = !!$('#archive-preset-select').val()
    $('#btn-update-preset, #btn-del-preset').prop('disabled', !hasPreset)
  }

  function loadPresets(options = {}) {
    sendApiRequest('gu23_filter_all').done((resp) => {
      presetList = (resp && resp.rows) || []
      const $select = $('#archive-preset-select')
      $select.find('option:not(:first)').remove()
      presetList.forEach((preset) => {
        $select.append(
          '<option value="' +
            preset.ID +
            '">' +
            escapeHtml(preset.FILTER_NAME) +
            '</option>',
        )
      })
      let presetToSelect = null
      if (options.selectId) {
        presetToSelect = presetList.find(
          (preset) => String(preset.ID) === String(options.selectId),
        )
      } else if (options.selectName) {
        presetToSelect = presetList.find(
          (preset) => preset.FILTER_NAME === options.selectName,
        )
      }
      const defaultPreset = presetList.find(
        (preset) => preset.IS_DEFAULT === 'Y',
      )
      if (presetToSelect) {
        selectedPresetId = String(presetToSelect.ID)
        $select.val(selectedPresetId)
      } else if (options.applyDefault !== false && defaultPreset) {
        $select.val(defaultPreset.ID)
        applyPreset(defaultPreset)
      } else {
        selectedPresetId = ''
      }
      updatePresetActions()
    })
  }

  // Выбор шаблона из select
  $('#archive-preset-select').on('change', function () {
    const id = this.value
    selectedPresetId = id
    updatePresetActions()
    if (!id) {
      // Явный выбор «Без шаблона» — вернуть системные фильтры,
      // не применяя пользовательский шаблон по умолчанию.
      showArchive(container, { applyDefaultPreset: false })
      return
    }
    const preset = presetList.find((p) => String(p.ID) === String(id))
    if (preset) applyPreset(preset)
  })

  // Сохранить текущие фильтры как новый шаблон
  function savePreset() {
    const name = $('#preset-name').val().trim()
    if (!name) {
      showToast('Укажите название шаблона', 'err')
      return
    }
    const params = JSON.stringify(presetParams())
    sendApiRequest('gu23_filter_save', {
      filter_name: name,
      params: params,
      is_default: $('#preset-default').is(':checked') ? 'Y' : 'N',
    }).done((r) => {
      if (r && r.ok) {
        closeModalWindow()
        showToast('Шаблон сохранён', 'ok')
        loadPresets({ selectName: name, applyDefault: false })
      } else showToast((r && r.msg) || 'Ошибка', 'err')
    })
  }

  $('#btn-save-preset').on('click', () => {
    const content =
      '<div class="frow"><label>Название шаблона</label>' +
      '<input class="inp" id="preset-name" placeholder="Название шаблона"></div>' +
      '<label class="ms-item" style="margin-top:6px">' +
      '<input type="checkbox" id="preset-default"><span>Сделать по умолчанию</span></label>'
    openModalWindow('Сохранить шаблон', content, [
      { label: 'Отмена', className: 'btn ghost', onClick: closeModalWindow },
      { label: 'Сохранить', className: 'btn primary', onClick: savePreset },
    ])
    $('#preset-name').focus()
  })

  // Обновить выбранный шаблон текущими значениями фильтров.
  $('#btn-update-preset').on('click', () => {
    const preset = presetList.find(
      (item) => String(item.ID) === String(selectedPresetId),
    )
    if (!preset) {
      showToast('Выберите шаблон', 'err')
      return
    }
    showConfirmBox(
      'Сохранить изменения',
      'Заменить параметры шаблона «' + preset.FILTER_NAME + '» текущими?',
      () => {
        sendApiRequest('gu23_filter_save', {
          id: preset.ID,
          filter_name: preset.FILTER_NAME,
          params: JSON.stringify(presetParams()),
          is_default: preset.IS_DEFAULT === 'Y' ? 'Y' : 'N',
        }).done((r) => {
          if (r && r.ok) {
            showToast('Изменения шаблона сохранены', 'ok')
            loadPresets({ selectId: preset.ID, applyDefault: false })
            showFilterSummary(preset.FILTER_NAME)
          } else showToast((r && r.msg) || 'Ошибка', 'err')
        })
      },
    )
  })

  // Удалить выбранный шаблон
  $('#btn-del-preset').on('click', () => {
    const id = $('#archive-preset-select').val()
    if (!id) {
      showToast('Выберите шаблон', 'err')
      return
    }
    const preset = presetList.find((p) => String(p.ID) === String(id))
    showConfirmBox(
      'Удалить шаблон',
      (preset && preset.FILTER_NAME) || '',
      () => {
        sendApiRequest('gu23_filter_del', { id: id }).done((r) => {
          if (r && r.ok) {
            showToast('Шаблон удалён', 'ok')
            showArchive(container)
          } else showToast((r && r.msg) || 'Ошибка', 'err')
        })
      },
    )
  })

  // Явный сброс возвращает системные фильтры (текущий месяц) и не должен
  // повторно применять пользовательский шаблон по умолчанию.
  $('#btn-reset-filters').on('click', () =>
    showArchive(container, { applyDefaultPreset: false }),
  )

  $('#btn-export-acts').on('click', () => {
    const $form = $(`
      <form method="post" action="/gu23/data.php" style="display:none">
        <input type="hidden" name="ajax_action" value="gu23_acts_excel">
        <input type="hidden" name="q">
        <input type="hidden" name="type">
        <input type="hidden" name="status">
        <input type="hidden" name="dept">
        <input type="hidden" name="reason_categ">
        <input type="hidden" name="date_from">
        <input type="hidden" name="date_to">
        <input type="hidden" name="has_signed">
      </form>
    `)
    $form.find('[name="q"]').val(archiveFilter.q)
    $form.find('[name="type"]').val(archiveFilter.type)
    $form.find('[name="status"]').val(archiveFilter.status)
    $form.find('[name="dept"]').val(archiveFilter.dept)
    $form.find('[name="reason_categ"]').val(archiveFilter.reason_categ)
    $form.find('[name="date_from"]').val(archiveFilter.date_from)
    $form.find('[name="date_to"]').val(archiveFilter.date_to)
    $form.find('[name="has_signed"]').val(archiveFilter.has_signed)
    $('body').append($form)
    $form.trigger('submit')
    $form.remove()
  })

  // add 24.07.2026 BekmansurovRR
  // Поиск: набор текста не запускает загрузку — применяется по кнопке или Enter
  $('#search-input').on('input', function () {
    archiveFilter.q = $(this).val().trim()
    archiveFilter.page = 1
  })
  $('#search-input').on('keydown', function (e) {
    if (e.key === 'Enter') loadArchiveData()
  })

  // add 24.07.2026 BekmansurovRR
  // Применение фильтров только по кнопке «Применить фильтр»
  $('#btn-apply-filters').on('click', () => {
    archiveFilter.page = 1
    // ручное применение — это уже не «личный шаблон», сводку убираем
    $('#archive-filters-summary').hide().empty()
    loadArchiveData()
  })

  // Загрузка таблицы
  function loadArchiveData() {
    // add 24.07.2026 BekmansurovRR: держим счётчик «Фильтры (N)» в актуальном виде
    showFilterCount()
    sendApiRequest('gu23_get_acts', archiveFilter).done((resp) => {
      const acts =
        resp && resp.acts ? resp.acts : Array.isArray(resp) ? resp : []
      const total = resp && resp.total ? resp.total : acts.length
      const page = resp && resp.page ? resp.page : 1
      // размер страницы берём из ответа сервера (не из клиентской константы)
      const pageSize = (resp && resp.page_size) || acts.length || 1

      // Построение дерева связей
      const rootActs = []
      const childActsMap = {}
      const independentActs = []

      acts.forEach((act) => {
        const parentNumber = act.ACT_START_NUMBER
        if (act.ACT_TYPE === 'end' && parentNumber) {
          if (!childActsMap[parentNumber]) {
            childActsMap[parentNumber] = []
          }
          childActsMap[parentNumber].push(act)
        } else if (act.ACT_TYPE === 'start') {
          rootActs.push(act)
        } else {
          independentActs.push(act)
        }
      })

      let rowsHtml = ''

      // Функция генерации строки
      function actRowHtml(act, isChild) {
        const rowClass = isChild ? 'child-row' : 'root-row'
        const cellStyle = isChild
          ? ' style="padding-left: 35px; color: var(--ink2); font-weight: normal;"'
          : ' style="font-weight: 600;"'
        const parentAttr = isChild
          ? ' data-parent-num="' + act.ACT_START_NUMBER + '"'
          : ' data-root-num="' + act.ACT_NUMBER + '"'
        const bgStyle = isChild ? ' "' : ''

        return (
          '<tr class="clickable-row ' +
          rowClass +
          '" data-id="' +
          act.ID +
          '"' +
          parentAttr +
          bgStyle +
          '>' +
          '<td class="num"' +
          cellStyle +
          '>' +
          escapeHtml(act.ACT_NUMBER) +
          '</td>' +
          //'<td class="num muted">' +
          //escapeHtml(act.ACT_START_NUMBER || '—') +
          '</td>' +
          '<td class="muted">' +
          formatDateTime(act.START_AT) +
          '</td>' +
          '<td class="muted">' +
          formatDateTime(act.END_AT) +
          '</td>' +
          '<td>' +
          showTypeChip(act.ACT_TYPE) +
          '</td>' +
          '<td>' +
          escapeHtml(act.DEPT) +
          '</td>' +
          '<td class="muted text-ellipsis" style="max-width:230px">' +
          escapeHtml(act.CATEG_NAME) +
          '</td>' +
          '<td class="muted text-ellipsis" style="max-width:230px">' +
          escapeHtml(act.REASON_NAME) +
          '</td>' +
          '<td class="num">' +
          (act.WAGON_CNT || 0) +
          '</td>' +
          '<td>' +
          showStatusChip(act.STATUS) +
          '</td>' +
          '</tr>'
        )
      }

      // Номера актов начала
      const rootNumbers = new Set(rootActs.map((a) => a.ACT_NUMBER))

      // Собираем иерархию (по умолчанию все развернуты)
      rootActs.forEach((rootAct) => {
        rowsHtml += actRowHtml(rootAct, false)
        const children = childActsMap[rootAct.ACT_NUMBER] || []
        children.forEach((childAct) => {
          rowsHtml += actRowHtml(childAct, true)
        })
      })

      //акты окончания: их родитель (акт начала)
      // Выводим их отдельными строками,
      Object.keys(childActsMap).forEach((parentNum) => {
        if (rootNumbers.has(parentNum)) return
        childActsMap[parentNum].forEach((childAct) => {
          rowsHtml += actRowHtml(childAct, false)
        })
      })

      // Добавляем прочие/одиночные акты
      independentActs.forEach((act) => {
        if (act.ACT_START_NUMBER && childActsMap[act.ACT_START_NUMBER]) return
        rowsHtml += actRowHtml(act, false)
      })

      if (!acts.length) {
        rowsHtml =
          '<tr><td colspan="9" class="muted" style="padding:24px;text-align:center">Актов не найдено</td></tr>'
      }

      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const pageButtonsHtml = []
      if (page > 1)
        pageButtonsHtml.push(
          '<button class="btn sm ghost pager-btn" data-p="' +
            (page - 1) +
            '">←</button>',
        )
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        if (
          totalPages <= 7 ||
          Math.abs(pageNumber - page) <= 2 ||
          pageNumber === 1 ||
          pageNumber === totalPages
        ) {
          pageButtonsHtml.push(
            '<button class="btn sm' +
              (pageNumber === page ? '' : ' ghost') +
              ' pager-btn" data-p="' +
              pageNumber +
              '">' +
              pageNumber +
              '</button>',
          )
        } else if (pageButtonsHtml[pageButtonsHtml.length - 1] !== '…') {
          pageButtonsHtml.push('…')
        }
      }
      if (page < totalPages)
        pageButtonsHtml.push(
          '<button class="btn sm ghost pager-btn" data-p="' +
            (page + 1) +
            '">→</button>',
        )

      const tableHtml =
        '<div style="overflow:auto">' +
        '<table class="tbl" id="archive-tree-table">' +
        '<thead>' +
        '<tr>' +
        '<th>Номер</th>' +
        //'<th>Номер акта начала</th>' +
        '<th>Начало простоя</th>' +
        '<th>Окончание простоя</th>' +
        '<th>Тип</th>' +
        '<th>Цех</th>' +
        '<th>Категория причины</th>' +
        '<th>Причина</th>' +
        '<th>Вагоны</th>' +
        '<th>Статус</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>' +
        rowsHtml +
        '</tbody>' +
        '</table>' +
        '</div>' +
        '<div class="cardpad" style="border-top:1px solid var(--line);font-size:12px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        '<span class="muted">Всего: ' +
        total +
        '</span>' +
        '<div style="flex:1"></div>' +
        pageButtonsHtml.join('') +
        '</div>'

      $('#acts-table-container').html(tableHtml)

      $('#acts-table-container')
        .off('click', '.pager-btn')
        .on('click', '.pager-btn', function () {
          archiveFilter.page = parseInt($(this).data('p'))
          loadArchiveData()
        })

      $('#archive-tree-table tbody').on('click', 'tr', function (e) {
        const $tr = $(this)
        const rootNum = $tr.data('root-num')

        if (rootNum && $(e.target).closest('td').is(':first-child')) {
          const $children = $('#archive-tree-table tbody').find(
            'tr[data-parent-num="' + rootNum + '"]',
          )
          if ($children.length > 0) {
            e.stopPropagation()
            $children.toggle()
            return
          }
        }

        // проваливаемся в карточку акта
        navigateTo('card', $tr.data('id'))
      })
    })
  }

  loadArchiveData()
  // add 24.07.2026 BekmansurovRR: подгрузить личные шаблоны (и применить «по умолчанию»)
  loadPresets({ applyDefault: options.applyDefaultPreset !== false })
}
