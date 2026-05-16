import { useMemo, memo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit, Trash2, Clock, MapPin, Search } from 'lucide-react'
import { TablePagination } from '@/components/ui/TablePagination'
import type { ClassWithDetails } from '@/types/database'

const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CURRENT_YEAR = new Date().getFullYear()

interface AdminClassesTableProps {
  classes: ClassWithDetails[]
  loading: boolean
  availableYears: number[]
  selectedYear: string
  onYearChange: (year: string) => void
  availableTerms: number[]
  selectedTerm: string
  onTermChange: (term: string) => void
  onEditClass: (cls: ClassWithDetails) => void
  onDeleteClass: (cls: ClassWithDetails) => void
}

// Helper function to calculate enrollment percentage
const calculateEnrollmentPercentage = (enrolled: number, quota: number): string => {
  if (!quota || quota === 0) return '0%'
  const percentage = (enrolled / quota) * 100
  return `${Math.round(percentage)}%`
}

// Memoized class row component
const ClassRow = memo(({ 
  cls, 
  onEdit,
  onDelete
}: { 
  cls: ClassWithDetails
  onEdit: () => void
  onDelete: () => void
}) => {
  const formatTime = (time: string) => {
    if (!time) return '-'
    return time.substring(0, 5)
  }

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-mono text-sm">{cls.class_code}</TableCell>
      <TableCell className="max-w-md">
        <div className="space-y-1">
          <div className="font-medium">{cls.course_title || '-'}</div>
          <div className="text-xs text-muted-foreground">{cls.course_code}</div>
        </div>
      </TableCell>
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
      <TableCell className="text-center text-sm">
        <div>
          <div>{cls.enrolled_count}/{cls.quota_max}</div>
          <div className="text-xs text-muted-foreground">
            {calculateEnrollmentPercentage(cls.enrolled_count, cls.quota_max)}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center text-sm">
        {cls.evaluation_data ? (
          <div className="space-y-1">
            <div className="text-xs">
              <span className="text-muted-foreground">Response:</span> {cls.evaluation_data.response_rate}%
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Course:</span> {cls.evaluation_data.course_mark}
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Teacher:</span> {cls.evaluation_data.teacher_mark}
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No data</span>
        )}
      </TableCell>
      <TableCell>{cls.lang || '-'}</TableCell>
      <TableCell>
        <div className="flex justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
})

ClassRow.displayName = 'ClassRow'

export function AdminClassesTable({
  classes,
  loading,
  availableYears,
  selectedYear,
  onYearChange,
  availableTerms,
  selectedTerm,
  onTermChange,
  onEditClass,
  onDeleteClass,
}: AdminClassesTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  // Filter classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery) return classes
    
    return classes.filter((cls) => 
      cls.class_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.instructor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.location?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [classes, searchQuery])

  // Calculate paginated data
  const paginatedClasses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredClasses.slice(startIndex, endIndex)
  }, [filteredClasses, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage)

  // Reset page when search query or items per page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
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
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year} {year === CURRENT_YEAR && '(Current)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedTerm} onValueChange={onTermChange}>
          <SelectTrigger className="w-[100px]">
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
        <span className="text-sm text-muted-foreground">
          {filteredClasses.length} classes
        </span>
      </div>

      {/* Rows per page selector above table */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
          handleItemsPerPageChange(parseInt(value))
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}>
          <SelectTrigger className="w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">Code</TableHead>
              <TableHead>Course</TableHead>
              <TableHead className="w-[100px]">Year/Term</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead className="w-[80px]">Day</TableHead>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[80px]">Enrollment</TableHead>
              <TableHead className="w-[100px]">Evaluation</TableHead>
              <TableHead className="w-[80px]">Lang</TableHead>
              <TableHead className="w-[80px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // Loading skeleton rows
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={11}>
                    <div className="h-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredClasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  {searchQuery ? 'No classes found matching your search' : 'No classes found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedClasses.map((cls) => (
                <ClassRow
                  key={cls.id}
                  cls={cls}
                  onEdit={() => onEditClass(cls)}
                  onDelete={() => onDeleteClass(cls)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredClasses.length > 0 && (
        <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClasses.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
      )}
    </div>
  )
}
