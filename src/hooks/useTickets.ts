import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Ticket, TicketWithComments, TicketFormData } from '@/types/database'

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setTickets(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTicketWithComments = useCallback(async (ticketId: string): Promise<TicketWithComments | null> => {
    try {
      // Fetch ticket details
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', ticketId)
        .single()

      if (ticketError) throw ticketError

      // Fetch comments for this ticket
      const { data: comments, error: commentsError } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      return {
        ...ticket,
        comments: comments || []
      }
    } catch (err) {
      console.error('Failed to fetch ticket with comments:', err)
      return null
    }
  }, [])

  const createTicket = useCallback(async (formData: TicketFormData): Promise<{ success: boolean; error?: string; ticketId?: string }> => {
    try {
      let photoUrl: string | undefined

      // Upload photo if provided
      if (formData.photo) {
        const fileExt = formData.photo.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `attachments/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, formData.photo)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(filePath)

        photoUrl = publicUrl
      }

      // Create ticket
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: formData.title,
          description: formData.description,
          type: formData.type,
          photo_url: photoUrl
        })
        .select('id')
        .single()

      if (error) throw error

      // Refresh tickets list
      await fetchTickets()

      return { success: true, ticketId: data.id }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create ticket'
      }
    }
  }, [fetchTickets])

  const addComment = useCallback(async (ticketId: string, comment: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('ticket_comments')
        .insert({
          ticket_id: ticketId,
          comment: comment
        })

      if (error) throw error

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to add comment'
      }
    }
  }, [])

  const updateTicketStatus = useCallback(async (ticketId: string, status: Ticket['status']): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', ticketId)

      if (error) throw error

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status } : ticket
      ))

      return { success: true }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update ticket status'
      }
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    fetchTicketWithComments,
    createTicket,
    addComment,
    updateTicketStatus
  }
}
