import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface ClassScheduleItem {
  id: string
  class_code: string
  day_of_week: number
  start_time: string
  end_time: string
  location: string
  lang: string
  instructor_name: string
}

interface UseClassScheduleReturn {
  schedule: ClassScheduleItem[]
  loading: boolean
  error: string | null
  fetchSchedule: (courseCode: string, year: number, term: number) => Promise<void>
}

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function useClassSchedule(): UseClassScheduleReturn {
  const [schedule, setSchedule] = useState<ClassScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSchedule = useCallback(async (courseCode: string, year: number, term: number) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select(`
          id,
          class_code,
          day_of_week,
          start_time,
          end_time,
          location,
          lang,
          instructors!inner(name),
          sections!inner(
            year,
            term,
            courses!inner(course_code)
          )
        `)
        .eq('sections.courses.course_code', courseCode)
        .eq('sections.year', year)
        .eq('sections.term', term)

      if (fetchError) {
        throw fetchError
      }

      const formattedData: ClassScheduleItem[] = (data || []).map((item) => ({
        id: item.id,
        class_code: item.class_code,
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location,
        lang: item.lang,
        instructor_name: (item.instructors as unknown as { name: string })?.name || 'TBA',
      }))

      setSchedule(formattedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch schedule')
      setSchedule([])
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    schedule,
    loading,
    error,
    fetchSchedule,
  }
}

export { DAY_NAMES }
