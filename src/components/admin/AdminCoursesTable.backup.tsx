import React, { useState, useMemo, useCallback, useEffect, memo } from 'react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Edit,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Plus,
  Save,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AdminCourseSummary } from '@/types/database'
import { 
  createCourse, 
  deactivateCourse, 
  reactivateCourse
} from '@/hooks/useAdminCourses'

// View Mode Constants
const VIEW_MODES = {
  ALL_YEARS: 'ALL_YEARS',
  YEAR_ONLY: 'YEAR_ONLY', 
  SPECIFIC_TERM: 'SPECIFIC_TERM'
} as const

type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES]

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
  onRefresh: () => void
}

// Memoized expanded content component to prevent remounting
const ExpandedContent = memo(({ 
  course, 
  viewMode, 
  expandedRows, 
  onToggleExpand 
}: { 
  course: AdminCourseSummary
  viewMode: ViewMode
  expandedRows: Set<string>
  onToggleExpand: (key: string) => void
}) => {

  // Generate stable keys
  const getSectionKey = (section: any, idx: number) => 
    `${course.id}-${section.year}-${section.term}-section-${idx}`
  
  const getClassKey = (cls: any, sectionKey: string) => 
    `${sectionKey}-class-${cls.id}`

  const renderClassRow = (cls: any, sectionKey: string) => (
    <TableRow key={getClassKey(cls, sectionKey)} className="bg-muted/20">
      <TableCell></TableCell>
      <TableCell className="font-mono text-sm pl-12">
        {cls.class_code}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground" colSpan={7}>
        {cls.location} • Instructor: {
          cls.instructor_name || 
          cls.instructor?.name || 
          cls.instructors?.[0]?.name || 
          'Unknown Instructor'
        }
      </TableCell>
      <TableCell></TableCell>
    </TableRow>
  )

  const renderSectionRow = (section: any, idx: number) => {
    const sectionKey = getSectionKey(section, idx)
    const isExpanded = expandedRows.has(sectionKey)
    const hasMultipleClasses = section.classes && section.classes.length > 1

    return (
      <React.Fragment key={sectionKey}>
        <TableRow 
          className="bg-muted/10"
          onClick={() => hasMultipleClasses && onToggleExpand(sectionKey)}
          style={{ cursor: hasMultipleClasses ? 'pointer' : 'default' }}
        >
          <TableCell className="pl-6">
            {hasMultipleClasses && (
              isExpanded
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </TableCell>
          <TableCell className="font-mono text-xs text-muted-foreground">
            Y{section.year} T{section.term}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            Section {idx + 1}{hasMultipleClasses ? ` (${section.classes.length} classes)` : ''}
          </TableCell>
          <TableCell></TableCell>
          <TableCell></TableCell>
          <TableCell className="text-center text-sm">
            {section.enrolled_count}/{section.quota_max}
          </TableCell>
          <TableCell className="text-center text-sm">
            <MetricCell 
              value={section.response_rate} 
              isLowResponse={(section.response_rate ?? 0) < 30 && section.response_rate !== null} 
            />
          </TableCell>
          <TableCell className="text-center text-sm">
            <MetricCell 
              value={section.course_mark} 
              isLowResponse={(section.response_rate ?? 0) < 30 && section.response_rate !== null} 
            />
          </TableCell>
          <TableCell className="text-center text-sm">
            <MetricCell 
              value={section.teacher_mark} 
              isLowResponse={(section.response_rate ?? 0) < 30 && section.response_rate !== null} 
            />
          </TableCell>
          <TableCell></TableCell>
        </TableRow>
        {isExpanded && section.classes.map((cls: any) => renderClassRow(cls, sectionKey))}
      </React.Fragment>
    )
  }

  const renderClassRowDirect = (cls: any, idx: number) => {
    const classKey = `${course.id}-class-${cls.id}-${idx}`
    return (
      <TableRow key={classKey} className="bg-muted/20">
        <TableCell></TableCell>
        <TableCell className="font-mono text-sm pl-6">
          {cls.class_code}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {cls.location} • Instructor: {
            cls.instructor_name || 
            cls.instructor?.name || 
            cls.instructors?.[0]?.name || 
            'Unknown Instructor'
          }
        </TableCell>
        <TableCell></TableCell>
        <TableCell></TableCell>
        <TableCell className="text-center text-sm">
          {cls.enrolled_count}/{cls.quota_max}
        </TableCell>
        <TableCell className="text-center text-sm">
          <MetricCell 
            value={cls.response_rate} 
            isLowResponse={(cls.response_rate ?? 0) < 30 && cls.response_rate !== null} 
          />
        </TableCell>
        <TableCell className="text-center text-sm">
          <MetricCell 
            value={cls.course_mark} 
            isLowResponse={(cls.response_rate ?? 0) < 30 && cls.response_rate !== null} 
          />
        </TableCell>
        <TableCell className="text-center text-sm">
          <MetricCell 
            value={cls.teacher_mark} 
            isLowResponse={(cls.response_rate ?? 0) < 30 && cls.response_rate !== null} 
          />
        </TableCell>
        <TableCell></TableCell>
      </TableRow>
    )
  }

  // Strategy Pattern based on viewMode
  switch (viewMode) {
    case VIEW_MODES.SPECIFIC_TERM:
      // Direct class view
      return course.sections.map((cls, idx) => renderClassRowDirect(cls, idx))
    
    case VIEW_MODES.YEAR_ONLY:
    case VIEW_MODES.ALL_YEARS:
      // Section view with expandable classes
      return course.sections.map((section, idx) => renderSectionRow(section, idx))
    
    default:
      return null
  }
})

ExpandedContent.displayName = 'ExpandedContent'

// Memoized metric cell component
const MetricCell = memo(({ 
  value, 
  isLowResponse, 
  showLabel 
}: { 
  value: number | null
  isLowResponse: boolean
  showLabel?: string 
}) => {
  if (value === null) return <span className="text-muted-foreground">-</span>

  const content = <span className="font-bold text-red-600 cursor-help">{value.toFixed(1)}</span>

  return (
    <div className="text-center">
      {isLowResponse ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low response rate - data may not be representative
            </p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <span>{value.toFixed(1)}</span>
      )}
      {showLabel && <div className="text-xs text-muted-foreground">{showLabel}</div>}
    </div>
  )
})

MetricCell.displayName = 'MetricCell'

// Memoized course row component
const CourseRow = memo(({ 
  course, 
  isExpanded, 
  hasMultipleItems, 
  canExpand,
  onToggle, 
  onEditCourse, 
  onDeactivate, 
  onReactivate, 
  actionLoading,
  viewMode 
}: { 
  course: AdminCourseSummary
  isExpanded: boolean
  hasMultipleItems: boolean
  canExpand: boolean
  onToggle: (id: string) => void
  onEditCourse: (course: AdminCourseSummary) => void
  onDeactivate: (course: AdminCourseSummary) => void
  onReactivate: (course: AdminCourseSummary) => void
  actionLoading: boolean
  viewMode: ViewMode
}) => {
  const isLowResponse = (course.response_rate ?? 0) < 30 && course.response_rate !== null

  const getStatusBadge = (course: AdminCourseSummary) => {
    if (!course.is_active || course.deleted_at) {
      return <Badge variant="destructive">Inactive</Badge>
    }
    if (course.status === 'active') {
      return <Badge variant="default" className="bg-green-600">Active</Badge>
    }
    if (course.status === 'pending') {
      return <Badge variant="secondary">Pending</Badge>
    }
    return <Badge variant="outline">{course.status}</Badge>
  }

  const getDisplayLabel = () => {
    if (!canExpand) return ''
    
    switch (viewMode) {
      case VIEW_MODES.SPECIFIC_TERM:
        return 'classes'
      case VIEW_MODES.YEAR_ONLY:
      case VIEW_MODES.ALL_YEARS:
        return 'sections'
      default:
        return 'items'
    }
  }

  return (
    <TableRow
      className={`${course.deleted_at ? 'opacity-60' : ''} ${canExpand ? 'cursor-pointer hover:bg-muted/30' : ''}`}
      onClick={() => canExpand && onToggle(course.id)}
    >
      <TableCell className="px-2">
        {canExpand && (
          isExpanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </TableCell>
      <TableCell className="font-mono font-medium">
        {course.course_code}
      </TableCell>
      <TableCell>
        <div>
          <span className="font-medium">{course.title}</span>
          {canExpand && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({course.sections.length} {getDisplayLabel()}{isExpanded ? '' : ' — click to expand'})
            </span>
          )}
          {course.history_codes && course.history_codes.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              Previously: {course.history_codes.join(', ')}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">{course.credits}</TableCell>
      <TableCell className="text-center">{getStatusBadge(course)}</TableCell>
      <TableCell className="text-center">
        {course.enrolled_count !== null
          ? `${course.enrolled_count}/${course.quota_max}`
          : '-'}
        {hasMultipleItems && course.enrolled_count !== null && viewMode !== VIEW_MODES.SPECIFIC_TERM && (
          <div className="text-xs text-muted-foreground">total</div>
        )}
      </TableCell>
      <TableCell className="text-center">
        <MetricCell 
          value={course.response_rate} 
          isLowResponse={isLowResponse}
          showLabel={hasMultipleItems && course.response_rate !== null && viewMode !== VIEW_MODES.SPECIFIC_TERM ? 'avg' : undefined}
        />
      </TableCell>
      <TableCell className="text-center">
        <MetricCell 
          value={course.course_mark} 
          isLowResponse={isLowResponse}
          showLabel={hasMultipleItems && course.course_mark !== null && viewMode !== VIEW_MODES.SPECIFIC_TERM ? 'avg' : undefined}
        />
      </TableCell>
      <TableCell className="text-center">
        <MetricCell 
          value={course.teacher_mark} 
          isLowResponse={isLowResponse}
          showLabel={hasMultipleItems && course.teacher_mark !== null && viewMode !== VIEW_MODES.SPECIFIC_TERM ? 'avg' : undefined}
        />
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditCourse(course)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          {course.is_active && !course.deleted_at ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeactivate(course)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReactivate(course)}
              disabled={actionLoading}
            >
              <RotateCcw className="h-4 w-4 text-green-600" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
})

CourseRow.displayName = 'CourseRow'

export default function AdminCoursesTable({
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
  onRefresh,
}: AdminCoursesTableProps) {
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<AdminCourseSummary | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  
  // Use Set for O(1) lookups and prevent full re-paints
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Determine view mode using strategy pattern
  const viewMode = useMemo((): ViewMode => {
    if (selectedYear && selectedTerm) return VIEW_MODES.SPECIFIC_TERM
    if (selectedYear && !selectedTerm) return VIEW_MODES.YEAR_ONLY
    return VIEW_MODES.ALL_YEARS
  }, [selectedYear, selectedTerm])

  // Memoized toggle function to prevent unnecessary re-renders
  const toggleExpand = useCallback((key: string) => {
    console.log('[AdminCoursesTable] Toggling expand for:', key, 'Current expanded:', Array.from(expandedRows))
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        console.log('[AdminCoursesTable] Collapsed:', key)
      } else {
        next.add(key)
        console.log('[AdminCoursesTable] Expanded:', key)
      }
      return next
    })
  }, [expandedRows])

  // Memoized course data with pre-calculated aggregates
  const processedCourses = useMemo(() => {
    console.log('[AdminCoursesTable] Processing courses:', courses.length, 'View mode:', viewMode)
    return courses.map(course => {
      const hasMultipleItems = course.sections && course.sections.length > 1
      const hasAnyItems = course.sections && course.sections.length > 0
      
      console.log(`[AdminCoursesTable] Course ${course.course_code}:`, {
        hasMultipleItems,
        hasAnyItems,
        sectionsCount: course.sections?.length,
        firstItem: course.sections?.[0]
      })
      
      return {
        ...course,
        hasMultipleItems,
        hasAnyItems,
        canExpand: hasAnyItems // Allow expansion if there are any sections/classes
      }
    })
  }, [courses, viewMode])

  // Debug: Log when courses change
  useEffect(() => {
    console.log('[AdminCoursesTable] Courses changed, expandedRows:', Array.from(expandedRows))
  }, [courses, expandedRows])

  const [createSaving, setCreateSaving] = useState(false)
  const [newCourseData, setNewCourseData] = useState({
    course_code: '',
    title: '',
    credits: 3,
    status: 'active',
  })

  const handleCreateCourse = async () => {
    if (!newCourseData.course_code.trim() || !newCourseData.title.trim()) {
      toast.error('Course code and title are required')
      return
    }

    setCreateSaving(true)
    const { success, error } = await createCourse(newCourseData)
    if (success) {
      toast.success('Course created successfully')
      setCreateSheetOpen(false)
      setNewCourseData({ course_code: '', title: '', credits: 3, status: 'active' })
      onRefresh()
    } else {
      toast.error(error || 'Failed to create course')
    }
    setCreateSaving(false)
  }

  const handleDeactivate = async () => {
    if (!selectedCourse) return
    setActionLoading(true)

    const { success, error } = await deactivateCourse(selectedCourse.id)
    if (success) {
      toast.success('Course deactivated')
      onRefresh()
    } else {
      toast.error(error || 'Failed to deactivate course')
    }

    setActionLoading(false)
    setDeactivateDialogOpen(false)
    setSelectedCourse(null)
  }

  const handleReactivate = async (course: AdminCourseSummary) => {
    setActionLoading(true)

    const { success, error } = await reactivateCourse(course.id)
    if (success) {
      toast.success('Course reactivated')
      onRefresh()
    } else {
      toast.error(error || 'Failed to reactivate course')
    }

    setActionLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <Select
          value={selectedYear?.toString() || 'all'}
          onValueChange={(v) => onYearChange(v === 'all' ? null : parseInt(v, 10))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedTerm?.toString() || 'all'}
          onValueChange={(v) => onTermChange(v === 'all' ? null : parseInt(v, 10))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {availableTerms.map((term) => (
              <SelectItem key={term} value={term.toString()}>
                Term {term}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={onShowInactiveChange}
          />
          <Label htmlFor="show-inactive" className="text-sm">
            Show Inactive
          </Label>
        </div>

        <Button onClick={() => setCreateSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>

        <div className="ml-auto text-sm text-muted-foreground">
          {courses.length} course{courses.length !== 1 ? 's' : ''}
        </div>
      </div>

      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="px-1">
            <SheetTitle>Add New Course</SheetTitle>
            <SheetDescription>
              Create a new course for the catalog
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            <div className="space-y-2">
              <Label htmlFor="new_course_code">Course Code *</Label>
              <Input
                id="new_course_code"
                value={newCourseData.course_code}
                onChange={(e) => setNewCourseData({ ...newCourseData, course_code: e.target.value })}
                placeholder="PHIL1234"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_title">Title *</Label>
              <Input
                id="new_title"
                value={newCourseData.title}
                onChange={(e) => setNewCourseData({ ...newCourseData, title: e.target.value })}
                placeholder="Introduction to Philosophy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_credits">Credits</Label>
              <Input
                id="new_credits"
                type="number"
                min={1}
                max={6}
                value={newCourseData.credits}
                onChange={(e) => setNewCourseData({ ...newCourseData, credits: parseInt(e.target.value, 10) || 3 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_status">Status</Label>
              <Select
                value={newCourseData.status}
                onValueChange={(v) => setNewCourseData({ ...newCourseData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full mt-4" onClick={handleCreateCourse} disabled={createSaving}>
              <Save className="h-4 w-4 mr-2" />
              {createSaving ? 'Creating...' : 'Create Course'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[30px]"></TableHead>
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-[70px] text-center">Credits</TableHead>
              <TableHead className="w-[80px] text-center">Status</TableHead>
              <TableHead className="w-[100px] text-center">Enrollment</TableHead>
              <TableHead className="w-[80px] text-center">Response %</TableHead>
              <TableHead className="w-[80px] text-center">Course Mark</TableHead>
              <TableHead className="w-[80px] text-center">Teacher Mark</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              processedCourses.map((course) => (
                <React.Fragment key={`course-${course.id}-${viewMode}`}>
                  <CourseRow
                    course={course}
                    isExpanded={expandedRows.has(course.id)}
                    hasMultipleItems={course.hasMultipleItems}
                    canExpand={course.canExpand}
                    onToggle={toggleExpand}
                    onEditCourse={onEditCourse}
                    onDeactivate={(course) => {
                      setSelectedCourse(course)
                      setDeactivateDialogOpen(true)
                    }}
                    onReactivate={handleReactivate}
                    actionLoading={actionLoading}
                    viewMode={viewMode}
                  />
                  {expandedRows.has(course.id) && (
                    <ExpandedContent
                      course={course}
                      viewMode={viewMode}
                      expandedRows={expandedRows}
                      onToggleExpand={toggleExpand}
                    />
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{selectedCourse?.title}"? 
              This will hide the course from students but preserve all data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Deactivating...' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { AdminCoursesTable }
