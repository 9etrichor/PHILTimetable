import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAllClasses } from '@/hooks/useAllClasses'
import { useCourses } from '@/hooks/useCourses'
import type { ClassScheduleItem } from '@/hooks/useClassSchedule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Clock, User, X } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const VISIBLE_START_HOUR = 8
const VISIBLE_END_HOUR = 21
const TIMELINE_HEIGHT_PX = 800
const TIME_COLUMN_WIDTH_REM = 5

const getCourseColor = (courseCode: string) => {
  let hash = 0
  for (let i = 0; i < courseCode.length; i++) {
    hash = ((hash << 5) - hash) + courseCode.charCodeAt(i)
    hash = hash & hash
  }

  const colorPalette = [
    'bg-stone-100 border-stone-300 text-stone-800',
    'bg-amber-50 border-amber-200 text-amber-900',
    'bg-zinc-100 border-zinc-300 text-zinc-800',
    'bg-slate-100 border-slate-300 text-slate-800',
    'bg-neutral-100 border-neutral-300 text-neutral-800',
    'bg-emerald-50 border-emerald-200 text-emerald-900',
    'bg-teal-50 border-teal-200 text-teal-900',
    'bg-sky-50 border-sky-200 text-sky-900',
    'bg-indigo-50 border-indigo-200 text-indigo-900',
    'bg-violet-50 border-violet-200 text-violet-900',
    'bg-rose-50 border-rose-200 text-rose-900',
    'bg-orange-50 border-orange-200 text-orange-900'
  ]

  return colorPalette[Math.abs(hash) % colorPalette.length]
}

const getGroupedCollisionColor = (groupId: string) => {
  let hash = 0
  for (let i = 0; i < groupId.length; i++) {
    hash = ((hash << 5) - hash) + groupId.charCodeAt(i)
    hash = hash & hash
  }

  const groupPalette = [
    'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-900',
    'bg-cyan-50 border-cyan-300 text-cyan-900',
    'bg-lime-50 border-lime-300 text-lime-900',
    'bg-pink-50 border-pink-300 text-pink-900',
    'bg-blue-50 border-blue-300 text-blue-900',
    'bg-purple-50 border-purple-300 text-purple-900',
    'bg-emerald-50 border-emerald-300 text-emerald-900',
    'bg-orange-50 border-orange-300 text-orange-900'
  ]

  return groupPalette[Math.abs(hash) % groupPalette.length]
}

type PositionedClass = ClassScheduleItem & {
  left: number
  width: number
  column: number
  maxColumns: number
  collisionGroupId: string
}

type GroupedCollision = {
  id: string
  collisionGroupId: string
  dayIndex: number
  start_time: string
  end_time: string
  items: PositionedClass[]
  left: number
  width: number
}

const TimeTable = () => {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(2025)
  const [selectedTerm, setSelectedTerm] = useState<number>(1)
  const [courseInput, setCourseInput] = useState('')
  const [instructorInput, setInstructorInput] = useState('')
  const [selectedCollisionGroup, setSelectedCollisionGroup] = useState<GroupedCollision | null>(null)

  const { allClasses, loading: allClassesLoading, error, fetchAllClasses } = useAllClasses()
  const { courses, loading: coursesLoading } = useCourses({ year: selectedYear, term: selectedTerm })

  // Get unique courses for the selected year/term
  const availableCourses = useMemo(() => {
    const uniqueCourses = [...new Set(courses.map(c => c.class_code).filter(Boolean))]
    return uniqueCourses.sort()
  }, [courses])

  // Get unique instructors from all classes
  const availableInstructors = useMemo(() => {
    const instructors = new Set<string>()
    allClasses.forEach(cls => {
      if (cls.instructor_name) instructors.add(cls.instructor_name)
    })
    return Array.from(instructors).sort()
  }, [allClasses])

  // Add course to selection
  const addCourse = (courseCode: string) => {
    if (!courseCode.trim()) return
    if (!selectedCourses.includes(courseCode)) {
      setSelectedCourses([...selectedCourses, courseCode])
    }
    setCourseInput('')
  }

  // Remove course from selection
  const removeCourse = (courseCode: string) => {
    setSelectedCourses(selectedCourses.filter(c => c !== courseCode))
  }

  // Add instructor to selection
  const addInstructor = (instructor: string) => {
    if (!instructor.trim()) return
    if (!selectedInstructors.includes(instructor)) {
      setSelectedInstructors([...selectedInstructors, instructor])
    }
    setInstructorInput('')
  }

  // Remove instructor from selection
  const removeInstructor = (instructor: string) => {
    setSelectedInstructors(selectedInstructors.filter(i => i !== instructor))
  }

  // Fetch schedule when selection changes
  useEffect(() => {
    if (selectedYear && selectedTerm) {
      fetchAllClasses(selectedYear, selectedTerm)
    }
  }, [selectedYear, selectedTerm, fetchAllClasses])

  // Filter classes by instructor and course
  const filteredClasses = useMemo(() => {
    let classes = [...allClasses] // Start with all classes

    // If specific courses are selected, filter by those courses
    if (selectedCourses.length > 0) {
      classes = classes.filter(cls => 
        selectedCourses.includes(cls.class_code)
      )
    }

    // Filter by selected instructors
    if (selectedInstructors.length > 0) {
      classes = classes.filter(cls => 
        selectedInstructors.includes(cls.instructor_name)
      )
    }

    return classes
  }, [allClasses, selectedInstructors, selectedCourses])

  // Determine which classes to display
  const displayClasses = filteredClasses

  // Utility function to convert time string to minutes
  const timeToMinutes = useCallback((time: string) => {
    if (!time) return 0
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }, [])

  // Check if two classes overlap in time
  const classesOverlap = useCallback((cls1: ClassScheduleItem, cls2: ClassScheduleItem) => {
    const start1 = timeToMinutes(cls1.start_time!)
    const end1 = timeToMinutes(cls1.end_time!)
    const start2 = timeToMinutes(cls2.start_time!)
    const end2 = timeToMinutes(cls2.end_time!)
    return start1 < end2 && start2 < end1
  }, [timeToMinutes])

  // Convert database day_of_week to Monday-first order and hide Sunday
  const getDayIndex = useCallback((dayOfWeek: number) => {
    // Database uses: 1=Monday, 2=Tuesday, ..., 6=Saturday, 7=Sunday
    // Convert to: 0=Monday, ..., 5=Saturday, Sunday hidden
    if (dayOfWeek < 1 || dayOfWeek > 6) return null
    return dayOfWeek - 1
  }, [])

  // Google Calendar-style collision detection algorithm
  const getClassesWithCollisionHandling = useMemo(() => {
    // Group classes by day first
    const classesByDay = new Map<number, ClassScheduleItem[]>()
    
    displayClasses.forEach(cls => {
      if (!cls.start_time || !cls.end_time) return
      
      const dayIndex = getDayIndex(cls.day_of_week)
      if (dayIndex === null) return
      if (!classesByDay.has(dayIndex)) {
        classesByDay.set(dayIndex, [])
      }
      classesByDay.get(dayIndex)!.push(cls)
    })
    
    // Calculate positions for overlapping classes
    const positionedClasses: PositionedClass[] = []
    
    // Process days in the correct order (Monday to Saturday)
    for (let displayDayIndex = 0; displayDayIndex < DAYS.length; displayDayIndex++) {
      const classesInDay = classesByDay.get(displayDayIndex)
      if (!classesInDay || classesInDay.length === 0) continue
      
      // Sort classes by start time, then by end time (longer events first)
      const sortedClasses = [...classesInDay].sort((a, b) => {
        const startDiff = timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!)
        if (startDiff !== 0) return startDiff
        return timeToMinutes(b.end_time!) - timeToMinutes(a.end_time!)
      })
      
      if (sortedClasses.length === 0) continue
      
      // Build collision groups - events that overlap with each other
      const collisionGroups: ClassScheduleItem[][] = []
      
      sortedClasses.forEach(cls => {
        let addedToGroup = false
        
        // Try to add to an existing collision group
        for (const group of collisionGroups) {
          // Check if this class overlaps with any class in the group
          if (group.some(groupCls => classesOverlap(cls, groupCls))) {
            group.push(cls)
            addedToGroup = true
            break
          }
        }
        
        // If not added to any group, create a new group
        if (!addedToGroup) {
          collisionGroups.push([cls])
        }
      })
      
      // Process each collision group separately
      collisionGroups.forEach((group, groupIndex) => {
        // Sort group by start time again
        group.sort((a, b) => {
          const startDiff = timeToMinutes(a.start_time!) - timeToMinutes(b.start_time!)
          if (startDiff !== 0) return startDiff
          return timeToMinutes(b.end_time!) - timeToMinutes(a.end_time!)
        })
        
        // Assign columns using the column-based algorithm
        const columns: ClassScheduleItem[][] = []
        const collisionGroupId = `${displayDayIndex}-${groupIndex}`
        
        group.forEach(cls => {
          let placed = false
          
          // Try to place in existing columns
          for (let colIndex = 0; colIndex < columns.length; colIndex++) {
            const column = columns[colIndex]
            const lastInColumn = column[column.length - 1]
            
            // Check if current class overlaps with the last class in this column
            if (!classesOverlap(cls, lastInColumn)) {
              column.push(cls)
              placed = true
              break
            }
          }
          
          // If not placed, create a new column
          if (!placed) {
            columns.push([cls])
          }
        })
        
        // Calculate width and position for each class
        const maxColumns = columns.length
        const dayWidth = 100 / DAYS.length
        
        columns.forEach((column, colIndex) => {
          column.forEach(cls => {
            // Calculate left position: day offset + column offset
            const dayOffset = displayDayIndex * dayWidth
            const columnOffset = colIndex * (dayWidth / maxColumns)
            
            positionedClasses.push({
              ...cls,
              column: colIndex,
              maxColumns: maxColumns,
              collisionGroupId,
              left: dayOffset + columnOffset,
              width: Math.max(dayWidth / maxColumns - 0.3, 0.5)
            })
          })
        })
      })
    }
    
    return positionedClasses
  }, [displayClasses, timeToMinutes, classesOverlap, getDayIndex])

  const hourSlots = useMemo(
    () => Array.from({ length: VISIBLE_END_HOUR - VISIBLE_START_HOUR }, (_, index) => VISIBLE_START_HOUR + index),
    []
  )

  const hourLabels = useMemo(
    () => Array.from({ length: VISIBLE_END_HOUR - VISIBLE_START_HOUR + 1 }, (_, index) => VISIBLE_START_HOUR + index),
    []
  )

  const groupedCollisions = useMemo<GroupedCollision[]>(() => {
    const groups = new Map<string, PositionedClass[]>()
    
    getClassesWithCollisionHandling.forEach(cls => {
      const subgroupId = `${cls.collisionGroupId}-${cls.start_time}-${cls.end_time}`
      const existing = groups.get(subgroupId)
      if (existing) {
        existing.push(cls)
      } else {
        groups.set(subgroupId, [cls])
      }
    })

    return Array.from(groups.entries())
      .filter(([, items]) => items.length > 1)
      .map(([id, items]) => {
        const sortedItems = [...items].sort((a, b) => {
          const codeDiff = a.class_code.localeCompare(b.class_code)
          if (codeDiff !== 0) return codeDiff

          const instructorDiff = a.instructor_name.localeCompare(b.instructor_name)
          if (instructorDiff !== 0) return instructorDiff

          return a.id.localeCompare(b.id)
        })

        const firstItem = sortedItems[0]
        const dayIndex = getDayIndex(firstItem.day_of_week)

        if (dayIndex === null) return null

        const left = Math.min(...sortedItems.map(item => item.left))
        const right = Math.max(...sortedItems.map(item => item.left + item.width))

        return {
          id,
          collisionGroupId: firstItem.collisionGroupId,
          dayIndex,
          start_time: firstItem.start_time,
          end_time: firstItem.end_time,
          items: sortedItems,
          left,
          width: Math.max(right - left, 0.5)
        }
      })
      .filter((group): group is GroupedCollision => group !== null)
  }, [getClassesWithCollisionHandling, getDayIndex])

  const groupedClassIds = useMemo(
    () => new Set(groupedCollisions.flatMap((group: GroupedCollision) => group.items.map(item => item.id))),
    [groupedCollisions]
  )

  const visibleClasses = useMemo(
    () => getClassesWithCollisionHandling.filter(cls => !groupedClassIds.has(cls.id)),
    [getClassesWithCollisionHandling, groupedClassIds]
  )

  const laidOutItems = useMemo(() => {
    type RenderEntity = {
      id: string
      collisionGroupId: string
      dayIndex: number
      start_time: string
      end_time: string
      type: 'group' | 'class'
      group?: GroupedCollision
      cls?: PositionedClass
    }

    const groupedByCollisionGroup = new Map<string, RenderEntity[]>()

    groupedCollisions.forEach(group => {
      const existing = groupedByCollisionGroup.get(group.collisionGroupId) ?? []
      existing.push({
        id: group.id,
        collisionGroupId: group.collisionGroupId,
        dayIndex: group.dayIndex,
        start_time: group.start_time,
        end_time: group.end_time,
        type: 'group',
        group
      })
      groupedByCollisionGroup.set(group.collisionGroupId, existing)
    })

    visibleClasses.forEach(cls => {
      const dayIndex = getDayIndex(cls.day_of_week)
      if (dayIndex === null) return

      const existing = groupedByCollisionGroup.get(cls.collisionGroupId) ?? []
      existing.push({
        id: cls.id,
        collisionGroupId: cls.collisionGroupId,
        dayIndex,
        start_time: cls.start_time,
        end_time: cls.end_time,
        type: 'class',
        cls
      })
      groupedByCollisionGroup.set(cls.collisionGroupId, existing)
    })

    const dayWidth = 100 / DAYS.length
    const regroupedCollisions: GroupedCollision[] = []
    const regroupedClasses: PositionedClass[] = []

    groupedByCollisionGroup.forEach(entities => {
      const sortedEntities = [...entities].sort((a, b) => {
        const startDiff = timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        if (startDiff !== 0) return startDiff
        return timeToMinutes(b.end_time) - timeToMinutes(a.end_time)
      })

      const columns: RenderEntity[][] = []

      sortedEntities.forEach(entity => {
        let placed = false

        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
          const column = columns[colIndex]
          const lastInColumn = column[column.length - 1]

          if (timeToMinutes(entity.start_time) >= timeToMinutes(lastInColumn.end_time)) {
            column.push(entity)
            placed = true
            break
          }
        }

        if (!placed) {
          columns.push([entity])
        }
      })

      const maxColumns = Math.max(columns.length, 1)

      columns.forEach((column, colIndex) => {
        column.forEach(entity => {
          const left = entity.dayIndex * dayWidth + colIndex * (dayWidth / maxColumns)
          const width = Math.max(dayWidth / maxColumns - 0.3, 0.5)

          if (entity.type === 'group' && entity.group) {
            regroupedCollisions.push({
              ...entity.group,
              left,
              width
            })
            return
          }

          if (entity.type === 'class' && entity.cls) {
            regroupedClasses.push({
              ...entity.cls,
              left,
              width,
              column: colIndex,
              maxColumns
            })
          }
        })
      })
    })

    return {
      groupedCollisions: regroupedCollisions,
      visibleClasses: regroupedClasses
    }
  }, [groupedCollisions, visibleClasses, getDayIndex, timeToMinutes])

  // Calculate position and height for a class (using collision handling positions)
  const calculateClassStyle = (cls: ClassScheduleItem & { left?: number; width?: number }) => {
    if (!cls.start_time || !cls.end_time) return null
    
    const visibleStartMinutes = VISIBLE_START_HOUR * 60
    const visibleEndMinutes = VISIBLE_END_HOUR * 60
    const totalVisibleMinutes = visibleEndMinutes - visibleStartMinutes
    
    // Normalize start and end to minutes since midnight
    let startMinutes = timeToMinutes(cls.start_time)
    let endMinutes = timeToMinutes(cls.end_time)
    
    if (endMinutes <= visibleStartMinutes || startMinutes >= visibleEndMinutes) {
      return null
    }

    // Clamp to visible range (prevent negative or overflow values)
    startMinutes = Math.max(visibleStartMinutes, startMinutes)
    endMinutes = Math.min(visibleEndMinutes, endMinutes)
    
    const durationMinutes = Math.max(0, endMinutes - startMinutes) // Prevent negative height
    
    // Convert to percentages
    const topPercent = ((startMinutes - visibleStartMinutes) / totalVisibleMinutes) * 100
    const heightPercent = (durationMinutes / totalVisibleMinutes) * 100
    
    // Use collision-calculated positions if available, otherwise fallback
    const fallbackDayIndex = getDayIndex(cls.day_of_week)
    if (fallbackDayIndex === null) return null

    const left = cls.left !== undefined ? cls.left : (fallbackDayIndex * 100) / DAYS.length
    const width = cls.width !== undefined ? cls.width : 100 / DAYS.length
    
    return {
      top: `${Math.max(0, Math.min(100, topPercent))}%`,   // Clamp between 0-100%
      height: `${Math.max(0.5, heightPercent)}%`,         // Minimum visible height
      left: `${left}%`,
      width: `${width}%`
    }
  }

  const formatTime = (time: string) => {
    if (!time) return ''
    return time.substring(0, 5)
  }

  const formatHourLabel = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getGroupedPreview = (items: PositionedClass[]) => {
    const uniqueCodes = Array.from(new Set(items.map(item => item.class_code)))
    const previewCodes = uniqueCodes.slice(0, 2)

    if (uniqueCodes.length <= 2) {
      return previewCodes.join(', ')
    }

    return `${previewCodes.join(', ')}, +${uniqueCodes.length - previewCodes.length} more`
  }

  const getCourseInfo = (courseCode: string) => {
    return courses.find(c => c.class_code === courseCode)
  }

  if (coursesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Course Timetable</h1>
          <p className="text-muted-foreground">View weekly schedule for courses</p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Dialog
        open={selectedCollisionGroup !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCollisionGroup(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCollisionGroup ? `${selectedCollisionGroup.items.length} overlapping classes` : 'Overlapping classes'}
            </DialogTitle>
            <DialogDescription>
              {selectedCollisionGroup
                ? `${DAYS[selectedCollisionGroup.dayIndex]}`
                : 'Review grouped timetable items'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="sticky top-0 z-10 mb-2 hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3 rounded-md border bg-background/95 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur sm:grid">
              <div>Course</div>
              <div>Instructor</div>
            </div>
            <div className="space-y-2">
              {selectedCollisionGroup?.items.map(item => (
                <div key={item.id} className={`rounded-lg border p-3 ${getCourseColor(item.class_code)}`}>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:items-start sm:gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold tracking-tight">{item.class_code}</div>
                      <div className="mt-1 sm:hidden">
                        <Badge variant="secondary">{DAYS[item.day_of_week - 1]}</Badge>
                      </div>
                    </div>
                    <div className="min-w-0 text-sm text-muted-foreground">
                      <div className="truncate">{item.instructor_name || 'TBA'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <div>
        <h1 className="text-2xl font-bold">Course Timetable</h1>
        <p className="text-muted-foreground">View weekly schedule for courses</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Term</label>
              <Select
                value={selectedTerm.toString()}
                onValueChange={(value) => setSelectedTerm(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">T1</SelectItem>
                  <SelectItem value="2">T2</SelectItem>
                  <SelectItem value="3">T3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Courses</label>
              <div className="flex gap-2">
                <Select
                  value={courseInput}
                  onValueChange={setCourseInput}
                  disabled={availableCourses.length === 0}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select courses" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCourses.map(courseCode => {
                      const course = getCourseInfo(courseCode)
                      return (
                        <SelectItem key={courseCode} value={courseCode}>
                          {courseCode} - {course?.title || 'Unknown Course'}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => addCourse(courseInput)}
                  disabled={!courseInput}
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Instructors</label>
              <div className="flex gap-2">
                <Select
                  value={instructorInput}
                  onValueChange={setInstructorInput}
                  disabled={availableInstructors.length === 0}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select instructors" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInstructors.map(instructor => (
                      <SelectItem key={instructor} value={instructor}>
                        {instructor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  onClick={() => addInstructor(instructorInput)}
                  disabled={!instructorInput}
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {(selectedCourses.length > 0 || selectedInstructors.length > 0) && (
            <div className="mt-4 space-y-2">
              {selectedCourses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCourses.map(courseCode => (
                    <Badge
                      key={courseCode}
                      className="bg-blue-100 text-blue-800 cursor-pointer"
                      onClick={() => removeCourse(courseCode)}
                    >
                      {courseCode}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedCourses([])}
                  >
                    Clear courses
                  </button>
                </div>
              )}

              {selectedInstructors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedInstructors.map(instructor => (
                    <Badge
                      key={instructor}
                      className="bg-green-100 text-green-800 cursor-pointer"
                      onClick={() => removeInstructor(instructor)}
                    >
                      {instructor}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedInstructors([])}
                  >
                    Clear instructors
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {selectedCourses.length > 0
              ? `${selectedCourses.length} Courses`
              : 'All Courses'}
            <Badge variant="secondary">{selectedYear} T{selectedTerm}</Badge>
            {selectedInstructors.length > 0 && (
              <Badge variant="outline">
                {selectedInstructors.length} Instructors
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursesLoading || allClassesLoading ? (
            <div className="space-y-2">
              {[...Array(28)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : displayClasses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {selectedCourses.length > 0
                ? 'No classes scheduled for selected courses'
                : 'No courses found'}
            </div>
          ) : (
            <div className="relative">
              <div className="w-full overflow-x-auto">
                <div className="min-w-[960px]">
                  <div className="flex border-b">
                    <div className="w-20 p-2 text-sm font-medium text-muted-foreground">Time</div>
                    <div className="grid flex-1 grid-cols-6">
                      {DAYS.map(day => (
                        <div key={day} className="text-sm font-medium text-center p-2 border-l">
                          {day.substring(0, 3)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative" style={{ height: `${TIMELINE_HEIGHT_PX}px` }}>
                    {hourSlots.map(hour => (
                      <div
                        key={hour}
                        className="pointer-events-none absolute inset-x-0 flex border-b"
                        style={{
                          top: `${((hour - VISIBLE_START_HOUR) / hourSlots.length) * 100}%`,
                          height: `${100 / hourSlots.length}%`
                        }}
                      >
                        <div className="w-20 pr-2 pt-1 text-xs text-muted-foreground text-right">
                          {formatHourLabel(hour)}
                        </div>
                        <div className="grid flex-1 grid-cols-6">
                          {DAYS.map((_, dayIndex) => (
                            <div key={dayIndex} className="border-l"></div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div
                      className="pointer-events-none absolute inset-x-0 flex"
                      style={{ top: '100%' }}
                    >
                      <div className="w-20 pr-2 pt-1 text-xs text-muted-foreground text-right">
                        {formatHourLabel(hourLabels[hourLabels.length - 1])}
                      </div>
                      <div className="flex-1"></div>
                    </div>

                    <div
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${TIME_COLUMN_WIDTH_REM}rem`,
                        right: 0
                      }}
                    >
                      {laidOutItems.groupedCollisions.map(group => {
                        const previewText = getGroupedPreview(group.items)
                        const groupColorClass = getGroupedCollisionColor(group.id)
                        const showGroupedTime = group.width >= 10
                        const showGroupedPreview = group.width >= 14
                        const style = calculateClassStyle({
                          id: group.id,
                          class_code: group.items[0].class_code,
                          day_of_week: group.items[0].day_of_week,
                          start_time: group.start_time,
                          end_time: group.end_time,
                          location: '',
                          lang: group.items[0].lang,
                          instructor_name: '',
                          left: group.left,
                          width: group.width
                        })

                        if (!style) return null

                        return (
                          <button
                            key={group.id}
                            type="button"
                            className={`absolute flex flex-col items-start justify-between rounded border px-2 py-1.5 text-left shadow-sm transition-all hover:z-50 hover:shadow-lg ${groupColorClass}`}
                            style={{
                              top: style.top,
                              height: style.height,
                              left: style.left,
                              width: style.width,
                              overflow: 'hidden'
                            }}
                            onClick={() => setSelectedCollisionGroup(group)}
                            title={`${group.items.length} grouped classes`}
                          >
                            <Badge variant="secondary" className="mb-1 self-start">
                              {group.items.length}
                            </Badge>
                            {showGroupedTime && (
                              <div className="min-w-0 space-y-1">
                                <div className="text-xs font-semibold leading-tight">{formatTime(group.start_time)} - {formatTime(group.end_time)}</div>
                                {showGroupedPreview && (
                                  <div className="truncate text-[11px] text-stone-700">{previewText}</div>
                                )}
                              </div>
                            )}
                          </button>
                        )
                      })}

                      {laidOutItems.visibleClasses.map(cls => {
                        const style = calculateClassStyle(cls)
                        if (!style) return null

                        const durationMinutes = timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)
                        const isNarrow = cls.maxColumns >= 3
                        const isVeryNarrow = cls.maxColumns >= 4
                        const isShort = durationMinutes <= 45
                        const isVeryShort = durationMinutes <= 30
                        const showCompactContent = isNarrow || isShort
                        const showMinimalContent = isVeryNarrow || isVeryShort

                        return (
                          <div
                            key={cls.id}
                            className={`absolute border rounded group cursor-pointer transition-all hover:z-50 hover:shadow-lg ${getCourseColor(cls.class_code)} ${showCompactContent ? 'p-1' : 'p-2'}`}
                            style={{
                              top: style.top,
                              height: style.height,
                              left: style.left,
                              width: style.width,
                              overflow: 'hidden'
                            }}
                            title={`${cls.class_code}\n${formatTime(cls.start_time)} - ${formatTime(cls.end_time)}${cls.instructor_name ? '\n' + cls.instructor_name : ''}`}
                          >
                            {showMinimalContent ? (
                              <div className="space-y-0.5 text-[10px] leading-tight">
                                <div className="truncate font-semibold tracking-tight">{cls.class_code}</div>
                                {!isVeryShort && <div className="truncate text-[9px] text-foreground/80">{formatTime(cls.start_time)}</div>}
                              </div>
                            ) : showCompactContent ? (
                              <div className="space-y-1 text-xs">
                                <div className="truncate font-semibold tracking-tight">{cls.class_code}</div>
                                <div className="truncate text-[10px] text-foreground/85">
                                  {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1.5 text-xs">
                                <div className="truncate font-semibold tracking-tight">{cls.class_code}</div>
                                <div className="flex items-center gap-1 text-[11px] text-foreground/90">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                                </div>
                                {cls.instructor_name && (
                                  <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{cls.instructor_name}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="absolute left-0 top-full z-50 mt-1 hidden min-w-[200px] max-w-[300px] rounded-lg border bg-white p-3 shadow-xl group-hover:block dark:bg-gray-800">
                              <div className="space-y-2 text-sm">
                                <div className="font-semibold text-base">{cls.class_code}</div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 shrink-0" />
                                  <span>{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                                </div>
                                {cls.instructor_name && (
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 shrink-0" />
                                    <span>{cls.instructor_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TimeTable