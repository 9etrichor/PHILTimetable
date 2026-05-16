import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Class, Instructor } from '@/types/database'

interface ClassWithDetails extends Class {
  instructor_name?: string
  course_code?: string
  section_year?: number
  section_term?: number
}

interface UseAdminClassesOptions {
  sectionId?: string
}

interface UseAdminClassesReturn {
  classes: ClassWithDetails[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAdminClasses(options: UseAdminClassesOptions = {}): UseAdminClassesReturn {
  const { sectionId } = options
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('classes')
        .select(`
          *,
          instructors (name),
          sections (
            year,
            term,
            courses (course_code)
          )
        `)
        .order('day_of_week')
        .order('start_time')

      if (sectionId) {
        query = query.eq('section_id', sectionId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const transformedClasses: ClassWithDetails[] = (data || []).map((cls) => ({
        ...cls,
        instructor_name: (cls.instructors as { name: string } | null)?.name,
        course_code: (cls.sections as { courses: { course_code: string } } | null)?.courses?.course_code,
        section_year: (cls.sections as { year: number } | null)?.year,
        section_term: (cls.sections as { term: number } | null)?.term,
      }))

      setClasses(transformedClasses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes')
    } finally {
      setLoading(false)
    }
  }, [sectionId])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  return {
    classes,
    loading,
    error,
    refetch: fetchClasses,
  }
}

interface CreateClassData {
  section_id: string
  instructor_id: string
  class_code: string
  day_of_week: number
  start_time: string
  end_time: string
  location?: string
  lang?: string
}

export async function createClass(
  data: CreateClassData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: cls, error } = await supabase
      .from('classes')
      .insert(data)
      .select('id')
      .single()

    if (error) throw error

    return { success: true, id: cls.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create class',
    }
  }
}

interface UpdateClassData {
  instructor_id?: string
  class_code?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  location?: string
  lang?: string
}

export async function updateClass(
  classId: string,
  data: UpdateClassData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('classes')
      .update(data)
      .eq('id', classId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update class',
    }
  }
}

export async function deleteClass(
  classId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete class',
    }
  }
}

export async function fetchInstructorsForSelect(): Promise<{
  instructors: Pick<Instructor, 'id' | 'name'>[]
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('instructors')
      .select('id, name')
      .order('name')

    if (error) throw error

    return { instructors: data || [] }
  } catch (err) {
    return {
      instructors: [],
      error: err instanceof Error ? err.message : 'Failed to fetch instructors',
    }
  }
}
