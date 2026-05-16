const MAPPING_STORAGE_KEY = 'course_import_column_mapping'

export interface StoredMapping {
  classCode: string
  title: string
  instructor: string
  year: string
  term: string
  quota: string
  enrollment: string
}

export function saveMappingToStorage(mapping: StoredMapping): void {
  try {
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping))
  } catch (error) {
    console.warn('Failed to save mapping to localStorage:', error)
  }
}

export function loadMappingFromStorage(): StoredMapping | null {
  try {
    const stored = localStorage.getItem(MAPPING_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as StoredMapping
    }
  } catch (error) {
    console.warn('Failed to load mapping from localStorage:', error)
  }
  return null
}

export function clearMappingStorage(): void {
  try {
    localStorage.removeItem(MAPPING_STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear mapping from localStorage:', error)
  }
}
