import api from '../../shared/api/client'

export const tenantsApi = {
  getAll: (params = {}) =>
    api.get('/api/v1/tenants', { params }).then((r) => r.data),

  getById: (tenantId) =>
    api.get(`/api/v1/tenants/${tenantId}`).then((r) => r.data),

  create: (data) =>
    api.post('/api/v1/tenants', data).then((r) => r.data),

  updateConfig: (tenantId, config) =>
    api.patch(`/api/v1/tenants/${tenantId}/config`, config).then((r) => r.data),

  updatePlan: (tenantId, planName) =>
    api.patch(`/api/v1/tenants/${tenantId}/plan`, { planName }).then((r) => r.data),

  activate: (tenantId) =>
    api.patch(`/api/v1/tenants/${tenantId}/activate`).then((r) => r.data),

  updateInstance: (tenantId, data) =>
    api.patch(`/api/v1/tenants/${tenantId}/evolution-instance`, data).then((r) => r.data),

  getUsage: (tenantId) =>
    api.get(`/api/v1/tenants/${tenantId}/usage`).then((r) => r.data),

  updateStatus: (tenantId, status) =>
    api.patch(`/api/v1/tenants/${tenantId}/status`, { status }).then((r) => r.data),

  softDelete: (tenantId) =>
    api.delete(`/api/v1/tenants/${tenantId}`).then((r) => r.data),

  restore: (tenantId) =>
    api.patch(`/api/v1/tenants/${tenantId}/restore`).then((r) => r.data),

  getBusinessConfig: (tenantId) =>
    api.get(`/api/v1/tenants/${tenantId}/business-config`).then((r) => r.data),

  upsertBusinessConfig: (tenantId, data) =>
    api.put(`/api/v1/tenants/${tenantId}/business-config`, data).then((r) => r.data),

  updateGoogleCredentials: (tenantId, data) =>
    api.patch(`/api/v1/tenants/${tenantId}/google-credentials`, data).then((r) => r.data),

  deactivate: (tenantId) =>
    api.patch(`/api/v1/tenants/${tenantId}/deactivate`).then((r) => r.data),

  hardDelete: (tenantId) =>
    api.delete(`/api/v1/tenants/${tenantId}/permanent`).then((r) => r.data),

  getGoogleStatus: (tenantId) =>
    api.get(`/api/v1/integrations/google/status/${tenantId}`).then((r) => r.data),

  getGoogleAuthUrl: (tenantId) =>
    api.get('/api/v1/integrations/google/auth-url', { params: { tenantId } }).then((r) => r.data),

  disconnectGoogle: (tenantId) =>
    api.delete(`/api/v1/integrations/google/disconnect/${tenantId}`).then((r) => r.data),

  updateGoogleConfig: (tenantId, data) =>
    api.patch(`/api/v1/integrations/google/config/${tenantId}`, data).then((r) => r.data),

  getSales: (tenantId, params = {}) =>
    api.get('/api/v1/sales', { params: { tenantId, ...params } }).then((r) => r.data),

  getSalesStats: (tenantId) =>
    api.get('/api/v1/sales/stats', { params: { tenantId } }).then((r) => r.data),

  uploadPaymentQr: (tenantId, file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post(`/api/v1/tenants/${tenantId}/business-config/payment-qr`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  // ── Referencias ──────────────────────────────────────────────────────────
  getReferences: (tenantId) =>
    api.get(`/api/v1/references/${tenantId}`).then((r) => r.data),

  createReference: (tenantId, data) =>
    api.post(`/api/v1/references/${tenantId}`, data).then((r) => r.data),

  updateReference: (tenantId, id, data) =>
    api.patch(`/api/v1/references/${tenantId}/${id}`, data).then((r) => r.data),

  deleteReference: (tenantId, id) =>
    api.delete(`/api/v1/references/${tenantId}/${id}`).then((r) => r.data),

  // ── Canales (Multi-Canal) ─────────────────────────────────────────────────
  getChannels: (tenantId) =>
    api.get(`/api/v1/channels/${tenantId}`).then((r) => r.data),

  getChannel: (tenantId, platform) =>
    api.get(`/api/v1/channels/${tenantId}/${platform}`).then((r) => r.data),

  upsertChannel: (tenantId, data) =>
    api.post(`/api/v1/channels/${tenantId}`, data).then((r) => r.data),

  deleteChannel: (tenantId, platform) =>
    api.delete(`/api/v1/channels/${tenantId}/${platform}`).then((r) => r.data),

  testMetaToken: (tenantId, accessToken) =>
    api.post(`/api/v1/channels/${tenantId}/meta/test`, { accessToken }).then((r) => r.data),
}
