import { useState, useEffect, useMemo } from 'react'
import {
  useAdminClasses,
  createClass,
  updateClass,
  deleteClass,
  fetchInstructorsForSelect,
} from '@/hooks/useAdminClasses'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Save, Clock, MapPin, Search, ChevronRight, ChevronDown } from 'lucide-react'

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CURRENT_YEAR = new Date().getFullYear()

interface ClassFormData {
  section_id: string
  instructor_id: string
  class_code: string
  day_of_week: number
  start_time: string
  end_time: string
  location: string
  lang: string
}

interface InstructorOption {
  id: string
  name: string
}



export function Classes() {
  const { classes, loading, error, refetch } = useAdminClasses()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<typeof classes[0] | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingClass, setDeletingClass] = useState<typeof classes[0] | null>(null)
  const [saving, setSaving] = useState(false)
  const [instructors, setInstructors] = useState<InstructorOption[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [yearFilter, setYearFilter] = useState<string>(CURRENT_YEAR.toString())
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState<ClassFormData>({
    section_id: '',
    instructor_id: '',
    class_code: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    lang: 'English',
  })

  useEffect(() => {
    loadInstructors()
  }, [])

  const loadInstructors = async () => {
    const { instructors: data } = await fetchInstructorsForSelect()
    setInstructors(data)
  }

  
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    classes.forEach((cls) => {
      if (cls.section_year) years.add(cls.section_year)
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [classes])

  
  const filteredAndGroupedClasses = useMemo(() => {
    let filtered = classes.filter((cls) => {
      const matchesSearch =
        searchQuery === '' ||
        cls.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.class_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.location?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesYear =
        yearFilter === 'all' || (cls.section_year?.toString() || '') === yearFilter

      return matchesSearch && matchesYear
    })


    const grouped: Record<string, typeof classes> = {}

    filtered.forEach((cls) => {
      const key = cls.course_code || 'Unknown'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(cls)
    })

    return Object.entries(grouped)
      .map(([course_code, classes]) => ({ course_code, classes }))
      .sort((a, b) => a.course_code.localeCompare(b.course_code))
  }, [classes, searchQuery, yearFilter])

  const toggleCourse = (courseCode: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev)
      if (next.has(courseCode)) {
        next.delete(courseCode)
      } else {
        next.add(courseCode)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedCourses(new Set(filteredAndGroupedClasses.map((g) => g.course_code)))
  }

  const collapseAll = () => {
    setExpandedCourses(new Set())
  }

  const [selectedCourseCode, setSelectedCourseCode] = useState<string | null>(null)

  const openCreateSheetForCourse = (courseCode: string) => {
    setEditingClass(null)
    setSelectedCourseCode(courseCode)
    setFormData({
      section_id: '',
      instructor_id: '',
      class_code: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      location: '',
      lang: 'English',
    })
    setSheetOpen(true)
  }

  const openEditSheet = (cls: typeof classes[0]) => {
    setEditingClass(cls)
    setFormData({
      section_id: cls.section_id || '',
      instructor_id: cls.instructor_id || '',
      class_code: cls.class_code || '',
      day_of_week: cls.day_of_week || 1,
      start_time: cls.start_time || '09:00',
      end_time: cls.end_time || '10:00',
      location: cls.location || '',
      lang: cls.lang || 'English',
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!formData.class_code.trim()) {
      toast.error('Class code is required')
      return
    }
    if (!formData.instructor_id) {
      toast.error('Instructor is required')
      return
    }

    setSaving(true)

    if (editingClass) {
      const { success, error } = await updateClass(editingClass.id, {
        instructor_id: formData.instructor_id,
        class_code: formData.class_code,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location,
        lang: formData.lang,
      })
      if (success) {
        toast.success('Class updated')
        setSheetOpen(false)
        refetch()
      } else {
        toast.error(error || 'Failed to update class')
      }
    } else {
      if (!formData.section_id) {
        toast.error('Section is required for new classes')
        setSaving(false)
        return
      }
      const { success, error } = await createClass(formData)
      if (success) {
        toast.success('Class created')
        setSheetOpen(false)
        refetch()
      } else {
        toast.error(error || 'Failed to create class')
      }
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deletingClass) return

    const { success, error } = await deleteClass(deletingClass.id)
    if (success) {
      toast.success('Class deleted')
      refetch()
    } else {
      toast.error(error || 'Failed to delete class')
    }

    setDeleteDialogOpen(false)
    setDeletingClass(null)
  }

  const formatTime = (time: string) => {
    if (!time) return '-'
    return time.substring(0, 5)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage class schedules and assignments</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by course, class code, instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={(year || 0).toString()}>
                {year} {year === CURRENT_YEAR && '(Current)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredAndGroupedClasses.reduce((acc, g) => acc + g.classes.length, 0)} classes in {filteredAndGroupedClasses.length} courses
        </span>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filteredAndGroupedClasses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No classes found
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndGroupedClasses.map((group) => (
            <Collapsible
              key={group.course_code}
              open={expandedCourses.has(group.course_code)}
              onOpenChange={() => toggleCourse(group.course_code)}
            >
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80">
                    {expandedCourses.has(group.course_code) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{group.course_code}</span>
                    <Badge variant="secondary">{group.classes.length} classes</Badge>
                  </div>
                </CollapsibleTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openCreateSheetForCourse(group.course_code)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Class
                </Button>
              </div>
              <CollapsibleContent>
                {group.classes.length === 0 ? (
                  <div className="mt-1 p-6 rounded-lg border text-center text-muted-foreground">
                    <p>No classes scheduled for {yearFilter}</p>
                    <p className="text-sm mt-1">Click "Add Class" to create a class for this course</p>
                  </div>
                ) : (
                <div className="mt-1 rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[80px]">Code</TableHead>
                        <TableHead className="w-[100px]">Year/Term</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead className="w-[80px]">Day</TableHead>
                        <TableHead className="w-[120px]">Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="w-[80px]">Lang</TableHead>
                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.classes.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-mono text-sm">{cls.class_code}</TableCell>
                          <TableCell>
                            <Badge variant={cls.section_year === CURRENT_YEAR ? 'default' : 'outline'} className="text-xs">
                              {cls.section_year} T{cls.section_term}
                            </Badge>
                          </TableCell>
                          <TableCell>{cls.instructor_name || '-'}</TableCell>
                          <TableCell>{DAY_NAMES[cls.day_of_week || 1] || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {cls.location ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {cls.location}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{cls.lang || '-'}</TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSheet(cls)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeletingClass(cls)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader className="px-1">
            <SheetTitle>
              {editingClass ? 'Edit Class' : selectedCourseCode ? `Add Class to ${selectedCourseCode}` : 'Add Class'}
            </SheetTitle>
            <SheetDescription>
              {editingClass
                ? 'Update class schedule and assignment'
                : selectedCourseCode
                ? `Create a new class session for ${selectedCourseCode}`
                : 'Create a new class session'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            <div className="space-y-2">
              <Label htmlFor="class_code">Class Code *</Label>
              <Input
                id="class_code"
                value={formData.class_code}
                onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                placeholder="L01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructor">Instructor *</Label>
              <Select
                value={formData.instructor_id || ''}
                onValueChange={(v) => setFormData({ ...formData, instructor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="day">Day of Week</Label>
              <Select
                value={(formData.day_of_week || 1).toString()}
                onValueChange={(v) => setFormData({ ...formData, day_of_week: parseInt(v, 10) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <SelectItem key={day} value={(day || 1).toString()}>
                      {DAY_NAMES[day || 1]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Room 101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lang">Language</Label>
              <Select
                value={formData.lang || 'English'}
                onValueChange={(v) => setFormData({ ...formData, lang: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Cantonese">Cantonese</SelectItem>
                  <SelectItem value="Putonghua">Putonghua</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : editingClass ? 'Update' : 'Create'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete class "{deletingClass?.class_code || 'unknown'}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster richColors position="top-right" />
    </div>
  )
}
