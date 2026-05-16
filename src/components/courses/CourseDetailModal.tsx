import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useClassSchedule, DAY_NAMES } from '@/hooks/useClassSchedule'
import type { VStudentCourseCatalog } from '@/types/database'

interface CourseDetailModalProps {
  course: VStudentCourseCatalog | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstructorClick: (instructorName: string) => void
}

function formatTime(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export function CourseDetailModal({ course, open, onOpenChange, onInstructorClick }: CourseDetailModalProps) {
  const { schedule, loading, error, fetchSchedule } = useClassSchedule()

  useEffect(() => {
    if (open && course) {
      fetchSchedule(course.course_code, course.year, course.term)
    }
  }, [open, course, fetchSchedule])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">
            {course?.course_code} - {course?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {course?.sub_topics && course.sub_topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {course.sub_topics.map((topic, index) => (
                <Badge key={index} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Credits:</span>{' '}
              <span className="font-medium">{course?.credits}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lecturer:</span>{' '}
              {course?.lecturer_name ? (
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => onInstructorClick(course.lecturer_name)}
                >
                  {course.lecturer_name}
                </button>
              ) : (
                <span className="font-medium">TBA</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Year/Term:</span>{' '}
              <span className="font-medium">{course?.year} / Term {course?.term}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Class Schedule</h4>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : error ? (
              <p className="text-destructive text-sm">{error}</p>
            ) : schedule.length === 0 ? (
              <p className="text-muted-foreground text-sm">No schedule available</p>
            ) : (
              <div className="space-y-2">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-sm"
                  >
                    <div>
                      <span className="text-muted-foreground text-xs block">Class</span>
                      <span className="font-medium">{item.class_code || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Day</span>
                      <span>{DAY_NAMES[item.day_of_week] || item.day_of_week}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Time</span>
                      <span>{formatTime(item.start_time)} - {formatTime(item.end_time)}</span>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1">
                      <span className="text-muted-foreground text-xs block">Location</span>
                      <span className="break-words">{item.location || 'TBA'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs block">Instructor</span>
                      {item.instructor_name ? (
                        <button
                          className="text-primary hover:underline text-left break-words"
                          onClick={() => onInstructorClick(item.instructor_name)}
                        >
                          {item.instructor_name}
                        </button>
                      ) : (
                        <span className="break-words">TBA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
