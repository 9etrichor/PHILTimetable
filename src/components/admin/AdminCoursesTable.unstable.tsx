import React, { useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Edit, Trash2, RotateCcw, AlertTriangle, Plus, Save, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { deactivateCourse, reactivateCourse, createCourse } from '@/hooks/useAdminCourses'
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
  onRefresh: () => void
}

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
  onRefresh,
}: AdminCoursesTableProps) {
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<AdminCourseSummary | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set())

  const toggleExpand = (courseId: string) => {
    setExpandedCourseIds(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) {
        next.delete(courseId)
      } else {
        next.add(courseId)
      }
      console.log('[AdminCoursesTable] Toggled expand for', courseId, 'now expanded:', Array.from(next))
      return next
    })
  }
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

  const renderCTECell = (value: number | null, isLowResponse: boolean) => {
    if (value === null) return <span className="text-muted-foreground">-</span>

    if (isLowResponse) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-bold text-red-600 cursor-help">
              {value.toFixed(1)}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low response rate - data may not be representative
            </p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return <span>{value.toFixed(1)}</span>
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
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => {
                const isLowResponse = (course.response_rate ?? 0) < 30 && course.response_rate !== null
                const isExpanded = expandedCourseIds.has(course.id)
                
                // Detect display mode: 
                // - Class display when specific year+term selected (hook provides class objects)
                // - Section display when specific year only or all years/terms (hook provides section objects)
                const isClassDisplay = course.sections && course.sections.length > 0 && course.sections[0].class_code !== undefined
                
                // Show expand if:
                // - Multiple sections (when showing year/term view), OR
                // - Multiple classes (when showing class view)
                const hasMultipleItems = course.sections && course.sections.length > 1
                
                return (
                  <React.Fragment key={course.id}>
                    <TableRow
                      className={`${course.deleted_at ? 'opacity-60' : ''} ${hasMultipleItems ? 'cursor-pointer hover:bg-muted/30' : ''}`}
                      onClick={() => hasMultipleItems && toggleExpand(course.id)}
                    >
                      <TableCell className="px-2">
                        {hasMultipleItems && (
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
                          {hasMultipleItems && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({course.sections.length} {isClassDisplay ? 'classes' : 'sections'}{isExpanded ? '' : ' — click to expand'})
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
                        {hasMultipleItems && course.enrolled_count !== null && (
                          <div className="text-xs text-muted-foreground">{isClassDisplay ? '' : 'total'}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderCTECell(course.response_rate, isLowResponse)}
                        {hasMultipleItems && course.response_rate !== null && (
                          <div className="text-xs text-muted-foreground">{isClassDisplay ? '' : 'avg'}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderCTECell(course.course_mark, isLowResponse)}
                        {hasMultipleItems && course.course_mark !== null && (
                          <div className="text-xs text-muted-foreground">{isClassDisplay ? '' : 'avg'}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {renderCTECell(course.teacher_mark, isLowResponse)}
                        {hasMultipleItems && course.teacher_mark !== null && (
                          <div className="text-xs text-muted-foreground">{isClassDisplay ? '' : 'avg'}</div>
                        )}
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
                              onClick={() => {
                                setSelectedCourse(course)
                                setDeactivateDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivate(course)}
                              disabled={actionLoading}
                            >
                              <RotateCcw className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && course.sections.map((item, idx) => {
                      const itemLowResponse = (item.response_rate ?? 0) < 30 && item.response_rate !== null
                      const itemKey = isClassDisplay ? `${course.id}-cls-${item.section_id}` : `${course.id}-sec-${item.section_id}`
                      
                      return (
                        <React.Fragment key={itemKey}>
                          {isClassDisplay ? (
                            // Display as class row
                            <TableRow className="bg-muted/20">
                              <TableCell></TableCell>
                              <TableCell className="font-mono text-sm pl-6">
                                {item.class_code}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {item.location} • {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][item.day_of_week || 0]} {item.start_time}-{item.end_time}
                              </TableCell>
                              <TableCell></TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-center text-sm">
                                {item.enrolled_count}/{item.quota_max}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {renderCTECell(item.response_rate, itemLowResponse)}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {renderCTECell(item.course_mark, itemLowResponse)}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {renderCTECell(item.teacher_mark, itemLowResponse)}
                              </TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          ) : (
                            // Display as section row (year/term)
                            <React.Fragment>
                              <TableRow 
                                className="bg-muted/10"
                                onClick={() => {
                                  const hasMultipleClasses = item.classes && item.classes.length > 1
                                  hasMultipleClasses && toggleExpand(`${course.id}-sec-${item.section_id}`)
                                }}
                                style={{ cursor: (item.classes && item.classes.length > 1) ? 'pointer' : 'default' }}
                              >
                                <TableCell className="pl-6">
                                  {item.classes && item.classes.length > 1 && (
                                    expandedCourseIds.has(`${course.id}-sec-${item.section_id}`)
                                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  Y{item.year} T{item.term}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  Section {idx + 1}{item.classes && item.classes.length > 1 ? ` (${item.classes.length} classes)` : ''}
                                </TableCell>
                                <TableCell></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-center text-sm">
                                  {item.enrolled_count}/{item.quota_max}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {renderCTECell(item.response_rate, itemLowResponse)}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {renderCTECell(item.course_mark, itemLowResponse)}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {renderCTECell(item.teacher_mark, itemLowResponse)}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                              {expandedCourseIds.has(`${course.id}-sec-${item.section_id}`) && item.classes.map((cls) => (
                                <TableRow key={`${course.id}-cls-${cls.id}`} className="bg-muted/20">
                                  <TableCell></TableCell>
                                  <TableCell className="font-mono text-sm pl-12">
                                    {cls.class_code}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground" colSpan={7}>
                                    {cls.location} • {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][cls.day_of_week || 0]} {cls.start_time}-{cls.end_time}
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              ))}
                            </React.Fragment>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </React.Fragment>
                )
              })
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
