import { useState, useCallback } from 'react'
import type { ClassScheduleItem } from './useClassSchedule'

interface ClassData {
  id: string
  class_code: string
  day_of_week: number
  start_time: string
  end_time: string
  location: string
  lang: string
  instructor_name: string
  year: number
  term: number
}

interface UseAllClassesReturn {
  allClasses: ClassScheduleItem[]
  loading: boolean
  error: string | null
  fetchAllClasses: (year: number, term: number) => Promise<void>
}

export function useAllClasses(): UseAllClassesReturn {
  const [allClasses, setAllClasses] = useState<ClassScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAllClasses = useCallback(async (year: number, term: number) => {
    setLoading(true)
    setError(null)

    try {
      // Import JSON data
      const classesData = await import('@/data/classes.json')
      const filteredClasses = (classesData.default as ClassData[]).filter(
        (cls: ClassData) => cls.year === year && cls.term === term
      )

      const formattedData: ClassScheduleItem[] = filteredClasses.map((item: ClassData) => ({
        id: item.id,
        class_code: item.class_code,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location,
        lang: item.lang,
        instructor_name: item.instructor_name || 'TBA',
      }))

      setAllClasses(formattedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch all classes')
      setAllClasses([])
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    allClasses,
    loading,
    error,
    fetchAllClasses,
  }
}
