import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { History, ArrowRight } from 'lucide-react'
import { useCourseHistory, type CourseHistoryEntry } from '@/hooks/useAuditLog'
import type { AdminCourseSummary } from '@/types/database'

interface CourseHistoryModalProps {
  course: AdminCourseSummary | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CourseHistoryModal({ course, open, onOpenChange }: CourseHistoryModalProps) {
  const { history, loading, error } = useCourseHistory({
    courseId: course?.id,
    limit: 50
  })

  const getChangeTypeLabel = (type: CourseHistoryEntry['change_type']) => {
    switch (type) {
      case 'code_change':
        return 'Course Code Changed'
      case 'title_change':
        return 'Title Changed'
      case 'topics_change':
        return 'Topics Updated'
      case 'status_change':
        return 'Status Changed'
      default:
        return 'Unknown Change'
    }
  }

  const getChangeTypeColor = (type: CourseHistoryEntry['change_type']) => {
    switch (type) {
      case 'code_change':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'title_change':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'topics_change':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'status_change':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Course History: {course?.course_code} - {course?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 pr-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-4">
            {/* Current course info */}
            {course && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Current Course Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Code:</span> {course.course_code}
                  </div>
                  <div>
                    <span className="font-medium">Title:</span> {course.title}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Topics:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {course.sub_topics?.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {course.history_codes && course.history_codes.length > 0 && (
                    <div className="col-span-2">
                      <span className="font-medium">Previous Codes:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {course.history_codes.map((code, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* History entries */}
            <div className="space-y-3">
              <h3 className="font-medium">Change History</h3>
              
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))
              ) : error ? (
                <div className="text-destructive text-sm p-3 bg-destructive/10 rounded">
                  Error loading history: {error}
                </div>
              ) : history.length === 0 ? (
                <div className="text-muted-foreground text-center py-8">
                  No history records found for this course
                </div>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getChangeTypeColor(entry.change_type)}>
                          {getChangeTypeLabel(entry.change_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(entry.changed_at)}
                        </span>
                      </div>
                    </div>

                    {/* Change details */}
                    <div className="space-y-2">
                      {entry.change_type === 'code_change' && (
                        <div className="flex items-center gap-2 text-sm">
                          <code className="bg-muted px-2 py-1 rounded">{entry.previous_course_code}</code>
                          <ArrowRight className="h-4 w-4" />
                          <code className="bg-muted px-2 py-1 rounded">{entry.new_course_code}</code>
                        </div>
                      )}

                      {entry.change_type === 'title_change' && (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Previous:</span>
                            <div className="bg-muted/50 p-2 rounded mt-1">
                              {entry.previous_title}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">New:</span>
                            <div className="bg-muted/50 p-2 rounded mt-1">
                              {entry.new_title}
                            </div>
                          </div>
                        </div>
                      )}

                      {entry.change_type === 'topics_change' && (
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Previous Topics:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.previous_sub_topics?.map((topic, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">New Topics:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.new_sub_topics?.map((topic, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {entry.change_type === 'status_change' && (
                        <div className="text-sm">
                          {entry.metadata?.previous_status !== undefined && (
                            <Badge variant={entry.metadata.previous_status ? 'default' : 'secondary'}>
                              {entry.metadata.previous_status ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 inline mx-2" />
                          {entry.metadata?.new_status !== undefined && (
                            <Badge variant={entry.metadata.new_status ? 'default' : 'secondary'}>
                              {entry.metadata.new_status ? 'Active' : 'Inactive'}
                            </Badge>
                          )}
                        </div>
                      )}

                      {entry.change_reason && (
                        <div className="text-sm text-muted-foreground italic">
                          Reason: {entry.change_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
