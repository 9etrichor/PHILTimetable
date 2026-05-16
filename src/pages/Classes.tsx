import { useState, useEffect, memo } from 'react'
import { useAdminClasses, deleteClass, fetchInstructorsForSelect } from '@/hooks/useAdminCourses'
import { AdminClassesTable } from '@/components/admin/AdminClassesTable'
import { EditClassSheet } from '@/components/admin/EditClassSheet'
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
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import type { ClassWithDetails, InstructorOption } from '@/types/database'

const CURRENT_YEAR = new Date().getFullYear()

export function Classes() {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR)
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const { classes, loading, error, refetch } = useAdminClasses({ year: selectedYear, term: selectedTerm })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassWithDetails | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingClass, setDeletingClass] = useState<ClassWithDetails | null>(null)
  const [instructors, setInstructors] = useState<InstructorOption[]>([])

  // Get available years and terms from classes data
  const availableYears = Array.from(new Set(classes.map(cls => cls.section_year))).filter(Boolean).sort((a, b) => b - a)
  const availableTerms = Array.from(new Set(classes.map(cls => cls.section_term))).filter(Boolean).sort((a, b) => a - b)

  useEffect(() => {
    loadInstructors()
  }, [])

  const loadInstructors = async () => {
    try {
      const { instructors: instructorData } = await fetchInstructorsForSelect()
      setInstructors(instructorData || [])
    } catch (err) {
      console.error('Failed to load instructors:', err)
    }
  }

  const handleEditClass = (cls: ClassWithDetails) => {
    setEditingClass(cls)
    setSheetOpen(true)
  }

  const handleDeleteClass = (cls: ClassWithDetails) => {
    setDeletingClass(cls)
    setDeleteDialogOpen(true)
  }

  const handleAddClass = () => {
    setEditingClass(null)
    setSheetOpen(true)
  }

  const handleDeleteConfirm = async () => {
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

  const handleClassSave = async () => {
    setSheetOpen(false)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage class schedules and assignments</p>
        </div>
        <Button onClick={handleAddClass}>
          <Plus className="h-4 w-4 mr-2" />
          Add Class
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <AdminClassesTable
        classes={classes}
        loading={loading}
        availableYears={availableYears}
        selectedYear={selectedYear.toString()}
        onYearChange={(year: string) => setSelectedYear(year === 'all' ? CURRENT_YEAR : parseInt(year))}
        availableTerms={availableTerms}
        selectedTerm={selectedTerm?.toString() || 'all'}
        onTermChange={(term: string) => setSelectedTerm(term === 'all' ? null : parseInt(term))}
        onEditClass={handleEditClass}
        onDeleteClass={handleDeleteClass}
      />

      <EditClassSheet
        classData={editingClass}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={handleClassSave}
        instructors={instructors}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete class "{deletingClass?.class_code}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}

export const ClassesPage = memo(Classes)
