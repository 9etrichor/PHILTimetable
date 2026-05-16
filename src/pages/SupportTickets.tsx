import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, Plus, HelpCircle } from 'lucide-react'
import { useTickets } from '@/hooks/useTickets'
import { TicketSubmissionForm } from '@/components/support/TicketSubmissionForm'
import { TicketList } from '@/components/support/TicketList'
import { TicketDetail } from '@/components/support/TicketDetail'
import type { Ticket, TicketWithComments } from '@/types/database'

type ViewMode = 'submit' | 'list' | 'detail'

export default function SupportTickets() {
  const [viewMode, setViewMode] = useState<ViewMode>('submit')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    tickets,
    loading,
    error: ticketsError,
    createTicket,
    addComment,
    updateTicketStatus,
    fetchTicketWithComments
  } = useTickets()

  const handleCreateTicket = async (formData: import('@/types/database').TicketFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      const result = await createTicket(formData)
      if (!result.success) {
        setError(result.error || 'Failed to create ticket')
      } else {
        // Switch to list view to show the new ticket
        setViewMode('list')
      }
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create ticket' }
    } finally {
      setSubmitting(false)
    }
  }

  const handleTicketClick = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setViewMode('detail')
  }

  const handleBackToList = () => {
    setSelectedTicket(null)
    setViewMode('list')
  }

  const handleAddComment = async (ticketId: string, comment: string) => {
    return await addComment(ticketId, comment)
  }

  const handleUpdateStatus = async (ticketId: string, status: Ticket['status']) => {
    return await updateTicketStatus(ticketId, status)
  }

  const handleFetchTicketDetail = async (ticketId: string): Promise<TicketWithComments | null> => {
    return await fetchTicketWithComments(ticketId)
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <HelpCircle className="h-8 w-8" />
          Client Support & Feedback
        </h1>
        <p className="text-gray-600">
          Submit bug reports, request enhancements, and track support tickets
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {viewMode !== 'detail' && (
        <div className="flex gap-4 justify-center">
          <Button
            variant={viewMode === 'submit' ? 'default' : 'outline'}
            onClick={() => setViewMode('submit')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Submit Ticket
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            View Tickets ({tickets.length})
          </Button>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'detail' && selectedTicket ? (
        <TicketDetail
          ticketId={selectedTicket.id}
          onBack={handleBackToList}
          onAddComment={handleAddComment}
          onUpdateStatus={handleUpdateStatus}
          fetchTicketWithComments={handleFetchTicketDetail}
        />
      ) : viewMode === 'submit' ? (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Submit a Support Ticket</h2>
            <p className="text-gray-600">
              We're here to help! Report bugs or request enhancements.
            </p>
          </div>
          <TicketSubmissionForm onSubmit={handleCreateTicket} loading={submitting} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">Your Tickets</h2>
            <p className="text-gray-600">
              Track the status of your submitted tickets and communicate with the support team.
            </p>
          </div>
          
          {ticketsError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="text-center pt-6">
                <p className="text-red-700 mb-2">{ticketsError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <TicketList
              tickets={tickets}
              loading={loading}
              onTicketClick={handleTicketClick}
            />
          )}
        </div>
      )}
    </div>
  )
}
