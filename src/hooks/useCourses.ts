import { useState, useEffect, useCallback } from 'react'

interface CourseData {
  class_code: string
  title: string
}

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

interface VStudentCourseCatalog {
  course_code: string
  title: string
  credits: number
  sub_topics: string[]
  lecturer_name: string
  year: number
  term: number
  enrolled_count: number
  quota_min: number
  quota_max: number
  class_code: string
}

interface UseCoursesOptions {
  year?: number
  term?: number
}

interface UseCoursesReturn {
  courses: VStudentCourseCatalog[]
  loading: boolean
  error: string | null
  availableYears: number[]
  availableTerms: number[]
  refetch: () => Promise<void>
}

export function useCourses(options: UseCoursesOptions = {}): UseCoursesReturn {
  const [courses, setCourses] = useState<VStudentCourseCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [availableTerms, setAvailableTerms] = useState<number[]>([])

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Import JSON data
      const coursesData = await import('@/data/courses.json')
      const classesData = await import('@/data/classes.json')

      // Combine courses with classes to create catalog entries
      const combinedData: VStudentCourseCatalog[] = []
      const coursesList = coursesData.default as CourseData[]
      const classesList = classesData.default as ClassData[]

      coursesList.forEach((course) => {
        const courseClasses = classesList.filter(
          (cls) => cls.class_code === course.class_code
        )

        if (courseClasses.length > 0) {
          courseClasses.forEach((cls) => {
            combinedData.push({
              course_code: course.class_code,
              title: course.title,
              credits: 3,
              sub_topics: [],
              lecturer_name: cls.instructor_name,
              year: cls.year,
              term: cls.term,
              enrolled_count: 0,
              quota_min: 0,
              quota_max: 0,
              class_code: cls.class_code,
            })
          })
        }
      })

      // Filter by year/term if provided
      let filteredData = combinedData
      if (options.year) {
        filteredData = filteredData.filter((c) => c.year === options.year)
      }
      if (options.term) {
        filteredData = filteredData.filter((c) => c.term === options.term)
      }

      setCourses(filteredData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch courses')
    } finally {
      setLoading(false)
    }
  }, [options.year, options.term])

  const fetchYearsAndTerms = useCallback(async () => {
    try {
      const classesData = await import('@/data/classes.json')
      const classesList = classesData.default as ClassData[]

      const years = [...new Set(classesList.map((d) => d.year))].sort((a, b) => b - a)
      setAvailableYears(years)

      const terms = [...new Set(classesList.map((d) => d.term))].sort((a, b) => a - b)
      setAvailableTerms(terms)
    } catch (err) {
      console.error('Failed to fetch years/terms:', err)
    }
  }, [])

  useEffect(() => {
    fetchYearsAndTerms()
  }, [fetchYearsAndTerms])

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
