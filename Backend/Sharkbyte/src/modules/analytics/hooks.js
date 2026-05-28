import { useQuery, useMutation } from '@tanstack/react-query'
import { analyticsApi } from './api'

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    staleTime: 2 * 60 * 1000,
  })
}

export function useMessageVolume(months) {
  return useQuery({
    queryKey: ['analytics', 'message-volume', months],
    queryFn: () => analyticsApi.getMessageVolume(months),
  })
}

export function useTenantGrowth(months) {
  return useQuery({
    queryKey: ['analytics', 'tenant-growth', months],
    queryFn: () => analyticsApi.getTenantGrowth(months),
  })
}

export function usePlanConversion() {
  return useQuery({
    queryKey: ['analytics', 'plan-conversion'],
    queryFn: analyticsApi.getPlanConversion,
  })
}

export function useTopTenants(limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'top-tenants', limit],
    queryFn: () => analyticsApi.getTopTenants(limit),
  })
}

export function useExportCsv() {
  return useMutation({
    mutationFn: analyticsApi.exportCsv,
    onSuccess: (blob, months) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sharkbyte-analytics-' + months + 'm.csv'
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

export function useCaptureSnapshot() {
  return useMutation({
    mutationFn: analyticsApi.captureSnapshot,
  })
}