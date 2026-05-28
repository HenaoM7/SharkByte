import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from './api'

const WHATSAPP_KEYS = {
  status: (id) => ['whatsapp', id, 'status'],
  qr:     (id) => ['whatsapp', id, 'qr'],
}

export const useWhatsAppStatus = (tenantId, enabled = true) =>
  useQuery({
    queryKey: WHATSAPP_KEYS.status(tenantId),
    queryFn: () => whatsappApi.getStatus(tenantId),
    enabled: !!tenantId && enabled,
    staleTime: 4_000,
    retry: false,               // No reintentar en errores — evita cascade de 429
    refetchOnWindowFocus: false, // El polling activo es suficiente
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || status === 'not_created') return false
      if (status === 'open') return 30_000   // Detectar desconexiones cada 30s
      return 8_000                            // Polling mientras conecta/reconecta
    },
  })

export const useWhatsAppQR = (tenantId, enabled = false) =>
  useQuery({
    queryKey: WHATSAPP_KEYS.qr(tenantId),
    queryFn: () => whatsappApi.getQR(tenantId),
    enabled: !!tenantId && enabled,
    staleTime: 0,
    retry: 3,
    retryDelay: 2000,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === 'open') return false   // Connected — stop polling
      if (data?.qr) return 20000                  // Have QR — refresh every 20s (expires in 60s)
      return 3000                                 // No QR yet — poll fast every 3s
    },
  })

export const useConnectWhatsApp = (tenantId) => {
  return useMutation({
    mutationFn: () => whatsappApi.connect(tenantId),
    // No invalidateQueries — el polling activo en useWhatsAppStatus se encarga
    // de detectar el cambio de estado sin generar un burst de requests
  })
}

export const useDisconnectWhatsApp = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => whatsappApi.disconnect(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.status(tenantId) })
      qc.invalidateQueries({ queryKey: ['tenants', tenantId] })
    },
  })
}

export const useDeleteWhatsAppInstance = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => whatsappApi.deleteInstance(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WHATSAPP_KEYS.status(tenantId) })
      qc.invalidateQueries({ queryKey: ['tenants', tenantId] })
    },
  })
}
