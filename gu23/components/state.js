// Глобальные справочники, которые загружаются при старте приложения
export const references = {
  departmentsList: [], //  цех
  reasonsList: [], //  причины
  stationsList: [], //  станции
  stationsFromList: [], //  stations_from
  ownersList: [],
  wagonKindsList: [],
  cargosList: [],
  signersOwnList: [],
  signersRzdList: [],
  signersManualList: [], // ранее введённые вручную подписанты (подсказки)
}

// Текущее состояние экрана
export const applicationState = {
  currentPage: 'archive',
  selectedActId: null,
  isAdmin: false,
  userPerms: new Set(), // коды полномочий текущего пользователя
}

/** Проверить наличие полномочия у текущего пользователя */
export function hasPerm(code) {
  return applicationState.userPerms.has(code)
}

/** Текущий пользователь — администратор */
export function isAdmin() {
  return applicationState.isAdmin === true
}

// Активный Проект
export let activeDraft = null

export function setActiveDraft(value) {
  activeDraft = value
}

// создания новой структуры акта
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
