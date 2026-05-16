import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { BookOpen, Users, TrendingUp, Award } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']
const CURRENT_YEAR = new Date().getFullYear()
const CACHE_KEY_PREFIX = 'reports_cache_'
const CACHE_VERSION_KEY = 'reports_cache_version'

interface CachedReportData {
  courseStats: CourseStats | null
  instructorStats: InstructorStats | null
  yearlyData: YearlyData[]
  evalData: CourseEvalData[]
  instructorNatureData: { name: string; value: number }[]
  availableYears: number[]
  timestamp: number
}

interface CourseStats {
  total_courses: number
  active_courses: number
  avg_enrollment: number
  avg_course_mark: number
}

interface InstructorStats {
  total_instructors: number
  full_time: number
  part_time: number
  visiting: number
}

interface YearlyData {
  year: number
  courses: number
  enrollment: number
  avg_mark: number
}

interface CourseEvalData {
  course_code: string
  title: string
  course_mark: number
  teacher_mark: number
  response_rate: number
}

export function Reports() {
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [courseStats, setCourseStats] = useState<CourseStats | null>(null)
  const [instructorStats, setInstructorStats] = useState<InstructorStats | null>(null)
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([])
  const [evalData, setEvalData] = useState<CourseEvalData[]>([])
  const [instructorNatureData, setInstructorNatureData] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    fetchReportData()
  }, [selectedYear])

  const getCacheKey = (year: number) => `${CACHE_KEY_PREFIX}${year}`

  const getCachedData = (year: number): CachedReportData | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(year))
      const version = localStorage.getItem(CACHE_VERSION_KEY)
      if (!cached || !version) return null

      const data: CachedReportData = JSON.parse(cached)
      const cacheAge = Date.now() - data.timestamp
      const maxAge = 1000 * 60 * 60 // 1 hour

      if (cacheAge > maxAge) {
        localStorage.removeItem(getCacheKey(year))
        return null
      }

      return data
    } catch {
      return null
    }
  }

  const setCachedData = (year: number, data: Omit<CachedReportData, 'timestamp'>) => {
    try {
      const cacheData: CachedReportData = {
        ...data,
        timestamp: Date.now(),
      }
      localStorage.setItem(getCacheKey(year), JSON.stringify(cacheData))
      localStorage.setItem(CACHE_VERSION_KEY, Date.now().toString())
    } catch (err) {
      console.warn('Failed to cache report data:', err)
    }
  }

  const fetchReportData = async () => {
    // Check cache first
    const cached = getCachedData(selectedYear)
    if (cached) {
      setCourseStats(cached.courseStats)
      setInstructorStats(cached.instructorStats)
      setYearlyData(cached.yearlyData)
      setEvalData(cached.evalData)
      setInstructorNatureData(cached.instructorNatureData)
      setAvailableYears(cached.availableYears)
      setLoading(false)
      return
    }

    console.log('[Reports] Fetching fresh data for year', selectedYear)
    setLoading(true)

    try {
      // Fetch available years
      const { data: yearsData } = await supabase
        .from('sections')
        .select('year')
        .order('year', { ascending: false })

      const years = [...new Set((yearsData || []).map((s) => s.year))]
      setAvailableYears(years)

      // Fetch course stats
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, is_active')
        .eq('is_active', true)
        .is('deleted_at', null)

      const { data: sectionsData } = await supabase
        .from('sections')
        .select('enrolled_count, year')
        .eq('year', selectedYear)

      const { data: evalsData } = await supabase
        .from('course_evaluations')
        .select(`
          course_mark,
          teacher_mark,
          response_rate,
          sections!inner (
            year,
            courses (course_code, title)
          )
        `)

      const yearEvals = (evalsData || []).filter(
        (e) => (e.sections as unknown as { year: number })?.year === selectedYear
      )

      const avgEnrollment = sectionsData?.length
        ? sectionsData.reduce((sum, s) => sum + (s.enrolled_count || 0), 0) / sectionsData.length
        : 0

      const avgCourseMark = yearEvals.length
        ? yearEvals.reduce((sum, e) => sum + (e.course_mark || 0), 0) / yearEvals.length
        : 0

      setCourseStats({
        total_courses: coursesData?.length || 0,
        active_courses: coursesData?.filter((c) => c.is_active).length || 0,
        avg_enrollment: Math.round(avgEnrollment),
        avg_course_mark: Math.round(avgCourseMark * 10) / 10,
      })

      // Fetch instructor stats
      const { data: instructorsData } = await supabase
        .from('instructors')
        .select('nature')

      const fullTime = instructorsData?.filter((i) => i.nature === 'Full-time').length || 0
      const partTime = instructorsData?.filter((i) => i.nature === 'Part-time').length || 0
      const visiting = instructorsData?.filter((i) => i.nature === 'Visiting').length || 0

      setInstructorStats({
        total_instructors: instructorsData?.length || 0,
        full_time: fullTime,
        part_time: partTime,
        visiting: visiting,
      })

      setInstructorNatureData([
        { name: 'Full-time', value: fullTime },
        { name: 'Part-time', value: partTime },
        { name: 'Visiting', value: visiting },
      ])

      // Fetch yearly trends
      const yearlyStats: YearlyData[] = []
      for (const year of years.slice(0, 5)) {
        const { data: yearSections } = await supabase
          .from('sections')
          .select('enrolled_count')
          .eq('year', year)

        const { count: courseCount } = await supabase
          .from('sections')
          .select('course_id', { count: 'exact', head: true })
          .eq('year', year)

        const totalEnrollment = yearSections?.reduce((sum, s) => sum + (s.enrolled_count || 0), 0) || 0

        yearlyStats.push({
          year,
          courses: courseCount || 0,
          enrollment: totalEnrollment,
          avg_mark: 0,
        })
      }
      setYearlyData(yearlyStats.reverse())

      // Fetch evaluation data for charts
      const evalChartData: CourseEvalData[] = yearEvals
        .filter((e) => e.course_mark && e.teacher_mark)
        .map((e) => {
          const sections = e.sections as unknown as { courses: { course_code: string; title: string } }
          return {
            course_code: sections?.courses?.course_code || 'Unknown',
            title: sections?.courses?.title || 'Unknown',
            course_mark: e.course_mark || 0,
            teacher_mark: e.teacher_mark || 0,
            response_rate: e.response_rate || 0,
          }
        })
        .slice(0, 10)

      setEvalData(evalChartData)

      // Cache the data
      setCachedData(selectedYear, {
        courseStats: {
          total_courses: coursesData?.length || 0,
          active_courses: coursesData?.filter((c) => c.is_active).length || 0,
          avg_enrollment: Math.round(avgEnrollment),
          avg_course_mark: Math.round(avgCourseMark * 10) / 10,
        },
        instructorStats: {
          total_instructors: instructorsData?.length || 0,
          full_time: fullTime,
          part_time: partTime,
          visiting: visiting,
        },
        yearlyData: yearlyStats,
        evalData: evalChartData,
        instructorNatureData: [
          { name: 'Full-time', value: fullTime },
          { name: 'Part-time', value: partTime },
          { name: 'Visiting', value: visiting },
        ],
        availableYears: years,
      })
    } catch (err) {
      console.error('Failed to fetch report data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Course and instructor performance data</p>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseStats?.total_courses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {courseStats?.active_courses || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Instructors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{instructorStats?.total_instructors || 0}</div>
            <p className="text-xs text-muted-foreground">
              {instructorStats?.full_time || 0} full-time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Enrollment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseStats?.avg_enrollment || 0}</div>
            <p className="text-xs text-muted-foreground">per section in {selectedYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Course Mark</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {courseStats?.avg_course_mark ? `${courseStats.avg_course_mark}/5` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">CTE evaluation</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Trends</CardTitle>
            <CardDescription>Total enrollment by year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="enrollment" fill="#8884d8" name="Total Enrollment" />
                <Bar dataKey="courses" fill="#82ca9d" name="Course Sections" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructor Distribution</CardTitle>
            <CardDescription>By employment type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={instructorNatureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {instructorNatureData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      {evalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Evaluation Scores ({selectedYear})</CardTitle>
            <CardDescription>Course mark vs Teacher mark comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={evalData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis dataKey="course_code" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="course_mark" fill="#8884d8" name="Course Mark" />
                <Bar dataKey="teacher_mark" fill="#82ca9d" name="Teacher Mark" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {evalData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No evaluation data available for {selectedYear}</p>
            <p className="text-sm mt-2">
              Evaluation data may not be accessible. Check RLS policies in Supabase.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
