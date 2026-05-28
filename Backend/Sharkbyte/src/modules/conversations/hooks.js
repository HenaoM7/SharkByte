import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { conversationsApi } from './api'
import api from '../../shared/api/client'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function useConversations(tenantId, status) {
  return useQuery({
    queryKey: ['conversations', tenantId, status],
    queryFn: () => conversationsApi.getConversations(tenantId, status ? { status } : {}),
    enabled: !!tenantId,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    select: (res) => res.data,
  })
}

export function useMessages(conversationId, tenantId) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationsApi.getMessages(conversationId, { limit: 30, tenantId }),
    enabled: !!conversationId && !!tenantId,
    select: (res) => res.data,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })
}

export function useUpdateConversationStatus(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => conversationsApi.updateStatus(id, status, tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations', tenantId] }),
  })
}

export function useUpdateConversationCategory(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, category }) => conversationsApi.updateCategory(id, category, tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations', tenantId] }),
  })
}

export function useSSEStream(tenantId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tenantId) return

    let source
    let retryTimeout
    let retryCount = 0
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      const url = `${API_BASE}/api/v1/conversations/stream?tenantId=${encodeURIComponent(tenantId)}`
      source = new EventSource(url, { withCredentials: true })

      // Reset counter on successful connection (not only on message)
      source.onopen = () => {
        retryCount = 0
      }

      source.onmessage = (e) => {
        retryCount = 0
        try {
          const data = JSON.parse(e.data)
          queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] })
          if (data.conversationId) {
            queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] })
          }
        } catch {}
      }

      source.onerror = () => {
        source.close()
        if (cancelled) return
        retryCount++
        // Exponential backoff: 2s, 4s, 8s … capped at 30s
        const delay = Math.min(2000 * retryCount, 30000)
        // Refresh the access_token cookie before reconnecting (handles expired 15-min token)
        api.post('/auth/refresh').then(() => {
          if (!cancelled) retryTimeout = setTimeout(connect, delay)
        }).catch(() => {
          // Refresh failed — retry anyway after delay (backend may be temporarily down)
          if (!cancelled) retryTimeout = setTimeout(connect, delay)
        })
      }
    }

    connect()

    return () => {
      cancelled = true
      source?.close()
      clearTimeout(retryTimeout)
    }
  }, [tenantId, queryClient])
}
