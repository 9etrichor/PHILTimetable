import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageCircle, Calendar, User, ArrowLeft, Send } from 'lucide-react'
import type { TicketWithComments } from '@/types/database'

interface TicketDetailProps {
  ticketId: string
  onBack: () => void
  onAddComment: (ticketId: string, comment: string) => Promise<{ success: boolean; error?: string }>
  onUpdateStatus: (ticketId: string, status: TicketWithComments['status']) => Promise<{ success: boolean; error?: string }>
  fetchTicketWithComments: (ticketId: string) => Promise<TicketWithComments | null>
}

export const TicketDetail = ({ 
  ticketId, 
  onBack, 
  onAddComment, 
  onUpdateStatus, 
  fetchTicketWithComments 
}: TicketDetailProps) => {
  const [ticket, setTicket] = useState<TicketWithComments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    loadTicket()
  }, [ticketId])

  const loadTicket = async () => {
    setLoading(true)
    setError(null)

    try {
      const ticketData = await fetchTicketWithComments(ticketId)
      if (ticketData) {
        setTicket(ticketData)
      } else {
        setError('Ticket not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !ticket) return

    setSubmittingComment(true)
    try {
      const result = await onAddComment(ticket.id, newComment)
      if (result.success) {
        setNewComment('')
        // Reload ticket to get new comment
        await loadTicket()
      } else {
        setError(result.error || 'Failed to add comment')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleStatusUpdate = async (newStatus: TicketWithComments['status']) => {
    if (!ticket || newStatus === ticket.status) return

    setUpdatingStatus(true)
    try {
      const result = await onUpdateStatus(ticket.id, newStatus)
      if (result.success) {
        // Update local ticket state
        setTicket({ ...ticket, status: newStatus })
      } else {
        setError(result.error || 'Failed to update status')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusColor = (status: TicketWithComments['status']) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'closed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: TicketWithComments['type']) => {
    switch (type) {
      case 'bug':
        return 'bg-red-100 text-red-800'
      case 'enhancement':
        return 'bg-purple-100 text-purple-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error || 'Ticket not found'}</p>
          <Button onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Ticket Details</h1>
      </div>

      {/* Ticket Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getTypeColor(ticket.type)}>
                  {ticket.type}
                </Badge>
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            
            {/* Status Update */}
            <div className="flex items-center gap-2">
              <Label htmlFor="status">Status:</Label>
              <Select
                value={ticket.status}
                onValueChange={(value: TicketWithComments['status']) => handleStatusUpdate(value)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created: {formatDate(ticket.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Client ID: {ticket.client_id ? `${ticket.client_id.slice(0, 8)}...` : 'Unknown'}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
            
            {ticket.photo_url && (
              <div className="space-y-2">
                <h3 className="font-medium">Attachment</h3>
                <div className="border rounded-lg overflow-hidden max-w-md">
                  <img
                    src={ticket.photo_url}
                    alt="Ticket attachment"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments ({ticket.comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Existing Comments */}
            {ticket.comments.map((comment) => (
              <div key={comment.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    {comment.user_id ? `${comment.user_id.slice(0, 8)}...` : 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(comment.created_at)}
                  </div>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
              </div>
            ))}
            
            {/* Add Comment */}
            <div className="border rounded-lg p-4 space-y-4">
              <Label htmlFor="comment">Add Comment</Label>
              <textarea
                id="comment"
                className="w-full min-h-[100px] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border border-input rounded-md"
                placeholder="Type your comment here..."
                value={newComment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                disabled={submittingComment}
                rows={4}
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || submittingComment}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {submittingComment ? 'Sending...' : 'Send Comment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
