import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Instructor } from '@/types/database'

interface UseAdminInstructorsReturn {
  instructors: Instructor[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAdminInstructors(): UseAdminInstructorsReturn {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInstructors = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('instructors')
        .select('*')
        .order('name')

      if (fetchError) throw fetchError

      setInstructors(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instructors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInstructors()
  }, [fetchInstructors])

  return {
    instructors,
    loading,
    error,
    refetch: fetchInstructors,
  }
}

interface CreateInstructorData {
  name: string
  title?: string
  email?: string
  nature?: string
}

export async function createInstructor(
  data: CreateInstructorData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: instructor, error } = await supabase
      .from('instructors')
      .insert(data)
      .select('id')
      .single()

    if (error) throw error

    return { success: true, id: instructor.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create instructor',
    }
  }
}

interface UpdateInstructorData {
  name?: string
  title?: string
  email?: string
  nature?: string
}

export async function updateInstructor(
  instructorId: string,
  data: UpdateInstructorData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('instructors')
      .update(data)
      .eq('id', instructorId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update instructor',
    }
  }
}

export async function deleteInstructor(
  instructorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('instructors')
      .delete()
      .eq('id', instructorId)

    if (error) throw error

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete instructor',
    }
  }
}
