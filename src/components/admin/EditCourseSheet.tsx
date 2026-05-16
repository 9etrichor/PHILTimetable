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
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Save, Plus, X, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { updateCourse, addSubTopic, removeSubTopic } from '@/hooks/useAdminCourses'
import type { AdminCourseSummary } from '@/types/database'

interface EditCourseSheetProps {
  course: AdminCourseSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditCourseSheet({
  course,
  open,
  onOpenChange,
  onSuccess,
}: EditCourseSheetProps) {
  const [formData, setFormData] = useState({
    course_code: '',
    title: '',
    credits: 3,
    status: 'active',
  })
  const [quotaData, setQuotaData] = useState({
    quota_min: 0,
    quota_max: 30,
  })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'topics'>('edit')
  const [subTopics, setSubTopics] = useState<string[]>([])
  const [newTopic, setNewTopic] = useState('')
  const [topicSaving, setTopicSaving] = useState(false)

  useEffect(() => {
    if (course && open) {
      setFormData({
        course_code: course.course_code || '',
        title: course.title || '',
        credits: course.credits || 3,
        status: course.status || 'active',
      })
      setQuotaData({
        quota_min: course.sections?.[0]?.quota_min || 0,
        quota_max: course.sections?.[0]?.quota_max || 30,
      })
      setSubTopics(course.sub_topics || [])
    }
  }, [course, open])

  const handleAddTopic = async () => {
    if (!course || !newTopic.trim()) return
    setTopicSaving(true)
    const { success, error } = await addSubTopic(course.id, newTopic.trim())
    if (success) {
      setSubTopics([...subTopics, newTopic.trim()])
      setNewTopic('')
      toast.success('Sub-topic added')
    } else {
      toast.error(error || 'Failed to add sub-topic')
    }
    setTopicSaving(false)
  }

  const handleRemoveTopic = async (topic: string) => {
    if (!course) return
    setTopicSaving(true)
    const { success, error } = await removeSubTopic(course.id, topic)
    if (success) {
      setSubTopics(subTopics.filter((t) => t !== topic))
      toast.success('Sub-topic removed')
    } else {
      toast.error(error || 'Failed to remove sub-topic')
    }
    setTopicSaving(false)
  }

  const handleSave = async () => {
    if (!course) return
    setSaving(true)
    
    // Include sub_topics in the update data
    const updateData = {
      ...formData,
      sub_topics: subTopics,
    }
    
    const { success, error } = await updateCourse(course.id, updateData)
    if (success) {
      toast.success('Course updated successfully')
      onSuccess()
      onOpenChange(false)
    } else {
      toast.error(error || 'Failed to update course')
    }
    setSaving(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Course</SheetTitle>
          <SheetDescription>
            Make changes to the course information here.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-2">
            <Button
              variant={activeTab === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('edit')}
            >
              Edit Details
            </Button>
            <Button
              variant={activeTab === 'topics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('topics')}
            >
              <Tag className="h-4 w-4 mr-1" />
              Topics
            </Button>
          </div>

          {activeTab === 'edit' ? (
            <div className="space-y-4">
              {course?.history_codes && course.history_codes.length > 0 && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Previously known as:</p>
                  <div className="flex flex-wrap gap-1">
                    {course.history_codes.map((code, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="course_code">Course Code</Label>
                <Input
                  id="course_code"
                  value={formData.course_code}
                  onChange={(e) =>
                    setFormData({ ...formData, course_code: e.target.value })
                  }
                />
                {formData.course_code !== course?.course_code && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Old code will be saved to history
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    min={1}
                    max={6}
                    value={formData.credits}
                    onChange={(e) =>
                      setFormData({ ...formData, credits: parseInt(e.target.value, 10) || 3 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quota_min">Quota Min</Label>
                  <Input
                    id="quota_min"
                    type="number"
                    min={0}
                    value={quotaData.quota_min}
                    onChange={(e) =>
                      setQuotaData({ ...quotaData, quota_min: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quota_max">Quota Max</Label>
                  <Input
                    id="quota_max"
                    type="number"
                    min={1}
                    value={quotaData.quota_max}
                    onChange={(e) =>
                      setQuotaData({ ...quotaData, quota_max: parseInt(e.target.value, 10) || 30 })
                    }
                  />
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          ) : activeTab === 'topics' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new sub-topic..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTopic()
                    }
                  }}
                />
                <Button onClick={handleAddTopic} disabled={topicSaving || !newTopic.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {subTopics.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No sub-topics defined
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subTopics.map((topic, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleRemoveTopic(topic)}
                    >
                      {topic}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Click a topic to remove it. Changes are saved immediately.
              </p>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
