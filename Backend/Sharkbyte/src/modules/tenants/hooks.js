import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantsApi } from './api'

// Centralized query keys — prevents typos and enables precise invalidation
export const TENANT_KEYS = {
  all: ['tenants'],
  list: (params) => ['tenants', 'list', params],
  detail: (id) => ['tenants', id],
  usage: (id) => ['tenants', id, 'usage'],
  businessConfig: (id) => ['tenants', id, 'business-config'],
  sales: (id) => ['tenants', id, 'sales'],
  salesStats: (id) => ['tenants', id, 'sales-stats'],
  googleStatus: (id) => ['tenants', id, 'google-status'],
  references: (id) => ['tenants', id, 'references'],
  channels: (id) => ['tenants', id, 'channels'],
}

export const useTenants = (params = {}) =>
  useQuery({
    queryKey: TENANT_KEYS.list(params),
    queryFn: () => tenantsApi.getAll(params),
  })

export const useTenant = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.detail(tenantId),
    queryFn: () => tenantsApi.getById(tenantId),
    enabled: !!tenantId,
  })

export const useTenantUsage = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.usage(tenantId),
    queryFn: () => tenantsApi.getUsage(tenantId),
    enabled: !!tenantId,
  })

export const useCreateTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.all }),
  })
}

export const useUpdateTenantPlan = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, planName }) => tenantsApi.updatePlan(tenantId, planName),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.all })
      qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) })
      qc.invalidateQueries({ queryKey: ['billing', 'subscription', tenantId] })
    },
  })
}

export const useActivateTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tenantId) => tenantsApi.activate(tenantId),
    onSuccess: (_, tenantId) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.all })
      qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) })
    },
  })
}

export const useDeactivateTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tenantId) => tenantsApi.deactivate(tenantId),
    onSuccess: (_, tenantId) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.all })
      qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) })
    },
  })
}

export const useUpdateTenantStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, status }) => tenantsApi.updateStatus(tenantId, status),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.all })
      qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) })
    },
  })
}

export const useSoftDeleteTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tenantId) => tenantsApi.softDelete(tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.all }),
  })
}

export const useRestoreTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tenantId) => tenantsApi.restore(tenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.all }),
  })
}

export const useUpdateTenantInstance = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, ...data }) => tenantsApi.updateInstance(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) })
    },
  })
}

export const useBusinessConfig = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.businessConfig(tenantId),
    queryFn: () => tenantsApi.getBusinessConfig(tenantId),
    enabled: !!tenantId,
    // 404 is expected when config doesn't exist yet — return null instead of throwing
    retry: (failureCount, error) => error?.response?.status !== 404 && failureCount < 3,
  })

export const useUpsertBusinessConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, data }) => tenantsApi.upsertBusinessConfig(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.businessConfig(tenantId) })
    },
  })
}

export const useHardDeleteTenant = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tenantId) => tenantsApi.hardDelete(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.all })
    },
  })
}

export const useUpdateGoogleCredentials = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, data }) => tenantsApi.updateGoogleCredentials(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.detail(tenantId) })
    },
  })
}

export const useSales = (tenantId, params = {}) =>
  useQuery({
    queryKey: TENANT_KEYS.sales(tenantId),
    queryFn: () => tenantsApi.getSales(tenantId, { limit: 10, ...params }),
    enabled: !!tenantId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

export const useSalesStats = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.salesStats(tenantId),
    queryFn: () => tenantsApi.getSalesStats(tenantId),
    enabled: !!tenantId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

export const useGoogleStatus = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.googleStatus(tenantId),
    queryFn: () => tenantsApi.getGoogleStatus(tenantId),
    enabled: !!tenantId,
    refetchInterval: false,
  })

export const useDisconnectGoogle = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tenantId) => tenantsApi.disconnectGoogle(tenantId),
    onSuccess: (_, tenantId) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.googleStatus(tenantId) })
    },
  })
}

export const useUpdateGoogleConfig = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, data }) => tenantsApi.updateGoogleConfig(tenantId, data),
    onSuccess: (_, { tenantId }) => {
      qc.invalidateQueries({ queryKey: TENANT_KEYS.googleStatus(tenantId) })
    },
  })
}


// ── Referencias ───────────────────────────────────────────────────────────────

export const useReferences = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.references(tenantId),
    queryFn: () => tenantsApi.getReferences(tenantId),
    enabled: !!tenantId,
  })

export const useCreateReference = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => tenantsApi.createReference(tenantId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.references(tenantId) }),
  })
}

export const useUpdateReference = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => tenantsApi.updateReference(tenantId, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.references(tenantId) }),
  })
}

export const useDeleteReference = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => tenantsApi.deleteReference(tenantId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.references(tenantId) }),
  })
}

// ── Canales (Multi-Canal) ──────────────────────────────────────────────────────

export const useChannels = (tenantId) =>
  useQuery({
    queryKey: TENANT_KEYS.channels(tenantId),
    queryFn: () => tenantsApi.getChannels(tenantId),
    enabled: !!tenantId,
    staleTime: 30_000,
  })

export const useUpsertChannel = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => tenantsApi.upsertChannel(tenantId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.channels(tenantId) }),
  })
}

export const useDeleteChannel = (tenantId) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (platform) => tenantsApi.deleteChannel(tenantId, platform),
    onSuccess: () => qc.invalidateQueries({ queryKey: TENANT_KEYS.channels(tenantId) }),
  })
}
