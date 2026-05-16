import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ExcelJS from 'exceljs'

export interface RawExcelRow {
  [key: string]: any
}

export interface ColumnMapping {
  classCode: string
  title: string
  instructor: string
  year: string
  term: string
  quota: string
  enrollment: string
}

export interface ExcelRow {
  CLASS_CODE: string
  TITLE: string
  CREDITS: number
  INSTRUCTOR_NAME: string
  INSTRUCTOR_EMAIL?: string
  YEAR: number
  TERM: number
  ENROLLED_COUNT?: number
  QUOTA_MIN?: number
  QUOTA_MAX?: number
}

export interface ParsedCourseCode {
  base: string
  section: string
}

export interface CourseBuffer {
  id?: string
  course_code: string
  title: string
  credits: number
  exists: boolean
}

export interface InstructorBuffer {
  id?: string
  name: string
  email: string
  nature: string
  exists: boolean
}

export interface SectionBuffer {
  id?: string
  course_id?: string
  year: number
  term: number
  quota_min: number
  quota_max: number
  enrolled_count: number
  exists: boolean
}

export interface ImportRow {
  rowIndex: number
  originalData: ExcelRow
  parsedCode: ParsedCourseCode
  course: CourseBuffer
  instructor: InstructorBuffer
  section: SectionBuffer
  validationErrors: string[]
  isValid: boolean
}

export interface ImportStats {
  total: number
  valid: number
  invalid: number
  existingCourses: number
  newCourses: number
  existingInstructors: number
  newInstructors: number
}

export interface ValidationResult {
  success: boolean
  errors: Array<{ row: number; message: string }>
}

export function useImportLogic() {
  const [rawData, setRawData] = useState<RawExcelRow[]>([])
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null)
  const [importBuffer, setImportBuffer] = useState<ImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'instructors' | 'courses' | 'sections' | 'classes' | 'complete'>('upload')
  const [createdInstructors, setCreatedInstructors] = useState<Map<string, string>>(new Map())
  const [createdCourses, setCreatedCourses] = useState<Map<string, string>>(new Map())
  const [createdSections, setCreatedSections] = useState<Map<number, string>>(new Map())

  const parseClassCode = useCallback((classCode: string): ParsedCourseCode => {
    if (!classCode || typeof classCode !== 'string') {
      return { base: '', section: '-' }
    }
    const clean = classCode.trim().toUpperCase()
    return {
      base: clean.substring(0, 8),
      section: clean.substring(8) || '-'
    }
  }, [])

  const parseExcelFile = useCallback(async (file: File): Promise<void> => {
    const workbook = new ExcelJS.Workbook()
    const buffer = await file.arrayBuffer()
    await workbook.xlsx.load(buffer)
    const worksheet = workbook.getWorksheet(1)
    
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file')
    }
    
    const jsonData: RawExcelRow[] = []
    const headers: string[] = []
    
    // Get headers from first row
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || ''
    })
    
    // Get data from remaining rows
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      const rowData: RawExcelRow = {}
      
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1]
        if (header) {
          rowData[header] = cell.value
        }
      })
      
      if (Object.keys(rowData).length > 0) {
        jsonData.push(rowData)
      }
    }
    
    if (jsonData.length > 0) {
      const headers = Object.keys(jsonData[0])
      setExcelHeaders(headers)
      setRawData(jsonData)
      setCurrentStep('mapping')
    }
  }, [])

  const batchCheckCourses = useCallback(async (courseCodes: string[]): Promise<Map<string, CourseBuffer>> => {
    const { data } = await supabase
      .from('courses')
      .select('id, course_code, title, credits')
      .in('course_code', courseCodes)

    const resultMap = new Map<string, CourseBuffer>()
    
    courseCodes.forEach(code => {
      const existing = data?.find(d => d.course_code === code)
      if (existing) {
        resultMap.set(code, {
          id: existing.id,
          course_code: existing.course_code,
          title: existing.title,
          credits: existing.credits,
          exists: true
        })
      } else {
        resultMap.set(code, {
          course_code: code,
          title: '',
          credits: 0,
          exists: false
        })
      }
    })

    return resultMap
  }, [])

  const batchCheckInstructors = useCallback(async (names: string[]): Promise<Map<string, InstructorBuffer>> => {
    const { data } = await supabase
      .from('instructors')
      .select('id, name, email, nature')
      .in('name', names)

    const resultMap = new Map<string, InstructorBuffer>()
    
    names.forEach(name => {
      const existing = data?.find(d => d.name === name)
      if (existing) {
        resultMap.set(name, {
          id: existing.id,
          name: existing.name,
          email: existing.email || '',
          nature: existing.nature,
          exists: true
        })
      } else {
        resultMap.set(name, {
          name,
          email: '',
          nature: 'Full-time',
          exists: false
        })
      }
    })

    return resultMap
  }, [])

  const validateRow = useCallback((row: ExcelRow, course: CourseBuffer, instructor: InstructorBuffer): string[] => {
    const errors: string[] = []

    if (!row.CLASS_CODE || row.CLASS_CODE.length < 8) {
      errors.push('Invalid course code')
    }

    if (!course.exists && !row.TITLE) {
      errors.push('Title required for new course')
    }

    if (!course.exists && !row.CREDITS) {
      errors.push('Credits required for new course')
    }

    if (!instructor.exists && !row.INSTRUCTOR_EMAIL) {
      errors.push('Email required for new instructor')
    }

    return errors
  }, [])

  const applyColumnMapping = useCallback((mapping: ColumnMapping) => {
    setColumnMapping(mapping)
  }, [])

  const parseYear = (value: any): number => {
    if (!value) return new Date().getFullYear()
    const num = parseInt(String(value))
    return isNaN(num) ? new Date().getFullYear() : num
  }

  const parseTerm = (value: any): number => {
    if (!value) return 1
    const num = parseInt(String(value))
    return isNaN(num) || num < 1 || num > 3 ? 1 : num
  }

  const processExcelData = useCallback(async (): Promise<void> => {
    if (!columnMapping || rawData.length === 0) return

    setLoading(true)
    setLoadingMessage('Mapping Excel columns...')
    setProgress(10)

    try {
      const mappedData: ExcelRow[] = rawData.map(row => {
        let year: number
        let term: number

        if (columnMapping.year && row[columnMapping.year]) {
          year = parseYear(row[columnMapping.year])
        } else {
          year = new Date().getFullYear()
        }

        if (columnMapping.term && row[columnMapping.term]) {
          term = parseTerm(row[columnMapping.term])
        } else {
          term = 1
        }

        return {
          CLASS_CODE: row[columnMapping.classCode] || '',
          TITLE: row[columnMapping.title] || '',
          CREDITS: 3,
          INSTRUCTOR_NAME: row[columnMapping.instructor] || '',
          INSTRUCTOR_EMAIL: '',
          YEAR: year,
          TERM: term,
          ENROLLED_COUNT: parseInt(row[columnMapping.enrollment]) || 0,
          QUOTA_MIN: 0,
          QUOTA_MAX: parseInt(row[columnMapping.quota]) || 0
        }
      })

      setProgress(30)
      setLoadingMessage('Collecting unique courses and instructors...')

      const uniqueCourseCodes = new Set<string>()
      const uniqueInstructorNames = new Set<string>()

      mappedData.forEach(row => {
        const parsed = parseClassCode(row.CLASS_CODE)
        uniqueCourseCodes.add(parsed.base)
        uniqueInstructorNames.add(row.INSTRUCTOR_NAME)
      })

      setProgress(40)
      setLoadingMessage(`Checking ${uniqueCourseCodes.size} courses in database...`)

      const coursesMap = await batchCheckCourses(Array.from(uniqueCourseCodes))

      setProgress(60)
      setLoadingMessage(`Checking ${uniqueInstructorNames.size} instructors in database...`)

      const instructorsMap = await batchCheckInstructors(Array.from(uniqueInstructorNames))

      setProgress(80)
      setLoadingMessage('Building import buffer...')

      const buffer: ImportRow[] = mappedData.map((row, index) => {
        const parsed = parseClassCode(row.CLASS_CODE)
        const course = coursesMap.get(parsed.base)!
        const instructor = instructorsMap.get(row.INSTRUCTOR_NAME)!

        if (!course.exists) {
          course.title = row.TITLE
          course.credits = row.CREDITS
        }

        if (!instructor.exists) {
          instructor.email = row.INSTRUCTOR_EMAIL || ''
        }

        const section: SectionBuffer = {
          year: row.YEAR,
          term: row.TERM,
          quota_min: row.QUOTA_MIN || 0,
          quota_max: row.QUOTA_MAX || 0,
          enrolled_count: row.ENROLLED_COUNT || 0,
          exists: false
        }

        const errors = validateRow(row, course, instructor)

        return {
          rowIndex: index,
          originalData: row,
          parsedCode: parsed,
          course: { ...course },
          instructor: { ...instructor },
          section,
          validationErrors: errors,
          isValid: errors.length === 0
        }
      })

      setProgress(100)
      setLoadingMessage('Complete!')
      setImportBuffer(buffer)
      setCurrentStep('instructors')
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [rawData, columnMapping, parseClassCode, batchCheckCourses, batchCheckInstructors, validateRow])

  const updateBufferRow = useCallback((rowIndex: number, updates: Partial<ImportRow>) => {
    setImportBuffer(prev => prev.map((row, idx) => 
      idx === rowIndex ? { ...row, ...updates } : row
    ))
  }, [])

  const bulkUpdateColumn = useCallback((field: keyof ImportRow, value: any) => {
    setImportBuffer(prev => prev.map(row => {
      if (field === 'course' || field === 'instructor' || field === 'section') {
        return {
          ...row,
          [field]: { ...row[field], ...value }
        }
      }
      return row
    }))
  }, [])

  const bulkUpdateCourseField = useCallback((field: keyof CourseBuffer, value: any) => {
    setImportBuffer(prev => prev.map(row => ({
      ...row,
      course: { ...row.course, [field]: value }
    })))
  }, [])

  const bulkUpdateInstructorField = useCallback((field: keyof InstructorBuffer, value: any) => {
    setImportBuffer(prev => prev.map(row => ({
      ...row,
      instructor: { ...row.instructor, [field]: value }
    })))
  }, [])

  const bulkUpdateSectionField = useCallback((field: keyof SectionBuffer, value: any) => {
    setImportBuffer(prev => prev.map(row => ({
      ...row,
      section: { ...row.section, [field]: value }
    })))
  }, [])

  const validatePreFlight = useCallback(async (): Promise<ValidationResult> => {
    const errors: Array<{ row: number; message: string }> = []

    for (const row of importBuffer) {
      if (!row.isValid) {
        errors.push({
          row: row.rowIndex,
          message: row.validationErrors.join(', ')
        })
      }
    }

    return {
      success: errors.length === 0,
      errors
    }
  }, [importBuffer])

  const createInstructors = useCallback(async (): Promise<{ success: boolean; message: string; created: number }> => {
    setLoading(true)
    setProgress(0)

    try {
      const newInstructors = importBuffer.filter(r => !r.instructor.exists)
      const uniqueNewInstructors = Array.from(
        new Map(newInstructors.map(r => [r.instructor.name, r.instructor])).values()
      )

      if (uniqueNewInstructors.length === 0) {
        setCurrentStep('courses')
        return { success: true, message: 'No new instructors to create', created: 0 }
      }

      setLoadingMessage(`Creating ${uniqueNewInstructors.length} instructors...`)
      setProgress(20)

      const { data: created, error } = await supabase
        .from('instructors')
        .insert(uniqueNewInstructors.map(i => ({
          name: i.name,
          email: i.email || `${i.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          nature: i.nature
        })))
        .select('id, name')

      if (error) throw new Error(`Failed to create instructors: ${error.message}`)

      setProgress(80)
      const instructorMap = new Map<string, string>()
      created?.forEach(i => instructorMap.set(i.name, i.id))
      setCreatedInstructors(instructorMap)

      setProgress(100)
      setLoadingMessage('Instructors created successfully!')
      setCurrentStep('courses')
      
      return { 
        success: true, 
        message: `Successfully created ${created?.length || 0} instructors`,
        created: created?.length || 0
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create instructors',
        created: 0
      }
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [importBuffer])

  const createCourses = useCallback(async (): Promise<{ success: boolean; message: string; created: number }> => {
    setLoading(true)
    setProgress(0)

    try {
      const newCourses = importBuffer.filter(r => !r.course.exists)
      const uniqueNewCourses = Array.from(
        new Map(newCourses.map(r => [r.course.course_code, r.course])).values()
      )

      if (uniqueNewCourses.length === 0) {
        setCurrentStep('sections')
        return { success: true, message: 'No new courses to create', created: 0 }
      }

      setLoadingMessage(`Creating ${uniqueNewCourses.length} courses...`)
      setProgress(20)

      const { data: created, error } = await supabase
        .from('courses')
        .insert(uniqueNewCourses.map(c => ({
          course_code: c.course_code,
          title: c.title,
          credits: c.credits,
          status: 'active'
        })))
        .select('id, course_code')

      if (error) throw new Error(`Failed to create courses: ${error.message}`)

      setProgress(80)
      const courseMap = new Map<string, string>()
      created?.forEach(c => courseMap.set(c.course_code, c.id))
      setCreatedCourses(courseMap)

      setProgress(100)
      setLoadingMessage('Courses created successfully!')
      setCurrentStep('sections')
      
      return { 
        success: true, 
        message: `Successfully created ${created?.length || 0} courses`,
        created: created?.length || 0
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create courses',
        created: 0
      }
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [importBuffer])

  const createSections = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setLoading(true)
    setProgress(0)

    try {
      setLoadingMessage(`Creating ${importBuffer.length} sections...`)
      setProgress(10)

      const sectionsToCreate = []

      for (let i = 0; i < importBuffer.length; i++) {
        const row = importBuffer[i]
        const courseId = row.course.id || createdCourses.get(row.course.course_code)

        if (!courseId) {
          throw new Error(`Missing course ID for row ${row.rowIndex + 1}: ${row.originalData.CLASS_CODE}`)
        }

        sectionsToCreate.push({
          course_id: courseId,
          year: row.section.year,
          term: row.section.term,
          quota_min: row.section.quota_min,
          quota_max: row.section.quota_max,
          enrolled_count: row.section.enrolled_count
        })

        if (i % 10 === 0) {
          setProgress(10 + (i / importBuffer.length) * 80)
        }
      }

      setProgress(90)
      setLoadingMessage('Inserting sections into database...')

      const { data: createdSectionsData, error: sectionError } = await supabase
        .from('sections')
        .insert(sectionsToCreate)
        .select('id')

      if (sectionError) throw new Error(`Failed to create sections: ${sectionError.message}`)

      const sectionMap = new Map<number, string>()
      createdSectionsData?.forEach((s, idx) => sectionMap.set(idx, s.id))
      setCreatedSections(sectionMap)

      setProgress(100)
      setLoadingMessage('Sections created successfully!')
      setCurrentStep('classes')
      return { success: true, message: `Successfully created ${createdSectionsData?.length || 0} sections` }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create sections'
      }
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [importBuffer, createdCourses])

  const createClasses = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    setLoading(true)
    setProgress(0)

    try {
      setLoadingMessage(`Creating ${importBuffer.length} class assignments...`)
      setProgress(10)

      const classesToCreate = []

      for (let i = 0; i < importBuffer.length; i++) {
        const row = importBuffer[i]
        const instructorId = row.instructor.id || createdInstructors.get(row.instructor.name)
        const sectionId = createdSections.get(i)

        if (!sectionId || !instructorId) {
          throw new Error(`Missing IDs for row ${row.rowIndex + 1}: ${row.originalData.CLASS_CODE}`)
        }

        classesToCreate.push({
          section_id: sectionId,
          instructor_id: instructorId,
          class_code: row.parsedCode.section === '-' ? `${row.parsedCode.base}` : `${row.parsedCode.base}${row.parsedCode.section}`
        })

        if (i % 10 === 0) {
          setProgress(10 + (i / importBuffer.length) * 80)
        }
      }

      setProgress(90)
      setLoadingMessage('Inserting classes into database...')

      const { error: classError } = await supabase
        .from('classes')
        .insert(classesToCreate)

      if (classError) throw new Error(`Failed to create classes: ${classError.message}`)

      setProgress(100)
      setLoadingMessage('Import complete!')
      setCurrentStep('complete')
      return { success: true, message: `Successfully imported ${importBuffer.length} records` }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Import failed'
      }
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [importBuffer, createdInstructors, createdSections])

  const getStats = useCallback((): ImportStats => {
    return {
      total: importBuffer.length,
      valid: importBuffer.filter(r => r.isValid).length,
      invalid: importBuffer.filter(r => !r.isValid).length,
      existingCourses: importBuffer.filter(r => r.course.exists).length,
      newCourses: importBuffer.filter(r => !r.course.exists).length,
      existingInstructors: importBuffer.filter(r => r.instructor.exists).length,
      newInstructors: importBuffer.filter(r => !r.instructor.exists).length
    }
  }, [importBuffer])

  const reset = useCallback(() => {
    setImportBuffer([])
    setCurrentStep('upload')
  }, [])

  return {
    rawData,
    excelHeaders,
    columnMapping,
    importBuffer,
    loading,
    loadingMessage,
    progress,
    currentStep,
    parseExcelFile,
    applyColumnMapping,
    processExcelData,
    updateBufferRow,
    bulkUpdateColumn,
    bulkUpdateCourseField,
    bulkUpdateInstructorField,
    bulkUpdateSectionField,
    validatePreFlight,
    createInstructors,
    createCourses,
    createSections,
    createClasses,
    getStats,
    reset,
    setCurrentStep
  }
}
