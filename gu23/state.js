// Глобальные справочники, которые загружаются при старте приложения
export const references = {
  departmentsList: [], //  cexes
  reasonsList: [], //  reasons
  stationsList: [], //  stations
  stationsFromList: [], //  stations_from
  ownersList: [],
  wagonKindsList: [],
  cargosList: [],
  signersOwnList: [],
  signersRzdList: [],
}

// Текущее состояние экрана
export const applicationState = {
  currentPage: 'archive',
  selectedActId: null,
}

// Активный черновик, с которым работает пользователь в форме
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
    reason: '',
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
