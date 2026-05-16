import { useState, useEffect } from 'react'
import { useAdminCourses } from '@/hooks/useAdminCourses'
import { AdminCoursesTable } from '@/components/admin/AdminCoursesTable'
import { EditCourseSheet } from '@/components/admin/EditCourseSheet'
import { CourseHistoryModal } from '@/components/admin/CourseHistoryModal'
import { Toaster } from '@/components/ui/sonner'
import type { AdminCourseSummary } from '@/types/database'

// CUHK Academic Year calculation helper
function getCuhkAcademicYear(): { year: number; term: number } {
  const now = new Date()
  const month = now.getMonth() + 1 // Convert to 1-12 format
  const currentYear = now.getFullYear()
  
  let academicYear: number
  let term: number
  
  // CUHK Academic Year: Sep (Month 9) to Aug (Month 8) belongs to the same academic year
  // Months 1-7 (Jan-Jul) belong to previous year's session
  if (month >= 9) { // Sep-Dec
    academicYear = currentYear
    term = 1 // Term 1: Sept-Dec
  } else if (month >= 1 && month <= 5) { // Jan-May
    academicYear = currentYear - 1
    term = 2 // Term 2: Jan-May
  } else { // Jun-Aug (Summer)
    academicYear = currentYear - 1
    term = 3 // Term 3: Summer
  }
  
  return { year: academicYear, term }
}

export function CourseCatalog() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [editingCourse, setEditingCourse] = useState<AdminCourseSummary | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedCourseForHistory, setSelectedCourseForHistory] = useState<AdminCourseSummary | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const { courses, loading, error, availableYears, availableTerms, refetch } = useAdminCourses({
    year: selectedYear,
    term: selectedTerm,
    showInactive,
  })

  // Auto-set academic year and term ONCE on initial load only
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized || availableYears.length === 0) return
    
    const { year: calculatedYear, term: calculatedTerm } = getCuhkAcademicYear()
    
    const finalYear = availableYears.includes(calculatedYear) 
      ? calculatedYear 
      : Math.max(...availableYears)
    
    setSelectedYear(finalYear)
    setSelectedTerm(calculatedTerm)
    setInitialized(true)
  }, [availableYears, initialized])

  const handleEditCourse = (course: AdminCourseSummary) => {
    setEditingCourse(course)
    setSheetOpen(true)
  }

  const handleViewHistory = (course: AdminCourseSummary) => {
    setSelectedCourseForHistory(course)
    setHistoryModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Course Management</h1>
        <p className="text-muted-foreground">
          Manage courses, view CTE evaluations, and track changes
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <AdminCoursesTable
        courses={courses}
        loading={loading}
        availableYears={availableYears}
        availableTerms={availableTerms}
        selectedYear={selectedYear}
        selectedTerm={selectedTerm}
        showInactive={showInactive}
        onYearChange={setSelectedYear}
        onTermChange={setSelectedTerm}
        onShowInactiveChange={setShowInactive}
        onEditCourse={handleEditCourse}
        onViewHistory={handleViewHistory}
      />

      <EditCourseSheet
        course={editingCourse}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSuccess={refetch}
      />

      <CourseHistoryModal
        course={selectedCourseForHistory}
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
      />

      <Toaster richColors position="top-right" />
    </div>
  )
}
