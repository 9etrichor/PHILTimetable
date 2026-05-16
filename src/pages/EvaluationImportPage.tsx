import { useState, useCallback, useEffect } from 'react'
import { useEvaluationImportLogic } from '@/hooks/useEvaluationImportLogic'
import type { EvalColumnMapping } from '@/hooks/useEvaluationImportLogic'
import { saveEvalMappingToStorage, loadEvalMappingFromStorage } from '@/utils/evalMappingStorage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
} from 'lucide-react'

export function EvaluationImportPage() {
  const logic = useEvaluationImportLogic()
  const [file, setFile] = useState<File | null>(null)
  const [tempMapping, setTempMapping] = useState<EvalColumnMapping>({
    classCode: '',
    instructor: '',
    responseRate: '',
    courseMark: '',
    teacherMark: '',
  })
  const [yearInput, setYearInput] = useState('')
  const [termInput, setTermInput] = useState('')
  const [isApplyingMapping, setIsApplyingMapping] = useState(false)

  // Fetch suggested year/terms on mount
  useEffect(() => {
    logic.fetchSuggestedYearTerms()
  }, [])

  // Load saved mapping template when headers are available
  useEffect(() => {
    const saved = loadEvalMappingFromStorage()
    if (saved && logic.excelHeaders.length > 0) {
      const validMapping: EvalColumnMapping = {
        classCode: logic.excelHeaders.includes(saved.classCode) ? saved.classCode : '',
        instructor: logic.excelHeaders.includes(saved.instructor) ? saved.instructor : '',
        responseRate: logic.excelHeaders.includes(saved.responseRate) ? saved.responseRate : '',
        courseMark: logic.excelHeaders.includes(saved.courseMark) ? saved.courseMark : '',
        teacherMark: logic.excelHeaders.includes(saved.teacherMark) ? saved.teacherMark : '',
      }
      setTempMapping(validMapping)
    }
  }, [logic.excelHeaders])

  // Validate year/term when inputs change
  useEffect(() => {
    const year = parseInt(yearInput)
    const term = parseInt(termInput)
    if (!isNaN(year) && !isNaN(term) && term >= 1 && term <= 3) {
      logic.setSelectedYear(year)
      logic.setSelectedTerm(term)
      logic.validateYearTerm(year, term).then(warning => {
        logic.setYearTermWarning(warning)
      })
    } else {
      logic.setSelectedYear(null)
      logic.setSelectedTerm(null)
      logic.setYearTermWarning('')
    }
  }, [yearInput, termInput])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    try {
      await logic.parseExcelFile(uploadedFile)
    } catch (error) {
      console.error('File processing error:', error)
      alert('Failed to process file')
    }
  }, [logic.parseExcelFile])

  const handleApplyMapping = useCallback(async () => {
    if (!tempMapping.classCode) {
      alert('Please map the required field: Class Code')
      return
    }
    if (!logic.selectedYear || !logic.selectedTerm) {
      alert('Please enter a valid year and term')
      return
    }
    if (isApplyingMapping) return

    setIsApplyingMapping(true)
    try {
      saveEvalMappingToStorage(tempMapping)
      logic.applyColumnMapping(tempMapping)
      await logic.processExcelData()
    } finally {
      setIsApplyingMapping(false)
    }
  }, [tempMapping, logic.applyColumnMapping, logic.processExcelData, isApplyingMapping, logic.selectedYear, logic.selectedTerm])

  const handleSaveTemplate = useCallback(() => {
    saveEvalMappingToStorage(tempMapping)
    alert('Mapping template saved!')
  }, [tempMapping])

  const handleUpdateMarks = useCallback(async () => {
    const stats = logic.getStats()
    if (!window.confirm(`Update ${stats.valid} evaluation records?`)) return

    const result = await logic.updateEvaluationMarks()
    if (result.success) {
      alert(result.message)
    } else {
      alert(`Failed: ${result.message}`)
    }
  }, [logic.updateEvaluationMarks, logic.getStats])

  const handleReset = useCallback(() => {
    logic.reset()
    setFile(null)
    setYearInput('')
    setTermInput('')
  }, [logic.reset])

  const stats = logic.getStats()

  const STEPS = [
    { key: 'upload', label: 'Upload File' },
    { key: 'mapping', label: 'Map Columns' },
    { key: 'preview', label: 'Preview & Validate' },
    { key: 'update', label: 'Update Marks' },
    { key: 'complete', label: 'Complete' },
  ]

  return (
    <div className="space-y-6">
      {/* Step Progress Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 whitespace-nowrap ${
              logic.currentStep === step.key ? 'text-primary font-semibold' : 'text-muted-foreground'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-sm ${
                logic.currentStep === step.key
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-300'
              }`}>
                {idx + 1}
              </div>
              <span className="text-sm">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {logic.currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Excel File</CardTitle>
            <CardDescription>
              Upload your CTE evaluation data file. Select the academic year and term for this import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="eval-file-upload" className="cursor-pointer flex-1">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      <span className="font-medium">{file.name}</span>
                      <Badge variant="secondary">{logic.rawData.length} rows</Badge>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Click to upload Excel file (.xlsx)</p>
                    </div>
                  )}
                </div>
                <input
                  id="eval-file-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </Label>
            </div>

            {/* Year / Term Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year-input">Academic Year</Label>
                <Input
                  id="year-input"
                  type="number"
                  placeholder="e.g. 2025"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  min={2000}
                  max={2099}
                />
              </div>
              <div>
                <Label htmlFor="term-input">Term (1-3)</Label>
                <Input
                  id="term-input"
                  type="number"
                  placeholder="e.g. 2"
                  value={termInput}
                  onChange={(e) => setTermInput(e.target.value)}
                  min={1}
                  max={3}
                />
              </div>
            </div>

            {/* Year/Term Warning */}
            {logic.yearTermWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{logic.yearTermWarning}</AlertDescription>
              </Alert>
            )}

            {/* Suggested Year/Terms from DB */}
            {logic.suggestedYearTerms.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Suggested (from database):</Label>
                <div className="flex flex-wrap gap-2">
                  {logic.suggestedYearTerms.map(yt => (
                    <Button
                      key={`${yt.year}-${yt.term}`}
                      variant={!yt.hasEvaluations ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setYearInput(String(yt.year))
                        setTermInput(String(yt.term))
                      }}
                    >
                      {yt.year} T{yt.term}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {yt.classCount} classes
                      </Badge>
                      {!yt.hasEvaluations && (
                        <Badge variant="destructive" className="ml-1 text-xs">No marks</Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {logic.excelHeaders.length > 0 && logic.selectedYear && logic.selectedTerm && !logic.yearTermWarning && (
              <Button onClick={() => logic.setCurrentStep('mapping')} className="w-full">
                Next: Map Columns
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {logic.currentStep === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Map Columns</CardTitle>
            <CardDescription>
              Map Excel columns to evaluation fields. Only Class Code is required.
              Year {logic.selectedYear} Term {logic.selectedTerm}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'classCode', label: 'Class Code *', required: true },
                { key: 'instructor', label: 'Instructor Name' },
                { key: 'responseRate', label: 'Response Rate' },
                { key: 'courseMark', label: 'Course Mark' },
                { key: 'teacherMark', label: 'Teacher Mark' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label className="mb-1">{label}</Label>
                  <Select
                    value={tempMapping[key as keyof EvalColumnMapping]}
                    onValueChange={(v) =>
                      setTempMapping(prev => ({ ...prev, [key]: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      {logic.excelHeaders.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveTemplate} variant="outline" size="sm">
                <Save className="h-4 w-4 mr-1" /> Save Template
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => logic.setCurrentStep('upload')}>
                Back
              </Button>
              <Button
                onClick={handleApplyMapping}
                className="flex-1"
                disabled={isApplyingMapping || !tempMapping.classCode}
              >
                {isApplyingMapping ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  'Process & Preview'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview & Validate */}
      {logic.currentStep === 'preview' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Preview & Validate</CardTitle>
            <CardDescription>
              Review matched data. Hover over Invalid badges to see why.
              Year {logic.selectedYear} Term {logic.selectedTerm} — {stats.total} records
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {logic.loading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{logic.loadingMessage}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${logic.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Statistics */}
            {logic.importBuffer.length > 0 && !logic.loading && (
              <div className="grid grid-cols-5 gap-4">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Valid</p>
                  <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Invalid</p>
                  <p className="text-2xl font-bold text-red-600">{stats.invalid}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Matched</p>
                  <p className="text-2xl font-bold">{stats.matched}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Teacher Mismatch</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.teacherMismatch}</p>
                </Card>
              </div>
            )}

            {/* Data Table */}
            {logic.importBuffer.length > 0 && !logic.loading && (
              <div className="rounded-lg border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[120px] sticky top-0 bg-muted/50">Class Code</TableHead>
                      <TableHead className="sticky top-0 bg-muted/50">DB Course</TableHead>
                      <TableHead className="w-[140px] sticky top-0 bg-muted/50">Excel Instructor</TableHead>
                      <TableHead className="w-[140px] sticky top-0 bg-muted/50">DB Instructor</TableHead>
                      <TableHead className="w-[100px] text-center sticky top-0 bg-muted/50">Resp. Rate</TableHead>
                      <TableHead className="w-[90px] text-center sticky top-0 bg-muted/50">Course</TableHead>
                      <TableHead className="w-[90px] text-center sticky top-0 bg-muted/50">Teacher</TableHead>
                      <TableHead className="w-[100px] sticky top-0 bg-muted/50">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logic.importBuffer.map((row, idx) => (
                      <TableRow key={idx} className={!row.isValid ? 'bg-red-50/50' : row.validationWarnings.length > 0 ? 'bg-amber-50/50' : ''}>
                        <TableCell className="font-mono text-sm font-medium">
                          {row.originalData.CLASS_CODE}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.matchedClass ? (
                            <span>{row.matchedClass.course_code} — {row.matchedClass.course_title}</span>
                          ) : (
                            <span className="text-red-500 italic">Not found</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{row.originalData.INSTRUCTOR_NAME}</TableCell>
                        <TableCell className="text-sm">
                          {row.matchedClass ? (
                            <span className={row.validationWarnings.length > 0 ? 'text-amber-600 font-medium' : ''}>
                              {row.matchedClass.instructor_name}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {(row.response_rate * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {row.course_mark.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {row.teacher_mark.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {row.isValid ? (
                            row.validationWarnings.length > 0 ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 cursor-help">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Warning
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  {row.validationWarnings.map((w, i) => (
                                    <p key={i} className="text-sm">{w}</p>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
                              </Badge>
                            )
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 cursor-help">
                                  <AlertCircle className="h-3 w-3 mr-1" /> Invalid
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                {row.validationErrors.map((e, i) => (
                                  <p key={i} className="text-sm">{e}</p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => logic.setCurrentStep('mapping')}>
                Back
              </Button>
              {stats.valid > 0 && (
                <Button onClick={() => logic.setCurrentStep('update')} className="flex-1">
                  Next: Confirm Update ({stats.valid} records)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm Update */}
      {logic.currentStep === 'update' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Confirm & Update</CardTitle>
            <CardDescription>
              Review summary and confirm to update evaluation marks in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p><strong>Year:</strong> {logic.selectedYear}</p>
              <p><strong>Term:</strong> {logic.selectedTerm}</p>
              <p><strong>Total Records:</strong> {stats.total}</p>
              <p className="text-green-700"><strong>Valid (will update):</strong> {stats.valid}</p>
              <p className="text-red-600"><strong>Invalid (will skip):</strong> {stats.invalid}</p>
              {stats.teacherMismatch > 0 && (
                <p className="text-amber-600"><strong>Teacher Mismatches:</strong> {stats.teacherMismatch} (will still update)</p>
              )}
            </div>

            {stats.teacherMismatch > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {stats.teacherMismatch} records have teacher name mismatches between Excel and database.
                  These will still be updated since matching is by class code only.
                </AlertDescription>
              </Alert>
            )}

            {logic.loading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{logic.loadingMessage}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${logic.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => logic.setCurrentStep('preview')}>
                Back
              </Button>
              <Button
                onClick={handleUpdateMarks}
                className="flex-1"
                disabled={logic.loading}
              >
                {logic.loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Updating...</>
                ) : (
                  `Update ${stats.valid} Evaluation Records`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Complete */}
      {logic.currentStep === 'complete' && (
        <Card className="border-green-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 text-lg">Import Complete</h3>
                <p className="text-sm text-green-800 mt-1">
                  All evaluation marks have been successfully updated for Year {logic.selectedYear} Term {logic.selectedTerm}.
                </p>
              </div>
            </div>
            <Button onClick={handleReset} variant="outline" className="w-full">
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
