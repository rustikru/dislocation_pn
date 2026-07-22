// Глобальные справочники
export const references = {
  departmentsList: [], //  цех
  reasonsList: [], //  причины
  stationsList: [], //  станции
  stationsFromList: [], //  stations_from
  ownersList: [], //  владельцы
  wagonKindsList: [], //
  cargosList: [], //  грузы
  signersOwnList: [], //  подписанты (собственные)
  signersRzdList: [], //  подписанты (РЖД)
  signersManualList: [], // ранее введённые вручную подписанты
  noticeTypes: [], // типы уведомлений
}

// Текущее состояние
export const applicationState = {
  currentPage: 'archive',
  selectedActId: null,
  isAdmin: false,
  userPerms: new Set(), // коды полномочий текущего пользователя
  noticeCount: 0,
}
/** add 25.06.2026 BekmansurovRR */
/** Проверить наличие полномочия у текущего пользователя */
export function hasPerm(code) {
  return (
    applicationState.isAdmin === true || applicationState.userPerms.has(code)
  )
}
/** add 25.06.2026 BekmansurovRR */
/** Текущий пользователь — администратор */
export function isAdmin() {
  return applicationState.isAdmin === true
}

// Активный Проект
export let activeDraft = null

export function setActiveDraft(value) {
  activeDraft = value
}

// Функция создания новой структуры для акта
export function createNewDraft(actType) {
  activeDraft = {
    id: 0,
    type: actType, // 'start', 'end' или 'other'
    status: 'draft',
    departmentCode: (references.departmentsList[0] || {}).CODE || '',
    stationId: String((references.stationsList[0] || {}).CODE || ''),
    stationFromId: String((references.stationsFromList[0] || {}).CODE || ''),
    stationFromName: '',
    stationToId: String(references.ST_TO_ID || ''),
    stationToName: '',
    waybillNumber: '',
    cargoReference: '',
    reasonId: '',
    circumstances: '',
    wagons: [],
    signers: [],
    startAt: '',
    endAt: '',
    linkedStartId: '',
    linkedStartNumber: '',
    _summary: null,
    _openStarts: null,
  }
  return activeDraft
}
