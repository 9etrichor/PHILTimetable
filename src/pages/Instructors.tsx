import { useState, memo } from 'react'
import {
  useAdminInstructors,
  createInstructor,
  updateInstructor,
  deleteInstructor,
} from '@/hooks/useAdminInstructors'
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
import { TablePagination } from '@/components/ui/TablePagination'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Save, Mail, Search } from 'lucide-react'
import type { Instructor } from '@/types/database'

export function Instructors() {
  const { instructors, loading, error, refetch } = useAdminInstructors()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingInstructor, setDeletingInstructor] = useState<Instructor | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [natureFilter, setNatureFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    nature: 'Full-time',
  })

  const filteredInstructors = instructors.filter((inst) => {
    const matchesSearch =
      searchQuery === '' ||
      inst.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.title?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesNature = natureFilter === 'all' || inst.nature === natureFilter

    return matchesSearch && matchesNature
  })

  // Calculate paginated data
  const paginatedInstructors = filteredInstructors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredInstructors.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  const openCreateSheet = () => {
    setEditingInstructor(null)
    setFormData({ name: '', title: '', email: '', nature: 'Full-time' })
    setSheetOpen(true)
  }

  const openEditSheet = (instructor: Instructor) => {
    setEditingInstructor(instructor)
    setFormData({
      name: instructor.name || '',
      title: instructor.title || '',
      email: instructor.email || '',
      nature: instructor.nature || 'Full-time',
    })
    setSheetOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    if (editingInstructor) {
      const { success, error } = await updateInstructor(editingInstructor.id, formData)
      if (success) {
        toast.success('Instructor updated')
        setSheetOpen(false)
        refetch()
      } else {
        toast.error(error || 'Failed to update instructor')
      }
    } else {
      const { success, error } = await createInstructor(formData)
      if (success) {
        toast.success('Instructor created')
        setSheetOpen(false)
        refetch()
      } else {
        toast.error(error || 'Failed to create instructor')
      }
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deletingInstructor) return

    const { success, error } = await deleteInstructor(deletingInstructor.id)
    if (success) {
      toast.success('Instructor deleted')
      refetch()
    } else {
      toast.error(error || 'Failed to delete instructor')
    }

    setDeleteDialogOpen(false)
    setDeletingInstructor(null)
  }

  const getNatureBadge = (nature: string) => {
    switch (nature) {
      case 'Full-time':
        return <Badge className="bg-green-600">Full-time</Badge>
      case 'Part-time':
        return <Badge variant="secondary">Part-time</Badge>
      case 'Visiting':
        return <Badge variant="outline">Visiting</Badge>
      default:
        return <Badge variant="outline">{nature}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Instructors</h1>
          <p className="text-muted-foreground">Manage instructor information</p>
        </div>
        <Button onClick={openCreateSheet}>
          <Plus className="h-4 w-4 mr-2" />
          Add Instructor
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={natureFilter} onValueChange={setNatureFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Nature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Natures</SelectItem>
            <SelectItem value="Full-time">Full-time</SelectItem>
            <SelectItem value="Part-time">Part-time</SelectItem>
            <SelectItem value="Visiting">Visiting</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredInstructors.length} of {instructors.length} instructors
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
      ) : (
        <>
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

          <div className="rounded-lg border">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Nature</TableHead>
                <TableHead className="w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstructors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No instructors found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInstructors.map((instructor) => (
                  <TableRow key={instructor.id}>
                    <TableCell className="font-medium">{instructor.name}</TableCell>
                    <TableCell>{instructor.title || '-'}</TableCell>
                    <TableCell>
                      {instructor.email ? (
                        <a
                          href={`mailto:${instructor.email}`}
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {instructor.email}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getNatureBadge(instructor.nature)}</TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditSheet(instructor)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingInstructor(instructor)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredInstructors.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredInstructors.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        )}
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingInstructor ? 'Edit Instructor' : 'Add Instructor'}
            </SheetTitle>
            <SheetDescription>
              {editingInstructor
                ? 'Update instructor information'
                : 'Create a new instructor record'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-1">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Prof. John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Associate Professor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@cuhk.edu.hk"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nature">Nature</Label>
              <Select
                value={formData.nature}
                onValueChange={(v) => setFormData({ ...formData, nature: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                  <SelectItem value="Visiting">Visiting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : editingInstructor ? 'Update' : 'Create'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instructor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingInstructor?.name}"? This action
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

export const InstructorsPage = memo(Instructors)
