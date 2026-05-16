import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { createClass, updateClass } from '@/hooks/useAdminCourses'
import type { ClassWithDetails, InstructorOption } from '@/types/database'

interface EditClassSheetProps {
  classData: ClassWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  instructors: InstructorOption[]
}

const DAY_NAMES = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

export function EditClassSheet({
  classData,
  open,
  onOpenChange,
  onSuccess,
  instructors,
}: EditClassSheetProps) {
  const [formData, setFormData] = useState({
    section_id: '',
    instructor_id: '',
    class_code: '',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    location: '',
    lang: 'English',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (classData && open) {
      setFormData({
        section_id: classData.section_id || '',
        instructor_id: classData.instructor_id || '',
        class_code: classData.class_code || '',
        day_of_week: classData.day_of_week || 1,
        start_time: classData.start_time || '09:00',
        end_time: classData.end_time || '10:00',
        location: classData.location || '',
        lang: classData.lang || 'English',
      })
    } else if (!classData && open) {
      // Reset form for new class
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
    }
  }, [classData, open])

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

    if (classData) {
      // Update existing class
      const { success, error } = await updateClass(classData.id, {
        instructor_id: formData.instructor_id,
        class_code: formData.class_code,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location,
        lang: formData.lang,
      })
      if (success) {
        toast.success('Class updated successfully')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(error || 'Failed to update class')
      }
    } else {
      // Create new class
      if (!formData.section_id) {
        toast.error('Section is required for new classes')
        setSaving(false)
        return
      }
      const { success, error } = await createClass(formData)
      if (success) {
        toast.success('Class created successfully')
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(error || 'Failed to create class')
      }
    }

    setSaving(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {classData ? 'Edit Class' : 'Add Class'}
          </SheetTitle>
          <SheetDescription>
            {classData ? 'Make changes to the class information here.' : 'Create a new class for a course section.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!classData && (
            <div className="space-y-2">
              <Label htmlFor="section_id">Section</Label>
              <Input
                id="section_id"
                placeholder="Enter section ID"
                value={formData.section_id}
                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="class_code">Class Code</Label>
            <Input
              id="class_code"
              placeholder="e.g., L01, L02"
              value={formData.class_code}
              onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructor_id">Instructor</Label>
            <Select value={formData.instructor_id} onValueChange={(value) => setFormData({ ...formData, instructor_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((instructor) => (
                  <SelectItem key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day_of_week">Day of Week</Label>
            <Select value={formData.day_of_week.toString()} onValueChange={(value) => setFormData({ ...formData, day_of_week: parseInt(value) })}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
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
              placeholder="e.g., Room 101, Building A"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lang">Language</Label>
            <Select value={formData.lang} onValueChange={(value) => setFormData({ ...formData, lang: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Cantonese">Cantonese</SelectItem>
                <SelectItem value="Mandarin">Mandarin</SelectItem>
                <SelectItem value="Putonghua">Putonghua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full mt-4"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : (classData ? 'Update Class' : 'Create Class')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
