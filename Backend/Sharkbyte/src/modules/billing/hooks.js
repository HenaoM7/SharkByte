import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from './api'

export function useSubscription(tenantId) {
  return useQuery({
    queryKey: ['billing', 'subscription', tenantId],
    queryFn: () => billingApi.getSubscription(tenantId),
    enabled: !!tenantId,
  })
}

export function useInvoices(tenantId) {
  return useQuery({
    queryKey: ['billing', 'invoices', tenantId],
    queryFn: () => billingApi.getInvoices(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: billingApi.createCheckout,
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
    },
  })
}

export function useCancelSubscription(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: billingApi.cancelSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'subscription', tenantId] })
    },
  })
}

export function usePauseSubscription(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: billingApi.pauseSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'subscription', tenantId] })
    },
  })
}

export function useResumeSubscription(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: billingApi.resumeSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing', 'subscription', tenantId] })
    },
  })
}

export function useAdminActivate(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: billingApi.adminActivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants', tenantId] })
      qc.invalidateQueries({ queryKey: ['tenants'] })
      qc.invalidateQueries({ queryKey: ['billing', 'subscription', tenantId] })
    },
  })
}
