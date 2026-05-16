import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AdminCourseSummary, AuditLogWithAdmin, ClassWithDetails, InstructorOption } from '@/types/database'

export const useAdminCourses = ({
  year,
  term,
  showInactive = false,
}: {
  year: number | null
  term: number | null
  showInactive?: boolean
}) => {
  const [courses, setCourses] = useState<AdminCourseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableTerms, setAvailableTerms] = useState<number[]>([])
  
  // Fetch instructor data separately for better performance
  const fetchInstructorLookup = async (): Promise<Record<string, string>> => {
    try {
      const { data } = await supabase
        .from('instructors')
        .select('id, name')
      
      const lookup: Record<string, string> = {}
      if (data) {
        data.forEach(instructor => {
          lookup[instructor.id] = instructor.name
        })
      }
      return lookup
    } catch (err) {
      console.error('[useAdminCourses] Error fetching instructors:', err)
      return {}
    }
  }

  
  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch courses with their latest section and evaluation data
      let query = supabase
        .from('courses')
        .select(`
          id,
          course_code,
          title,
          credits,
          sub_topics,
          history_codes,
          status,
          is_active,
          deleted_at,
          sections (
            id,
            year,
            term,
            enrolled_count,
            quota_min,
            quota_max,
            course_evaluations (
              response_rate,
              course_mark,
              teacher_mark
            ),
            classes (
              id,
              class_code,
              instructor_id,
              day_of_week,
              start_time,
              end_time,
              location,
              lang
            )
          )
        `)
        .order('course_code')

      if (!showInactive) {
        query = query.eq('is_active', true).is('deleted_at', null)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      // Get instructor lookup
      const instructorData = await fetchInstructorLookup()

      // Transform data: build sections with classes, compute aggregates
      const transformedCourses: AdminCourseSummary[] = (data || []).map((course) => {
        const rawSections = course.sections as Array<{
          id: string
          year: number
          term: number
          enrolled_count: number
          quota_min: number
          quota_max: number
          course_evaluations: Array<{
            response_rate: number
            course_mark: number
            teacher_mark: number
          }>
          classes: Array<{
            id: string
            class_code: string
            instructor_id: string
            day_of_week: number
            start_time: string
            end_time: string
            location: string
            lang: string
          }>
        }> || []

        // Build section details with all their classes
        const allSectionDetails = rawSections
          .sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year
            return b.term - a.term
          })
          .map((s) => {
            const ev = s.course_evaluations?.[0]
            return {
              section_id: s.id,
              year: s.year,
              term: s.term,
              enrolled_count: s.enrolled_count,
              quota_min: s.quota_min,
              quota_max: s.quota_max,
              response_rate: ev?.response_rate ?? null,
              course_mark: ev?.course_mark ?? null,
              teacher_mark: ev?.teacher_mark ?? null,
              classes: (s.classes || []).map((cls: any) => {
                return {
                  id: cls.id,
                  class_code: cls.class_code,
                  instructor_id: cls.instructor_id,
                  instructor_name: instructorData[cls.instructor_id] || 'Unknown Instructor',
                  instructor_title: '',
                  day_of_week: cls.day_of_week,
                  start_time: cls.start_time,
                  end_time: cls.end_time,
                  location: cls.location,
                  lang: cls.lang,
                }
              })
            }
          })

        // Filter sections by year/term for aggregation
        let filteredSections = allSectionDetails
        if (year) {
          filteredSections = filteredSections.filter((s) => s.year === year)
        }
        if (term) {
          filteredSections = filteredSections.filter((s) => s.term === term)
        }

        // Determine display mode based on filters
        const isSpecificYearAndTerm = year && term // Specific year + specific term

        // Build sections array based on display mode
        let sectionsForDisplay = filteredSections
        
        if (isSpecificYearAndTerm) {
          // When specific year+term: show ALL classes from ALL sections for this course
          // We want to see all subclasses, not just those in the filtered year/term
          const allClasses: any[] = []
          allSectionDetails.forEach(section => {
            if (section.classes && section.classes.length > 0) {
              section.classes.forEach((cls) => {
                allClasses.push({
                  section_id: cls.id,
                  year: section.year,
                  term: section.term,
                  enrolled_count: section.enrolled_count,
                  quota_min: section.quota_min,
                  quota_max: section.quota_max,
                  response_rate: section.response_rate,
                  course_mark: section.course_mark,
                  teacher_mark: section.teacher_mark,
                  classes: [], // No sub-classes for class-level display
                  class_code: cls.class_code, // Add class code for display
                  instructor_id: cls.instructor_id,
                  instructor_name: instructorData[cls.instructor_id] || 'Unknown Instructor',
                  instructor_title: '',
                  day_of_week: cls.day_of_week,
                  start_time: cls.start_time,
                  end_time: cls.end_time,
                  location: cls.location,
                  lang: cls.lang,
                })
              })
            }
          })
          sectionsForDisplay = allClasses
        }
        // For isSpecificYearOnly and isAllYearsAndTerms, keep sections as-is (show year/term sections)

        // Compute aggregates from filtered sections
        const totalEnrolled = filteredSections.reduce((sum: number, s: any) => sum + (s.enrolled_count || 0), 0)
        const totalQuotaMax = filteredSections.reduce((sum: number, s: any) => sum + (s.quota_max || 0), 0)
        const totalQuotaMin = filteredSections.reduce((sum: number, s: any) => sum + (s.quota_min || 0), 0)

        const evalsWithRate = filteredSections.filter((s: any) => s.response_rate !== null)
        const evalsWithCourse = filteredSections.filter((s: any) => s.course_mark !== null)
        const evalsWithTeacher = filteredSections.filter((s: any) => s.teacher_mark !== null)

        const avgResponseRate = evalsWithRate.length > 0
          ? evalsWithRate.reduce((sum: number, s: any) => sum + s.response_rate!, 0) / evalsWithRate.length
          : null
        const avgCourseMark = evalsWithCourse.length > 0
          ? evalsWithCourse.reduce((sum: number, s: any) => sum + s.course_mark!, 0) / evalsWithCourse.length
          : null
        const avgTeacherMark = evalsWithTeacher.length > 0
          ? evalsWithTeacher.reduce((sum: number, s: any) => sum + s.teacher_mark!, 0) / evalsWithTeacher.length
          : null

        const latestSection = filteredSections[0]

        return {
          id: course.id,
          course_code: course.course_code,
          title: course.title,
          credits: course.credits,
          sub_topics: course.sub_topics || [],
          history_codes: course.history_codes || [],
          status: course.status,
          is_active: course.is_active,
          deleted_at: course.deleted_at,
          section_id: latestSection?.section_id || null,
          year: latestSection?.year || null,
          term: latestSection?.term || null,
          enrolled_count: filteredSections.length > 0 ? totalEnrolled : null,
          quota_min: filteredSections.length > 0 ? totalQuotaMin : null,
          quota_max: filteredSections.length > 0 ? totalQuotaMax : null,
          response_rate: avgResponseRate,
          course_mark: avgCourseMark,
          teacher_mark: avgTeacherMark,
          sections: sectionsForDisplay, // Use display mode-specific sections
        }
      })

      setCourses(transformedCourses)

      // Extract available years and all terms
      const years = new Set<number>()
      const allTerms = new Set<number>()
      const yearTermMap = new Map<number, Set<number>>()
      
      data?.forEach((course) => {
        const sections = course.sections as Array<{ year: number; term: number }> || []
        sections.forEach((s) => {
          years.add(s.year)
          allTerms.add(s.term)
          
          // Build year -> terms mapping
          if (!yearTermMap.has(s.year)) {
            yearTermMap.set(s.year, new Set())
          }
          yearTermMap.get(s.year)!.add(s.term)
        })
      })
      
      setAvailableYears(Array.from(years).sort((a, b) => b - a))
      
      // Set available terms based on selected year
      if (year) {
        const termsForYear = yearTermMap.get(year) || new Set()
        setAvailableTerms(Array.from(termsForYear).sort())
      } else {
        // All years selected - show all terms
        setAvailableTerms(Array.from(allTerms).sort())
      }
      
      // Store year-term mapping for component use
      ;(fetchCourses as any).yearTermMap = yearTermMap
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses')
    } finally {
      setLoading(false)
    }
  }, [year, term, showInactive]) // Include year to refresh terms when year changes

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return {
    courses,
    loading,
    error,
    availableYears,
    availableTerms,
    refetch: fetchCourses,
  }
}

interface UpdateCourseData {
  title?: string
  credits?: number
  status?: string
  course_code?: string
  sub_topics?: string[]
}

interface UpdateSectionQuota {
  quota_min?: number
  quota_max?: number
}

export async function updateCourse(
  courseId: string,
  data: UpdateCourseData,
  currentCourseCode?: string,
  sectionId?: string | null,
  quotaData?: UpdateSectionQuota
): Promise<{ success: boolean; error?: string; details?: unknown }> {
  try {
    // Only send fields that belong to the courses table
    const courseUpdate: Record<string, unknown> = {
      title: data.title,
      credits: data.credits,
      status: data.status,
      course_code: data.course_code,
    }
    
    // Include sub_topics if it's provided (database supports ARRAY type)
    if (data.sub_topics && Array.isArray(data.sub_topics)) {
      courseUpdate.sub_topics = data.sub_topics
    }
    
    // Remove undefined keys
    Object.keys(courseUpdate).forEach((k) => courseUpdate[k] === undefined && delete courseUpdate[k])

    // If course_code is being changed, append old code to history_codes
    if (data.course_code && currentCourseCode && data.course_code !== currentCourseCode) {
      const { data: course, error: fetchError } = await supabase
        .from('courses')
        .select('history_codes')
        .eq('id', courseId)
        .single()

      if (fetchError) throw fetchError

      const historyCodes = course?.history_codes || []
      if (!historyCodes.includes(currentCourseCode)) {
        courseUpdate.history_codes = [...historyCodes, currentCourseCode]
      }
    }

    const { error, status } = await supabase
      .from('courses')
      .update(courseUpdate)
      .eq('id', courseId)

    if (error) {
      console.error('[updateCourse] Error:', { message: error.message, code: error.code, hint: error.hint, status })
      return {
        success: false,
        error: `[${error.code}] ${error.message}${error.hint ? ` — Hint: ${error.hint}` : ''}`,
        details: error,
      }
    }

    // Update quota on the section if provided (quota fields belong to sections table)
    if (sectionId && quotaData && (quotaData.quota_min !== undefined || quotaData.quota_max !== undefined)) {
      const sectionUpdate: Record<string, unknown> = {}
      if (quotaData.quota_min !== undefined) sectionUpdate.quota_min = quotaData.quota_min
      if (quotaData.quota_max !== undefined) sectionUpdate.quota_max = quotaData.quota_max

      const { error: sectionError } = await supabase
        .from('sections')
        .update(sectionUpdate)
        .eq('id', sectionId)

      if (sectionError) {
        console.error('[updateCourse] Section quota update error:', sectionError)
        return {
          success: false,
          error: `Course updated but quota failed: [${sectionError.code}] ${sectionError.message}`,
        }
      }
    }

    await writeAuditLog('courses', courseId, 'update', null, courseUpdate)
    invalidateReportsCache()
    return { success: true }
  } catch (err) {
    console.error('[updateCourse] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update course',
    }
  }
}

export async function deactivateCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error, status } = await supabase
      .from('courses')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', courseId)

    if (error) {
      console.error('[deactivateCourse] Error:', { message: error.message, code: error.code, hint: error.hint, status })
      return {
        success: false,
        error: `[${error.code}] ${error.message}${error.hint ? ` — Hint: ${error.hint}` : ''}`,
      }
    }

    await writeAuditLog('courses', courseId, 'deactivate', null, { is_active: false })
    invalidateReportsCache()
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to deactivate course',
    }
  }
}

export async function reactivateCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error, status } = await supabase
      .from('courses')
      .update({
        is_active: true,
        deleted_at: null,
      })
      .eq('id', courseId)

    if (error) {
      console.error('[reactivateCourse] Error:', { message: error.message, code: error.code, hint: error.hint, status })
      return {
        success: false,
        error: `[${error.code}] ${error.message}${error.hint ? ` — Hint: ${error.hint}` : ''}`,
      }
    }

    await writeAuditLog('courses', courseId, 'reactivate', null, { is_active: true })
    invalidateReportsCache()
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reactivate course',
    }
  }
}

interface CreateCourseData {
  course_code: string
  title: string
  credits: number
  sub_topics?: string[]
  status?: string
}

export async function createCourse(
  data: CreateCourseData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        ...data,
        is_active: true,
        history_codes: [],
      })
      .select('id')
      .single()

    if (error) throw error

    await writeAuditLog('courses', course.id, 'create', null, { ...data, is_active: true })
    invalidateReportsCache()
    return { success: true, id: course.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create course',
    }
  }
}

export async function addSubTopic(
  courseId: string,
  topic: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('sub_topics')
      .eq('id', courseId)
      .single()

    if (fetchError) throw fetchError

    const subTopics = course?.sub_topics || []
    if (subTopics.includes(topic)) {
      return { success: true }
    }

    const { error } = await supabase
      .from('courses')
      .update({ sub_topics: [...subTopics, topic] })
      .eq('id', courseId)

    if (error) throw error

    await writeAuditLog('courses', courseId, 'add_topic', null, { topic })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add sub-topic',
    }
  }
}

export async function removeSubTopic(
  courseId: string,
  topic: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('sub_topics')
      .eq('id', courseId)
      .single()

    if (fetchError) throw fetchError

    const subTopics = (course?.sub_topics || []).filter((t: string) => t !== topic)

    const { error } = await supabase
      .from('courses')
      .update({ sub_topics: subTopics })
      .eq('id', courseId)

    if (error) throw error

    await writeAuditLog('courses', courseId, 'remove_topic', null, { topic })
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove sub-topic',
    }
  }
}

// Invalidate reports cache when data changes
export function invalidateReportsCache(): void {
  try {
    const version = Date.now().toString()
    localStorage.setItem('reports_cache_version', version)
    // Clear all cached report data
    const keys = Object.keys(localStorage)
    keys.forEach((key) => {
      if (key.startsWith('reports_cache_')) {
        localStorage.removeItem(key)
      }
    })
    console.log('[Cache] Reports cache invalidated')
  } catch (err) {
    console.warn('[Cache] Failed to invalidate cache:', err)
  }
}

async function writeAuditLog(
  tableName: string,
  recordId: string,
  action: string,
  oldData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null
): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const adminId = sessionData.session?.user?.id
    if (!adminId) return

    await supabase.from('audit_logs').insert({
      table_name: tableName,
      record_id: recordId,
      action,
      old_data: oldData || null,
      new_data: newData || null,
      admin_id: adminId,
      changed_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[writeAuditLog] Failed to write audit log:', err)
  }
}

export const useAdminClasses = ({ year, term }: { year?: number | null; term?: number | null } = {}) => {
  const [classes, setClasses] = useState<ClassWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Original fallback approach
  const fetchClassesOriginal = useCallback(async () => {
    try {
      // Follow the SQL pattern: courses -> sections -> classes -> instructors
      // First fetch sections with course info
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select(`
          id,
          year,
          term,
          enrolled_count,
          quota_min,
          quota_max,
          course_id,
          courses (
            course_code,
            title
          )
        `)
        .order('year', { ascending: false })
        .order('term', { ascending: false })

      if (sectionsError) {
        throw sectionsError
      }

      // Then fetch classes for these sections (batched to avoid IN clause limits)
      const sectionIds = sectionsData?.map(s => s.id) || []
      
      // Batch the section IDs with larger batch size for better performance (max 100 per batch)
      const batchSize = 100
      const batches: string[][] = []
      for (let i = 0; i < sectionIds.length; i += batchSize) {
        batches.push(sectionIds.slice(i, i + batchSize))
      }
      
      // Process all batches in parallel for maximum speed
      const batchPromises = batches.map(async (batch, index) => {
        const { data: batchClassesData, error: batchError } = await supabase
          .from('classes')
          .select(`
            id,
            section_id,
            instructor_id,
            class_code,
            day_of_week,
            start_time,
            end_time,
            location,
            lang
          `)
          .in('section_id', batch)
          .order('class_code', { ascending: true })
        
        if (batchError) {
          console.error(`[useAdminClasses] Batch ${index + 1} error:`, batchError)
          throw batchError
        }
        
        return batchClassesData || []
      })
      
      const batchResults = await Promise.all(batchPromises)
      const classesData = batchResults.flat()

      // Fetch instructors for these classes
      const instructorIds = [...new Set(classesData?.map(cls => cls.instructor_id).filter(Boolean))]
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructors')
        .select('id, name')
        .in('id', instructorIds)

      if (instructorsError) {
        throw instructorsError
      }

      // Fetch evaluations for these sections (batched and parallel for better performance)
      const evalBatchSize = 100
      const evalBatches: string[][] = []
      for (let i = 0; i < sectionIds.length; i += evalBatchSize) {
        evalBatches.push(sectionIds.slice(i, i + evalBatchSize))
      }
      
      // Process evaluation batches in parallel
      const evalBatchPromises = evalBatches.map(async (evalBatch) => {
        const { data: batchEvaluationsData, error: batchEvaluationsError } = await supabase
          .from('course_evaluations')
          .select('*')
          .in('section_id', evalBatch)
          .order('created_by', { ascending: false })
        
        if (batchEvaluationsError) {
          throw batchEvaluationsError
        }
        
        return batchEvaluationsData || []
      })
      
      const evalBatchResults = await Promise.all(evalBatchPromises)
      const evaluationsData = evalBatchResults.flat()

      // Create lookup maps
      const sectionLookup = new Map(sectionsData?.map(s => [s.id, s]))
      const instructorLookup = new Map(instructorsData?.map(i => [i.id, i]))
      const evaluationLookup = new Map(evaluationsData?.map(e => [e.section_id, e]))

      // Transform the data following the SQL pattern
      const transformedClasses: ClassWithDetails[] = (classesData || []).map((cls: any): ClassWithDetails => {
        const section = sectionLookup.get(cls.section_id)
        const course = section?.courses as any
        const instructor = instructorLookup.get(cls.instructor_id)
        const evaluation = evaluationLookup.get(cls.section_id)

        return {
          ...cls,
          course_code: course?.course_code || 'Unknown',
          course_title: course?.title || 'Unknown',
          section_year: section?.year,
          section_term: section?.term,
          enrolled_count: section?.enrolled_count || 0,
          quota_min: section?.quota_min || 0,
          quota_max: section?.quota_max || 0,
          instructor_name: instructor?.name || 'Unknown',
          evaluation_data: evaluation || null,
        }
      })

      setClasses(transformedClasses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Try the optimized view first
      let query = supabase
        .from('v_admin_class_schedule')
        .select('*')
        .order('Year', { ascending: false })
        .order('Term', { ascending: false })

      const { data: viewData, error: viewError } = await query

      if (viewError) {
        console.warn('View not available, falling back to original approach:', viewError.message)
        
        // Fallback to original multi-query approach
        return await fetchClassesOriginal()
      }

      // Transform view data to match ClassWithDetails interface
      const transformedClasses: ClassWithDetails[] = (viewData || []).map((row: any): ClassWithDetails => {
        // Create evaluation object from view columns
        const evaluation_data = (row.Course_Score || row.Teacher_Score || row.Response_Rate) ? {
          id: `eval_${row.class_id}`, // Generate a pseudo ID for compatibility
          section_id: row.section_id,
          course_mark: row.Course_Score || 0,
          teacher_mark: row.Teacher_Score || 0,
          response_rate: row.Response_Rate || 0,
          created_by: 'system', // Placeholder for compatibility
          updated_at: new Date().toISOString() // Add missing field
        } : null

        return {
          // Base Class interface fields
          id: row.class_id,
          section_id: row.section_id,
          instructor_id: row.instructor_id || '',
          class_code: row.Code,
          day_of_week: 0, // Not available in view, set default
          start_time: '', // Will be parsed from Time field
          end_time: '',   // Will be parsed from Time field
          location: '',  // Not available in view
          lang: '',      // Not available in view
          
          // ClassWithDetails extension fields
          course_code: row.Course || 'Unknown',
          course_title: row.Course || 'Unknown',
          section_year: row.Year,
          section_term: row.Term,
          enrolled_count: row.Enrollment || 0,
          quota_min: 0, // Not available in view
          quota_max: 0, // Not available in view
          instructor_name: row.Instructor || 'Unknown',
          evaluation_data,
        }
      })

      setClasses(transformedClasses)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch classes')
    } finally {
      setLoading(false)
    }
  }, [year, term, fetchClassesOriginal])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const refetch = useCallback(() => {
    fetchClasses()
  }, [fetchClasses])

  return {
    classes,
    loading,
    error,
    refetch,
  }
}

export async function createClass(
  data: {
    section_id: string
    instructor_id: string
    class_code: string
    day_of_week: number
    start_time: string
    end_time: string
    location: string
    lang: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: classData, error } = await supabase
      .from('classes')
      .insert(data)
      .select('id')
      .single()

    if (error) throw error

    await writeAuditLog('classes', classData.id, 'create', null, data)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create class',
    }
  }
}

export async function updateClass(
  classId: string,
  data: {
    instructor_id: string
    class_code: string
    day_of_week: number
    start_time: string
    end_time: string
    location: string
    lang: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get old data for audit log
    const { data: oldClass } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    const { error } = await supabase
      .from('classes')
      .update(data)
      .eq('id', classId)
      .single()

    if (error) throw error

    await writeAuditLog('classes', classId, 'update', oldClass, data)
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
    // Get old data for audit log
    const { data: oldClass } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single()

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId)

    if (error) throw error

    await writeAuditLog('classes', classId, 'delete', oldClass, null)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete class',
    }
  }
}

export async function fetchInstructorsForSelect(): Promise<{ instructors: InstructorOption[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('instructors')
      .select('id, name')
      .order('name')

    if (error) throw error

    return {
      instructors: data || [],
    }
  } catch (err) {
    return {
      instructors: [],
      error: err instanceof Error ? err.message : 'Failed to fetch instructors',
    }
  }
}

export async function fetchAuditLogs(
  recordId: string
): Promise<{ logs: AuditLogWithAdmin[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        phi_admins (full_name)
      `)
      .eq('record_id', recordId)
      .order('changed_at', { ascending: false })

    if (error) throw error

    const logs: AuditLogWithAdmin[] = (data || []).map((log) => ({
      ...log,
      admin_name: (log.phi_admins as { full_name: string } | null)?.full_name || 'System',
    }))

    return { logs }
  } catch (err) {
    return {
      logs: [],
      error: err instanceof Error ? err.message : 'Failed to fetch audit logs',
    }
  }
}
