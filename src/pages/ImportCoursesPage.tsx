import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Loader2
} from 'lucide-react'
import { useImportLogic } from '@/hooks/useImportLogic'
import type { ColumnMapping, InstructorBuffer } from '@/hooks/useImportLogic'
import { saveMappingToStorage, loadMappingFromStorage } from '@/utils/mappingStorage'
import ExcelJS from 'exceljs'

export function ImportCoursesPage() {
  const {
    rawData,
    excelHeaders,
    importBuffer,
    loading,
    loadingMessage,
    progress,
    currentStep,
    parseExcelFile,
    applyColumnMapping,
    processExcelData,
    createInstructors,
    createCourses,
    createSections,
    createClasses,
    getStats,
    reset
  } = useImportLogic()

  const [file, setFile] = useState<File | null>(null)
  const [tempMapping, setTempMapping] = useState<ColumnMapping>({
    classCode: '',
    title: '',
    instructor: '',
    year: '',
    term: '',
    quota: '',
    enrollment: ''
  })
  const [editingCell, setEditingCell] = useState<{ name: string; field: keyof InstructorBuffer } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isApplyingMapping, setIsApplyingMapping] = useState(false)

  useEffect(() => {
    const savedMapping = loadMappingFromStorage()
    if (savedMapping && excelHeaders.length > 0) {
      const validMapping: ColumnMapping = {
        classCode: excelHeaders.includes(savedMapping.classCode) ? savedMapping.classCode : '',
        title: excelHeaders.includes(savedMapping.title) ? savedMapping.title : '',
        instructor: excelHeaders.includes(savedMapping.instructor) ? savedMapping.instructor : '',
        year: excelHeaders.includes(savedMapping.year) ? savedMapping.year : '',
        term: excelHeaders.includes(savedMapping.term) ? savedMapping.term : '',
        quota: excelHeaders.includes(savedMapping.quota) ? savedMapping.quota : '',
        enrollment: excelHeaders.includes(savedMapping.enrollment) ? savedMapping.enrollment : ''
      }
      setTempMapping(validMapping)
    }
  }, [excelHeaders])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    try {
      await parseExcelFile(uploadedFile)
    } catch (error) {
      console.error('File processing error:', error)
      alert('Failed to process file')
    }
  }, [parseExcelFile])

  const handleApplyMapping = useCallback(async () => {
    if (!tempMapping.classCode || !tempMapping.title || !tempMapping.instructor) {
      alert('Please map the required fields: Class Code, Title, and Instructor')
      return
    }
    if (isApplyingMapping) return
    
    setIsApplyingMapping(true)
    try {
      saveMappingToStorage(tempMapping)
      applyColumnMapping(tempMapping)
      await processExcelData()
    } finally {
      setIsApplyingMapping(false)
    }
  }, [tempMapping, applyColumnMapping, processExcelData, isApplyingMapping])

  const handleDownloadTemplate = useCallback(async () => {
    const template = [
      {
        CLASS_CODE: 'UGEA2100A',
        TITLE: 'Introduction to Philosophy',
        CREDITS: 3,
        INSTRUCTOR_NAME: 'Dr. John Smith',
        INSTRUCTOR_EMAIL: 'john.smith@example.com',
        YEAR: 2024,
        TERM: 1,
        ENROLLED_COUNT: 35,
        QUOTA_MIN: 20,
        QUOTA_MAX: 50,
      }
    ]

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Template')
    
    // Add headers
    worksheet.columns = [
      { header: 'CLASS_CODE', key: 'CLASS_CODE', width: 15 },
      { header: 'TITLE', key: 'TITLE', width: 30 },
      { header: 'INSTRUCTOR', key: 'INSTRUCTOR', width: 20 },
      { header: 'YEAR', key: 'YEAR', width: 10 },
      { header: 'TERM', key: 'TERM', width: 10 },
      { header: 'ENROLLED_COUNT', key: 'ENROLLED_COUNT', width: 15 },
      { header: 'QUOTA_MIN', key: 'QUOTA_MIN', width: 10 },
      { header: 'QUOTA_MAX', key: 'QUOTA_MAX', width: 10 }
    ]
    
    // Add data
    worksheet.addRows(template)
    
    // Style the header row
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    }
    
    // Generate and download the file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'course_import_template.xlsx'
    a.click()
    window.URL.revokeObjectURL(url)
  }, [])

  
  // Removed handleValidate as it's no longer needed

  const handleCellClick = useCallback((instructorName: string, field: keyof InstructorBuffer, currentValue: string) => {
    setEditingCell({ name: instructorName, field })
    setEditValue(currentValue)
  }, [])

  const handleCellBlur = useCallback(() => {
    if (editingCell && editValue !== undefined) {
      importBuffer.forEach((row, idx) => {
        if (row.instructor.name === editingCell.name) {
          const updatedInstructor = { ...row.instructor, [editingCell.field]: editValue }
          const updatedRow = { ...row, instructor: updatedInstructor }
          importBuffer[idx] = updatedRow
        }
      })
    }
    setEditingCell(null)
    setEditValue('')
  }, [editingCell, editValue, importBuffer])

  const handleHeaderDoubleClick = useCallback((field: keyof InstructorBuffer) => {
    const value = prompt(`Enter default value for ${field}:`)
    if (value !== null) {
      importBuffer.forEach((row, idx) => {
        const updatedInstructor = { ...row.instructor, [field]: value }
        importBuffer[idx] = { ...row, instructor: updatedInstructor }
      })
    }
  }, [importBuffer])

  const handleCreateInstructors = useCallback(async () => {
    const result = await createInstructors()
    if (result.success) {
      alert(result.message)
    } else {
      alert(`Failed: ${result.message}`)
    }
  }, [createInstructors])

  const handleCreateCourses = useCallback(async () => {
    const result = await createCourses()
    if (result.success) {
      alert(result.message)
    } else {
      alert(`Failed: ${result.message}`)
    }
  }, [createCourses])

  const handleCreateSections = useCallback(async () => {
    const result = await createSections()
    if (result.success) {
      alert(result.message)
    } else {
      alert(`Failed: ${result.message}`)
    }
  }, [createSections])

  const handleCreateClasses = useCallback(async () => {
    if (!window.confirm(`Create ${importBuffer.length} class assignments?`)) return
    
    const result = await createClasses()
    if (result.success) {
      alert(result.message)
      reset()
      setFile(null)
    } else {
      alert(`Failed: ${result.message}`)
    }
  }, [importBuffer.length, createClasses, reset])

  const stats = getStats()

  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Course Import</h1>
        <p className="text-muted-foreground mt-2">
          Multi-step wizard for importing course data with inline editing
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { key: 'upload', label: 'Upload File' },
          { key: 'mapping', label: 'Map Columns' },
          { key: 'instructors', label: 'Add Instructors' },
          { key: 'courses', label: 'Add Courses' },
          { key: 'sections', label: 'Create Sections' },
          { key: 'classes', label: 'Assign Classes' },
          { key: 'complete', label: 'Complete' }
        ].map((step, idx) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 whitespace-nowrap ${
              currentStep === step.key ? 'text-primary font-semibold' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${
                currentStep === step.key 
                  ? 'border-primary bg-primary text-white' 
                  : 'border-gray-300'
              }`}>
                {idx + 1}
              </div>
              <span className="text-sm">{step.label}</span>
            </div>
            {idx < 6 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Excel File</CardTitle>
            <CardDescription>
              Upload your course data file. System will automatically parse and validate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="file-upload" className="cursor-pointer flex-1">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to select file or drag and drop
                      </p>
                    </div>
                  )}
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>

              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingMessage || 'Processing...'}
                </div>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 'mapping' && excelHeaders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Map Excel Columns</CardTitle>
            <CardDescription>
              Map your Excel columns to the required fields. Your data has: {excelHeaders.join(', ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class Code Column *</Label>
                <Select value={tempMapping.classCode || undefined} onValueChange={(v) => setTempMapping({...tempMapping, classCode: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Course Title Column *</Label>
                <Select value={tempMapping.title || undefined} onValueChange={(v) => setTempMapping({...tempMapping, title: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Instructor Column *</Label>
                <Select value={tempMapping.instructor || undefined} onValueChange={(v) => setTempMapping({...tempMapping, instructor: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Year Column</Label>
                <Select value={tempMapping.year || undefined} onValueChange={(v) => setTempMapping({...tempMapping, year: v || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (use current year)" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Term Column</Label>
                <Select value={tempMapping.term || undefined} onValueChange={(v) => setTempMapping({...tempMapping, term: v || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (use term 1)" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quota Column</Label>
                <Select value={tempMapping.quota || undefined} onValueChange={(v) => setTempMapping({...tempMapping, quota: v || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Enrollment Column</Label>
                <Select value={tempMapping.enrollment || undefined} onValueChange={(v) => setTempMapping({...tempMapping, enrollment: v || ''})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {excelHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Preview of first row:</p>
                <div className="mt-2 text-sm space-y-1">
                  {rawData.length > 0 && Object.entries(rawData[0]).slice(0, 5).map(([key, value]) => (
                    <div key={key}><strong>{key}:</strong> {String(value)}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button 
                onClick={handleApplyMapping}
                disabled={!tempMapping.classCode || !tempMapping.title || !tempMapping.instructor || isApplyingMapping}
              >
                {isApplyingMapping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Apply Mapping & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'instructors' && importBuffer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Add New Instructors</CardTitle>
            <CardDescription>
              {stats.newInstructors} new instructors need to be added to the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingMessage}
                </div>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.newInstructors}</div>
                <div className="text-sm text-muted-foreground">New Instructors</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.existingInstructors}</div>
                <div className="text-sm text-muted-foreground">Already Exist</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Instructor Name</th>
                      <th 
                        className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100" 
                        onDoubleClick={() => handleHeaderDoubleClick('email')}
                        title="Double-click to set default for all"
                      >
                        Email
                      </th>
                      <th 
                        className="px-4 py-3 text-left font-medium cursor-pointer hover:bg-gray-100" 
                        onDoubleClick={() => handleHeaderDoubleClick('nature')}
                        title="Double-click to set default for all"
                      >
                        Nature
                      </th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Map(importBuffer.map(r => [r.instructor.name, r.instructor])).values()).map((instructor, idx) => (
                      <tr key={idx} className={instructor.exists ? 'bg-green-50' : 'bg-yellow-50'}>
                        <td className="px-4 py-3 font-medium">{instructor.name}</td>
                        <td 
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50" 
                          onClick={() => handleCellClick(instructor.name, 'email', instructor.email)}
                        >
                          {editingCell?.name === instructor.name && editingCell?.field === 'email' ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellBlur}
                              autoFocus
                              className="h-7 text-sm"
                            />
                          ) : (
                            instructor.email || 'Auto-generated'
                          )}
                        </td>
                        <td 
                          className="px-4 py-3 cursor-pointer hover:bg-blue-50" 
                          onClick={() => handleCellClick(instructor.name, 'nature', instructor.nature)}
                        >
                          {editingCell?.name === instructor.name && editingCell?.field === 'nature' ? (
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellBlur}
                              autoFocus
                              className="h-7 text-sm"
                            />
                          ) : (
                            instructor.nature
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {instructor.exists ? (
                            <Badge className="bg-green-500">Exists</Badge>
                          ) : (
                            <Badge className="bg-yellow-500">Will Create</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleCreateInstructors} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {stats.newInstructors === 0 ? 'Skip - No New Instructors' : `Create ${stats.newInstructors} Instructors`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'courses' && importBuffer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Add New Courses</CardTitle>
            <CardDescription>
              {stats.newCourses} new courses need to be added to the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingMessage}
                </div>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.newCourses}</div>
                <div className="text-sm text-muted-foreground">New Courses</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.existingCourses}</div>
                <div className="text-sm text-muted-foreground">Already Exist</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Course Code</th>
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium">Credits</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(new Map(importBuffer.map(r => [r.course.course_code, r.course])).values()).map((course, idx) => (
                      <tr key={idx} className={course.exists ? 'bg-green-50' : 'bg-yellow-50'}>
                        <td className="px-4 py-3 font-mono font-medium">{course.course_code}</td>
                        <td className="px-4 py-3">{course.title}</td>
                        <td className="px-4 py-3">{course.credits}</td>
                        <td className="px-4 py-3">
                          {course.exists ? (
                            <Badge className="bg-green-500">Exists</Badge>
                          ) : (
                            <Badge className="bg-yellow-500">Will Create</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleCreateCourses} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {stats.newCourses === 0 ? 'Skip - No New Courses' : `Create ${stats.newCourses} Courses`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'sections' && importBuffer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Create Sections</CardTitle>
            <CardDescription>
              Create {importBuffer.length} section records with year/term/quota information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingMessage}
                </div>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importBuffer.length}</div>
                <div className="text-sm text-muted-foreground">Sections to Create</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Course Code</th>
                      <th className="px-4 py-3 text-left font-medium">Year</th>
                      <th className="px-4 py-3 text-left font-medium">Term</th>
                      <th className="px-4 py-3 text-left font-medium">Quota Min</th>
                      <th className="px-4 py-3 text-left font-medium">Quota Max</th>
                      <th className="px-4 py-3 text-left font-medium">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importBuffer.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3 font-mono">{row.parsedCode.base}</td>
                        <td className="px-4 py-3">{row.section.year}</td>
                        <td className="px-4 py-3">{row.section.term}</td>
                        <td className="px-4 py-3">{row.section.quota_min}</td>
                        <td className="px-4 py-3">{row.section.quota_max}</td>
                        <td className="px-4 py-3">{row.section.enrolled_count}</td>
                      </tr>
                    ))}
                    {importBuffer.length > 10 && (
                      <tr className="border-t bg-gray-50">
                        <td colSpan={6} className="px-4 py-3 text-center text-muted-foreground">
                          ... and {importBuffer.length - 10} more sections
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>


            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleCreateSections} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create {importBuffer.length} Sections
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'classes' && importBuffer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 6: Assign Instructors to Classes</CardTitle>
            <CardDescription>
              Final step: Create {importBuffer.length} class assignments linking sections to instructors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingMessage}
                </div>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{importBuffer.length}</div>
                <div className="text-sm text-muted-foreground">Class Assignments</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Array.from(new Set(importBuffer.map(r => r.instructor.name))).length}
                </div>
                <div className="text-sm text-muted-foreground">Unique Instructors</div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">Course Code</th>
                      <th className="px-4 py-3 text-left font-medium">Section</th>
                      <th className="px-4 py-3 text-left font-medium">Instructor</th>
                      <th className="px-4 py-3 text-left font-medium">Year-Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importBuffer.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-3">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono">{row.parsedCode.base}</td>
                        <td className="px-4 py-3">{row.parsedCode.section}</td>
                        <td className="px-4 py-3">{row.instructor.name}</td>
                        <td className="px-4 py-3">{row.section.year}-{row.section.term}</td>
                      </tr>
                    ))}
                    {importBuffer.length > 10 && (
                      <tr className="border-t bg-gray-50">
                        <td colSpan={5} className="px-4 py-3 text-center text-muted-foreground">
                          ... and {importBuffer.length - 10} more class assignments
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <p className="font-medium text-yellow-800">⚠️ Final Step - Cannot be undone easily</p>
                <ul className="mt-2 text-sm space-y-1 list-disc list-inside text-yellow-700">
                  <li>Create {importBuffer.length} class records</li>
                  <li>Link each section to its assigned instructor</li>
                  <li>Complete the entire import process</li>
                  <li>This operation is permanent</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button onClick={handleCreateClasses} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Complete Import - Create {importBuffer.length} Classes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'complete' && (
        <Alert className="border-green-500">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Import completed successfully!</p>
            <Button className="mt-2" onClick={reset}>
              Import Another File
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
