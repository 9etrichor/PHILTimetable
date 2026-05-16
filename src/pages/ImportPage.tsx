import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EvaluationImportPage } from './EvaluationImportPage'
import { ImportCoursesPage } from './ImportCoursesPage'

export function ImportPage() {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'courses'>('evaluation')

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="text-muted-foreground">Import course data or evaluation marks</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border rounded-lg p-1 mb-6">
        <div className="flex space-x-1">
          <Button
            variant={activeTab === 'evaluation' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('evaluation')}
            className="flex-1"
          >
            Course Evaluation Import
          </Button>
          <Button
            variant={activeTab === 'courses' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('courses')}
            className="flex-1"
          >
            Course Data Import
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'evaluation' && <EvaluationImportPage />}
        {activeTab === 'courses' && <ImportCoursesPage />}
      </div>
    </div>
  )
}
