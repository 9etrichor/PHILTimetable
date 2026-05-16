import { useMemo, memo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Edit,
  Trash2,
  RotateCcw,
  History,
} from 'lucide-react'
import { TablePagination } from '@/components/ui/TablePagination'
import type { AdminCourseSummary } from '@/types/database'

interface AdminCoursesTableProps {
  courses: AdminCourseSummary[]
  loading: boolean
  availableYears: number[]
  availableTerms: number[]
  selectedYear: number | null
  selectedTerm: number | null
  showInactive: boolean
  onYearChange: (year: number | null) => void
  onTermChange: (term: number | null) => void
  onShowInactiveChange: (show: boolean) => void
  onEditCourse: (course: AdminCourseSummary) => void
  onViewHistory?: (course: AdminCourseSummary) => void
}

// Helper function to calculate enrollment percentage
const calculateEnrollmentPercentage = (enrolled: number, quota: number): string => {
  if (!quota || quota === 0) return '0%'
  const percentage = (enrolled / quota) * 100
  return `${Math.round(percentage)}%`
}

// Memoized course row component
const CourseRow = memo(({ 
  course, 
  onEdit,
  onViewHistory,
  showTotalEnrollment 
}: { 
  course: AdminCourseSummary
  onEdit: () => void
  onViewHistory?: () => void
  showTotalEnrollment: boolean
}) => {
  // Calculate total enrollment for course level
  const totalEnrolled = course.sections?.reduce((sum, section) => sum + (section.enrolled_count || 0), 0) || 0
  const totalQuota = course.sections?.reduce((sum, section) => sum + (section.quota_max || 0), 0) || 0
  
  // Calculate average enrollment per section
  const sectionsCount = course.sections?.length || 0
  const avgEnrolled = sectionsCount > 0 ? Math.round(totalEnrolled / sectionsCount) : 0
  const avgQuota = sectionsCount > 0 ? Math.round(totalQuota / sectionsCount) : 0

  const displayEnrolled = showTotalEnrollment ? totalEnrolled : avgEnrolled
  const displayQuota = showTotalEnrollment ? totalQuota : avgQuota
  const enrollmentLabel = showTotalEnrollment ? 'Total' : 'Avg'

  // Handle tag display with overflow
  const visibleTags = course.sub_topics?.slice(0, 5) || []
  const hiddenTags = course.sub_topics?.slice(5) || []

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-mono text-sm">{course.course_code}</TableCell>
      <TableCell className="max-w-md">
        <div className="space-y-2">
          <div className="font-medium">{course.title}</div>
          
          {/* Tags */}
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              {visibleTags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {hiddenTags.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs cursor-help">
                      +{hiddenTags.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {hiddenTags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
                          </div>
          )}
          
          {/* Section info */}
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{sectionsCount} section{sectionsCount > 1 ? 's' : ''}</span>
            {course.status && (
              <>
                <span>•</span>
                <span className="capitalize">{course.status}</span>
              </>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">{course.credits}</TableCell>
      <TableCell className="text-center">
        <Badge variant={course.is_active ? 'default' : 'secondary'}>
          {course.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell className="text-center text-sm">
        <div>
          <div>{displayEnrolled}/{displayQuota}</div>
          <div className="text-xs text-muted-foreground">
            {calculateEnrollmentPercentage(displayEnrolled, displayQuota)} {enrollmentLabel}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {onViewHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
            >
              <History className="h-4 w-4" />
            </Button>
          )}
          {!course.is_active ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Handle reactivate */}}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {/* Handle deactivate */}}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})

CourseRow.displayName = 'CourseRow'

export function AdminCoursesTable({
  courses,
  loading,
  availableYears,
  availableTerms,
  selectedYear,
  selectedTerm,
  showInactive,
  onYearChange,
  onTermChange,
  onShowInactiveChange,
  onEditCourse,
  onViewHistory,
}: AdminCoursesTableProps) {
  const [showTotalEnrollment, setShowTotalEnrollment] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Memoized course data with pre-calculated aggregates
  const processedCourses = useMemo(() => {
    return courses.map(course => {
      return {
        ...course,
      }
    })
  }, [courses])

  // Calculate paginated data
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return processedCourses.slice(startIndex, endIndex)
  }, [processedCourses, currentPage, itemsPerPage])

  const totalPages = Math.ceil(processedCourses.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Label htmlFor="year-filter">Year:</Label>
          <Select value={selectedYear?.toString() || 'all'} onValueChange={(value: string) => onYearChange(value === 'all' ? null : parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year: number) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Label htmlFor="term-filter">Term:</Label>
          <Select value={selectedTerm?.toString() || 'all'} onValueChange={(value: string) => onTermChange(value === 'all' ? null : parseInt(value))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {availableTerms.map((term: number) => (
                <SelectItem key={term} value={term.toString()}>
                  T{term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={onShowInactiveChange}
          />
          <Label htmlFor="show-inactive">Show Inactive</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enrollment-type"
            checked={showTotalEnrollment}
            onCheckedChange={setShowTotalEnrollment}
          />
          <Label htmlFor="enrollment-type">
            Enrollment: {showTotalEnrollment ? 'Total' : 'Avg'}
          </Label>
        </div>
      </div>

      {/* Rows per page selector above table */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
          handleItemsPerPageChange(parseInt(value))
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[70px] text-center">Credits</TableHead>
              <TableHead className="w-[80px] text-center">Status</TableHead>
              <TableHead className="w-[120px] text-center">Enrollment</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : processedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              paginatedCourses.map((course: AdminCourseSummary) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  onEdit={() => onEditCourse(course)}
                  onViewHistory={onViewHistory ? () => onViewHistory(course) : undefined}
                  showTotalEnrollment={showTotalEnrollment}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {processedCourses.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedCourses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  )
}
