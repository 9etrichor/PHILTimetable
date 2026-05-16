import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import ExcelJS from 'exceljs'

export interface RawExcelRow {
  [key: string]: any
}

export interface EvalColumnMapping {
  classCode: string
  instructor: string
  responseRate: string
  courseMark: string
  teacherMark: string
}

export interface EvaluationExcelRow {
  CLASS_CODE: string
  COURSE_TITLE: string
  INSTRUCTOR_NAME: string
  YEAR: number
  TERM: number
  RESPONSE_RATE: number
  COURSE_MARK: number
  TEACHER_MARK: number
}

export interface MatchedClassInfo {
  id: string
  class_code: string
  section_id: string
  instructor_id: string
  instructor_name: string
  course_code: string
  course_title: string
  section_year: number
  section_term: number
}

export interface EvaluationImportRow {
  rowIndex: number
  originalData: EvaluationExcelRow
  matchedClass: MatchedClassInfo | null
  response_rate: number
  course_mark: number
  teacher_mark: number
  validationErrors: string[]
  validationWarnings: string[]
  isValid: boolean
}

export interface ImportStats {
  total: number
  valid: number
  invalid: number
  matched: number
  teacherMismatch: number
}

export interface SuggestedYearTerm {
  year: number
  term: number
  classCount: number
  hasEvaluations: boolean
}

export interface ValidationResult {
  success: boolean
  errors: Array<{ row: number; message: string }>
}

export function useEvaluationImportLogic() {
  const [rawData, setRawData] = useState<RawExcelRow[]>([])
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<EvalColumnMapping | null>(null)
  const [importBuffer, setImportBuffer] = useState<EvaluationImportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'update' | 'complete'>('upload')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [suggestedYearTerms, setSuggestedYearTerms] = useState<SuggestedYearTerm[]>([])
  const [yearTermWarning, setYearTermWarning] = useState<string>('')

  // Fetch year/term combinations from DB, marking which have no evaluations yet
  const fetchSuggestedYearTerms = useCallback(async () => {
    try {
      // Get all sections with their class count
      const { data: sections } = await supabase
        .from('sections')
        .select('id, year, term')

      if (!sections || sections.length === 0) return

      // Get section_ids that already have evaluations
      const { data: existingEvals } = await supabase
        .from('course_evaluations')
        .select('section_id')

      const evalSectionIds = new Set((existingEvals || []).map(e => e.section_id))

      // Group by year/term
      const ytMap = new Map<string, SuggestedYearTerm>()
      for (const s of sections) {
        const key = `${s.year}-${s.term}`
        const existing = ytMap.get(key)
        if (existing) {
          existing.classCount++
          if (evalSectionIds.has(s.id)) {
            existing.hasEvaluations = true
          }
        } else {
          ytMap.set(key, {
            year: s.year,
            term: s.term,
            classCount: 1,
            hasEvaluations: evalSectionIds.has(s.id)
          })
        }
      }

      const sorted = Array.from(ytMap.values()).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year
        return a.term - b.term
      })

      setSuggestedYearTerms(sorted)
    } catch (err) {
      console.error('Failed to fetch suggested year/terms:', err)
    }
  }, [])

  // Validate year/term against DB - check if classes exist for that combo
  const validateYearTerm = useCallback(async (year: number, term: number): Promise<string> => {
    const { data, error } = await supabase
      .from('sections')
      .select('id')
      .eq('year', year)
      .eq('term', term)
      .limit(1)

    if (error) return ''

    if (!data || data.length === 0) {
      return `No classes found for Year ${year} Term ${term}`
    }

    return ''
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

    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || ''
    })

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
      const dataHeaders = Object.keys(jsonData[0])
      setExcelHeaders(dataHeaders)
      setRawData(jsonData)
      setCurrentStep('mapping')
    }
  }, [])

  const applyColumnMapping = useCallback((mapping: EvalColumnMapping) => {
    setColumnMapping(mapping)
  }, [])

  const parsePercentage = (value: any): number => {
    if (!value) return 0
    const num = parseFloat(String(value))
    return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 1)
  }

  const parseMark = (value: any): number => {
    if (!value) return 0
    const num = parseFloat(String(value))
    return isNaN(num) ? 0 : Math.min(Math.max(num, 0), 7)
  }

  // Match class_codes against DB classes for the given year/term
  const batchMatchClasses = useCallback(async (
    classCodes: string[],
    year: number,
    term: number
  ): Promise<Map<string, MatchedClassInfo | null>> => {
    // Query classes joined with sections (year/term) and instructors (name)
    const { data } = await supabase
      .from('classes')
      .select(`
        id, class_code, section_id, instructor_id,
        instructors (name),
        sections (
          year, term,
          courses (course_code, title)
        )
      `)
      .in('class_code', classCodes)

    const resultMap = new Map<string, MatchedClassInfo | null>()

    classCodes.forEach(code => {
      // Find a class matching this code AND the selected year/term
      const match = (data || []).find(d => {
        const sec = d.sections as any
        return d.class_code === code && sec?.year === year && sec?.term === term
      })

      if (match) {
        const sec = match.sections as any
        const inst = match.instructors as any
        resultMap.set(code, {
          id: match.id,
          class_code: match.class_code,
          section_id: match.section_id,
          instructor_id: match.instructor_id,
          instructor_name: inst?.name || '',
          course_code: sec?.courses?.course_code || '',
          course_title: sec?.courses?.title || '',
          section_year: sec?.year,
          section_term: sec?.term
        })
      } else {
        resultMap.set(code, null)
      }
    })

    return resultMap
  }, [])

  const processExcelData = useCallback(async (): Promise<void> => {
    if (!columnMapping || rawData.length === 0 || !selectedYear || !selectedTerm) return

    setLoading(true)
    setLoadingMessage('Mapping Excel columns...')
    setProgress(10)

    try {
      const mappedData: EvaluationExcelRow[] = rawData.map(row => ({
        CLASS_CODE: String(row[columnMapping.classCode] || '').trim().toUpperCase(),
        COURSE_TITLE: '', // Course title will be fetched from database
        INSTRUCTOR_NAME: row[columnMapping.instructor] || '',
        YEAR: selectedYear,
        TERM: selectedTerm,
        RESPONSE_RATE: parsePercentage(row[columnMapping.responseRate]),
        COURSE_MARK: parseMark(row[columnMapping.courseMark]),
        TEACHER_MARK: parseMark(row[columnMapping.teacherMark])
      }))

      setProgress(30)
      setLoadingMessage('Collecting unique class codes...')

      const uniqueClassCodes = [...new Set(mappedData.map(r => r.CLASS_CODE).filter(Boolean))]

      setProgress(50)
      setLoadingMessage(`Matching ${uniqueClassCodes.length} classes in database...`)

      const classesMap = await batchMatchClasses(uniqueClassCodes, selectedYear, selectedTerm)

      setProgress(80)
      setLoadingMessage('Building import buffer...')

      const buffer: EvaluationImportRow[] = mappedData.map((row, index) => {
        const matched = classesMap.get(row.CLASS_CODE) || null
        const errors: string[] = []
        const warnings: string[] = []

        // Validation
        if (!row.CLASS_CODE || row.CLASS_CODE.length < 4) {
          errors.push('Invalid class code')
        }

        if (!matched) {
          errors.push(`Class code not found in Year ${selectedYear} Term ${selectedTerm}`)
        }

        if (row.COURSE_MARK < 0 || row.COURSE_MARK > 7) {
          errors.push('Course mark must be between 0 and 7')
        }

        if (row.TEACHER_MARK < 0 || row.TEACHER_MARK > 7) {
          errors.push('Teacher mark must be between 0 and 7')
        }

        if (row.RESPONSE_RATE < 0 || row.RESPONSE_RATE > 1) {
          errors.push('Response rate must be between 0 and 1')
        }

        // Teacher mismatch warning (not a blocker)
        if (matched && row.INSTRUCTOR_NAME) {
          const excelName = row.INSTRUCTOR_NAME.trim().toLowerCase()
          const dbName = (matched.instructor_name || '').trim().toLowerCase()
          if (dbName && excelName !== dbName) {
            warnings.push(`Teacher mismatch: Excel="${row.INSTRUCTOR_NAME}" DB="${matched.instructor_name}"`)
          }
        }

        return {
          rowIndex: index,
          originalData: row,
          matchedClass: matched,
          response_rate: row.RESPONSE_RATE,
          course_mark: row.COURSE_MARK,
          teacher_mark: row.TEACHER_MARK,
          validationErrors: errors,
          validationWarnings: warnings,
          isValid: errors.length === 0
        }
      })

      setProgress(100)
      setLoadingMessage('Complete!')
      setImportBuffer(buffer)
      setCurrentStep('preview')
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [rawData, columnMapping, selectedYear, selectedTerm, batchMatchClasses])

  const validatePreFlight = useCallback(async (): Promise<ValidationResult> => {
    const errors: Array<{ row: number; message: string }> = []

    for (const row of importBuffer) {
      if (!row.isValid) {
        errors.push({
          row: row.rowIndex + 1,
          message: row.validationErrors.join(', ')
        })
      }
    }

    return { success: errors.length === 0, errors }
  }, [importBuffer])

  const updateEvaluationMarks = useCallback(async (): Promise<{ success: boolean; message: string; updated: number }> => {
    setLoading(true)
    setProgress(0)

    try {
      const validRows = importBuffer.filter(r => r.isValid && r.matchedClass)

      if (validRows.length === 0) {
        setCurrentStep('complete')
        return { success: true, message: 'No valid evaluations to update', updated: 0 }
      }

      setLoadingMessage(`Checking existing evaluations...`)
      setProgress(10)

      const sectionIds = validRows.map(r => r.matchedClass!.section_id)

      // Find which section_ids already have evaluations
      const { data: existingEvals } = await supabase
        .from('course_evaluations')
        .select('id, section_id')
        .in('section_id', sectionIds)

      const existingMap = new Map<string, string>()
      ;(existingEvals || []).forEach(e => existingMap.set(e.section_id, e.id))

      const toUpdate: typeof validRows = []
      const toInsert: typeof validRows = []

      for (const row of validRows) {
        if (existingMap.has(row.matchedClass!.section_id)) {
          toUpdate.push(row)
        } else {
          toInsert.push(row)
        }
      }

      setProgress(30)
      let updatedCount = 0

      // Update existing evaluations one by one
      if (toUpdate.length > 0) {
        setLoadingMessage(`Updating ${toUpdate.length} existing evaluations...`)
        for (let i = 0; i < toUpdate.length; i++) {
          const row = toUpdate[i]
          const evalId = existingMap.get(row.matchedClass!.section_id)!
          const { error } = await supabase
            .from('course_evaluations')
            .update({
              response_rate: row.response_rate,
              course_mark: row.course_mark,
              teacher_mark: row.teacher_mark,
              updated_at: new Date().toISOString()
            })
            .eq('id', evalId)

          if (error) {
            console.error(`Failed to update eval for section ${row.matchedClass!.section_id}:`, error)
          } else {
            updatedCount++
          }
          setProgress(30 + Math.round((i / toUpdate.length) * 30))
        }
      }

      // Insert new evaluations
      if (toInsert.length > 0) {
        setProgress(60)
        setLoadingMessage(`Inserting ${toInsert.length} new evaluations...`)

        const insertPayload = toInsert.map(row => ({
          section_id: row.matchedClass!.section_id,
          response_rate: row.response_rate,
          course_mark: row.course_mark,
          teacher_mark: row.teacher_mark,
          updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
          .from('course_evaluations')
          .insert(insertPayload)

        if (error) {
          throw new Error(`Failed to insert evaluations: ${error.message}`)
        }

        updatedCount += toInsert.length
      }

      setProgress(100)
      setLoadingMessage('Evaluation import completed successfully!')
      setCurrentStep('complete')

      return {
        success: true,
        message: `Updated ${toUpdate.length}, inserted ${toInsert.length} evaluation records`,
        updated: updatedCount
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update evaluation marks',
        updated: 0
      }
    } finally {
      setLoading(false)
      setProgress(0)
      setLoadingMessage('')
    }
  }, [importBuffer])

  const getStats = useCallback((): ImportStats => {
    return {
      total: importBuffer.length,
      valid: importBuffer.filter(r => r.isValid).length,
      invalid: importBuffer.filter(r => !r.isValid).length,
      matched: importBuffer.filter(r => r.matchedClass !== null).length,
      teacherMismatch: importBuffer.filter(r => r.validationWarnings.length > 0).length
    }
  }, [importBuffer])

  const reset = useCallback(() => {
    setRawData([])
    setExcelHeaders([])
    setColumnMapping(null)
    setImportBuffer([])
    setCurrentStep('upload')
    setSelectedYear(null)
    setSelectedTerm(null)
    setYearTermWarning('')
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
    selectedYear,
    selectedTerm,
    suggestedYearTerms,
    yearTermWarning,
    parseExcelFile,
    applyColumnMapping,
    processExcelData,
    validatePreFlight,
    updateEvaluationMarks,
    getStats,
    reset,
    setCurrentStep,
    setSelectedYear,
    setSelectedTerm,
    fetchSuggestedYearTerms,
    validateYearTerm,
    setYearTermWarning
  }
}
