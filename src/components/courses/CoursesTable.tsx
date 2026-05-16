import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { X } from 'lucide-react'
import type { VStudentCourseCatalog } from '@/types/database'

interface CoursesTableProps {
  courses: VStudentCourseCatalog[]
  loading: boolean
  availableYears: number[]
  availableTerms: number[]
  selectedYear: number | null
  selectedTerm: number | null
  onYearChange: (year: number | null) => void
  onTermChange: (term: number | null) => void
  onCourseClick: (course: VStudentCourseCatalog) => void
  onInstructorClick: (instructorName: string) => void
}

type SearchType = 'code' | 'title' | 'teacher' | 'area'

interface SearchChip {
  type: SearchType
  value: string
}

const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  code: 'Code',
  title: 'Title',
  teacher: 'Teacher',
  area: 'Area',
}

const SEARCH_TYPE_COLORS: Record<SearchType, string> = {
  code: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  title: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  teacher: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  area: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

const TOPIC_COLORS: Record<string, string> = {
  'Chinese Philosophy': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Western Philosophy': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Logic': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Ethics': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Core': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'Elective': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
}

function getTopicColor(topic: string): string {
  return TOPIC_COLORS[topic] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

function formatEnrollment(enrolled: number, min: number, max: number): string {
  if (min !== max) {
    return `${enrolled} / ${min}-${max}`
  }
  return `${enrolled} / ${max}`
}

export function CoursesTable({
  courses,
  loading,
  availableYears,
  availableTerms,
  selectedYear,
  selectedTerm,
  onYearChange,
  onTermChange,
  onCourseClick,
  onInstructorClick,
}: CoursesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [searchInput, setSearchInput] = useState('')
  const [searchChips, setSearchChips] = useState<SearchChip[]>([])
  const [searchType, setSearchType] = useState<SearchType>('title')


  const addChip = (type: SearchType, value: string) => {
    if (!value.trim()) return
    const exists = searchChips.some((c) => c.type === type && c.value.toLowerCase() === value.toLowerCase())
    if (!exists) {
      setSearchChips([...searchChips, { type, value: value.trim() }])
    }
    setSearchInput('')
  }

  const removeChip = (index: number) => {
    setSearchChips(searchChips.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      e.preventDefault()
      addChip(searchType, searchInput)
    }
  }

  const filteredCourses = useMemo(() => {
    if (searchChips.length === 0) return courses

    // Group chips by type
    const chipsByType = searchChips.reduce((acc, chip) => {
      if (!acc[chip.type]) acc[chip.type] = []
      acc[chip.type].push(chip)
      return acc
    }, {} as Record<string, typeof searchChips>)

    return courses.filter((course) => {
      // For each type: OR logic (any chip of same type can match)
      // Between types: AND logic (all type groups must match)
      return Object.entries(chipsByType).every(([type, chips]) => {
        return chips.some((chip) => {
          const value = chip.value.toLowerCase()
          switch (type) {
            case 'code':
              return (course.class_code || course.course_code)?.toLowerCase().includes(value)
            case 'title':
              return course.title?.toLowerCase().includes(value)
            case 'teacher':
              return course.lecturer_name?.toLowerCase().includes(value)
            case 'area':
              return course.sub_topics?.some((t) => t.toLowerCase().includes(value))
            default:
              return true
          }
        })
      })
    })
  }, [courses, searchChips])

  const columns: ColumnDef<VStudentCourseCatalog>[] = useMemo(
    () => [
      {
        accessorKey: 'class_code',
        header: 'Class Code',
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.class_code || row.getValue('course_code')}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Course Title',
        cell: ({ row }) => (
          <div className="group relative">
            <div className="font-medium">{row.getValue('title')}</div>
            {row.original.sub_topics && row.original.sub_topics.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">
                    {row.original.sub_topics.length} topic{row.original.sub_topics.length > 1 ? 's' : ''}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="flex flex-wrap gap-1">
                    {row.original.sub_topics.map((topic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className={`text-xs ${getTopicColor(topic)}`}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'credits',
        header: 'Credits',
        cell: ({ row }) => (
          <span className="text-center block">{row.getValue('credits')}</span>
        ),
      },
      {
        accessorKey: 'lecturer_name',
        header: 'Lecturer',
        cell: ({ row }) => {
          const name = row.getValue('lecturer_name') as string
          return name ? (
            <button
              className="text-primary hover:underline text-left"
              onClick={(e) => {
                e.stopPropagation()
                onInstructorClick(name)
              }}
            >
              {name}
            </button>
          ) : (
            <span className="text-muted-foreground">TBA</span>
          )
        },
      },
      {
        id: 'enrollment',
        header: 'Enrollment',
        cell: ({ row }) => (
          <span>
            {formatEnrollment(
              row.original.enrolled_count,
              row.original.quota_min,
              row.original.quota_max
            )}
          </span>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredCourses,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="area">Area</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 max-w-md">
            <Input
              placeholder={`Search by ${SEARCH_TYPE_LABELS[searchType]}... (Enter to add)`}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <Select
            value={selectedYear?.toString() || ''}
            onValueChange={(value) => onYearChange(value ? parseInt(value, 10) : null)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedTerm?.toString() || ''}
            onValueChange={(value) => onTermChange(value ? parseInt(value, 10) : null)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              {availableTerms.map((term) => (
                <SelectItem key={term} value={term.toString()}>
                  Term {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {searchChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchChips.map((chip, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`${SEARCH_TYPE_COLORS[chip.type]} cursor-pointer hover:opacity-80`}
                onClick={() => removeChip(index)}
              >
                {SEARCH_TYPE_LABELS[chip.type]}: {chip.value}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
            <button
              onClick={() => setSearchChips([])}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onCourseClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No courses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {table.getFilteredRowModel().rows.length} of {courses.length} courses
      </div>
    </div>
  )
}
