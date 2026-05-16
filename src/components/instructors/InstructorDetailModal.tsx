import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Mail, User } from 'lucide-react'
import { useInstructor } from '@/hooks/useInstructor'

interface InstructorDetailModalProps {
  instructorName: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstructorDetailModal({
  instructorName,
  open,
  onOpenChange,
}: InstructorDetailModalProps) {
  const { instructor, loading, error, fetchByName, clear } = useInstructor()

  useEffect(() => {
    if (open && instructorName) {
      fetchByName(instructorName)
    } else if (!open) {
      clear()
    }
  }, [open, instructorName, fetchByName, clear])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Instructor Details
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : instructor ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{instructor.name}</h3>
              {instructor.title && (
                <p className="text-muted-foreground">{instructor.title}</p>
              )}
            </div>

            {instructor.nature && (
              <div>
                <Badge variant="outline">{instructor.nature}</Badge>
              </div>
            )}

            {instructor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${instructor.email}`}
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {instructor.email}
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No instructor found</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
