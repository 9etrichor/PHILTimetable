const EVAL_MAPPING_STORAGE_KEY = 'eval_import_column_mapping'

export interface StoredEvalMapping {
  classCode: string
  instructor: string
  responseRate: string
  courseMark: string
  teacherMark: string
}

export function saveEvalMappingToStorage(mapping: StoredEvalMapping): void {
  try {
    localStorage.setItem(EVAL_MAPPING_STORAGE_KEY, JSON.stringify(mapping))
  } catch (error) {
    console.warn('Failed to save eval mapping to localStorage:', error)
  }
}

export function loadEvalMappingFromStorage(): StoredEvalMapping | null {
  try {
    const stored = localStorage.getItem(EVAL_MAPPING_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as StoredEvalMapping
    }
  } catch (error) {
    console.warn('Failed to load eval mapping from localStorage:', error)
  }
  return null
}

export function clearEvalMappingStorage(): void {
  try {
    localStorage.removeItem(EVAL_MAPPING_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear eval mapping from localStorage:', error)
  }
}
