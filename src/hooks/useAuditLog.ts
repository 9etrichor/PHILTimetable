import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface CourseHistoryEntry {
  id: string
  course_id?: string
  previous_course_code?: string
  new_course_code?: string
  previous_title?: string
  new_title?: string
  previous_sub_topics?: string[]
  new_sub_topics?: string[]
  change_type: 'code_change' | 'title_change' | 'topics_change' | 'status_change'
  changed_at: string
  change_reason?: string
  metadata?: Record<string, any>
}

export interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id?: string
  timestamp: string
  ip_address?: string
  user_agent?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  changed_columns?: string[]
  session_id?: string
  metadata?: Record<string, any>
  user_email?: string
  user_name?: string
}

interface UseCourseHistoryOptions {
  courseId?: string
  limit?: number
}

interface UseAuditLogOptions {
  tableName?: string
  recordId?: string
  userId?: string
  limit?: number
  startDate?: string
  endDate?: string
}

export function useCourseHistory(options: UseCourseHistoryOptions = {}) {
  const [history, setHistory] = useState<CourseHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCourseHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('course_history')
        .select('id, course_id, previous_course_code, new_course_code, previous_title, new_title, previous_sub_topics, new_sub_topics, change_type, changed_at, change_reason, metadata')
        .order('changed_at', { ascending: false })

      if (options.courseId) {
        query = query.eq('course_id', options.courseId)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setHistory(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch course history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourseHistory()
  }, [options.courseId, options.limit])

  return { history, loading, error, refetch: fetchCourseHistory }
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAuditLogs = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('recent_audit_activity')
        .select('*')
        .order('timestamp', { ascending: false })

      if (options.tableName) {
        query = query.eq('table_name', options.tableName)
      }

      if (options.recordId) {
        query = query.eq('record_id', options.recordId)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      // Date range filtering
      if (options.startDate || options.endDate) {
        query = query.gte('timestamp', options.startDate || '')
        if (options.endDate) {
          query = query.lte('timestamp', options.endDate)
        }
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setLogs(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [options.tableName, options.recordId, options.userId, options.limit, options.startDate, options.endDate])

  return { logs, loading, error, refetch: fetchAuditLogs }
}

// Function to add manual course history entry (for tracking title changes via UI)
export async function addCourseHistoryEntry(
  courseId: string,
  changeType: CourseHistoryEntry['change_type'],
  changeData: {
    previous_course_code?: string
    new_course_code?: string
    previous_title?: string
    new_title?: string
    previous_sub_topics?: string[]
    new_sub_topics?: string[]
    change_reason?: string
  }
) {
  try {
    const { data, error } = await supabase
      .from('course_history')
      .insert({
        course_id: courseId,
        change_type: changeType,
        changed_by: (await supabase.auth.getUser()).data.user?.id,
        ...changeData
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error adding course history entry:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Function to get detailed audit trail for a specific record
export async function getRecordAuditTrail(tableName: string, recordId: string) {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select(`
        *,
        auth.users(email, raw_user_meta_data)
      `)
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('timestamp', { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
