import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Instructor } from '@/types/database'

interface UseInstructorReturn {
  instructor: Instructor | null
  loading: boolean
  error: string | null
  fetchByName: (name: string) => Promise<void>
  fetchById: (id: string) => Promise<void>
  clear: () => void
}

export function useInstructor(): UseInstructorReturn {
  const [instructor, setInstructor] = useState<Instructor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchByName = useCallback(async (name: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('instructors')
        .select('*')
        .eq('name', name)
        .single()

      if (fetchError) {
        throw fetchError
      }

      setInstructor(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instructor')
      setInstructor(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchById = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('instructors')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      setInstructor(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch instructor')
      setInstructor(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setInstructor(null)
    setError(null)
  }, [])

  return {
    instructor,
    loading,
    error,
    fetchByName,
    fetchById,
    clear,
  }
}
