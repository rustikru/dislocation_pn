// Экранирование HTMLы
export function escapeHtml(string) {
  return String(string == null ? '' : string).replace(/[&<>"]/g, (match) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[match]
  })
}

// Из формата БД (YYYY-MM-DD HH:MM:SS) в формат поля ввода (dd.mm.yyyy HH:MM)
export function formatToInputDate(databaseDateStr) {
  if (!databaseDateStr) return ''
  const match = String(databaseDateStr).match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/,
  )
  return match
    ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`
    : ''
}

// Из формата поля ввода (dd.mm.yyyy HH:MM) в формат БД (YYYY-MM-DD HH:MM)
export function formatToDatabaseDate(inputDateStr) {
  if (!inputDateStr) return ''
  const match = String(inputDateStr).match(
    /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/,
  )
  return match
    ? `${match[3]}-${match[2]}-${match[1]} ${match[4]}:${match[5]}`
    : ''
}

// Красивое отображение даты и времени в таблицах и карточках
export function formatDateTime(databaseDateStr) {
  if (!databaseDateStr) return '—'
  const match = String(databaseDateStr).match(
    /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/,
  )
  return match
    ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}`
    : '—'
}

export function formatDate(databaseDateStr) {
  if (!databaseDateStr) return '—'
  const match = String(databaseDateStr).match(/(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : '—'
}

// Парсинг миллисекунд из строки формата ввода (локальное время)
export function parseTimeToMilliseconds(inputDateStr) {
  const match = String(inputDateStr).match(
    /(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})/,
  )
  return match
    ? new Date(
        +match[3],
        +match[2] - 1,
        +match[1],
        +match[4],
        +match[5],
      ).getTime()
    : NaN
}

// Расчёт длительности простоя
export function calculateDuration(startTimestamp, endTimestamp) {
  const difference = endTimestamp - startTimestamp
  const days = Math.floor(difference / 86400000)
  const hours = Math.round((difference - days * 86400000) / 3600000)
  return {
    milliseconds: difference,
    totalHours: difference / 3600000,
    days: days,
    hours: hours,
    calendarDays: Math.ceil(difference / 86400000),
  }
}

// Извлечение корректных номеров вагонов из любого текста (из Excel, через запятую и т.д.)
export function parseWagonsFromText(rawText) {
  const seenWagons = {}
  const result = []
  String(rawText || '')
    .split(/[\s,;\n\t]+/)
    .forEach((token) => {
      const wagonNumber = token.replace(/[^\d]/g, '')
      if (
        wagonNumber.length >= 6 &&
        wagonNumber.length <= 8 &&
        !seenWagons[wagonNumber]
      ) {
        seenWagons[wagonNumber] = 1
        result.push(wagonNumber)
      }
    })
  return result
}
