import api from '../../shared/api/client'

export const analyticsApi = {
  getOverview: () =>
    api.get('/api/v1/analytics/overview').then((r) => r.data),
  getMessageVolume: (months) =>
    api.get('/api/v1/analytics/message-volume', { params: { months } }).then((r) => r.data),
  getTenantGrowth: (months) =>
    api.get('/api/v1/analytics/tenant-growth', { params: { months } }).then((r) => r.data),
  getPlanConversion: () =>
    api.get('/api/v1/analytics/plan-conversion').then((r) => r.data),
  getTopTenants: (limit = 10) =>
    api.get('/api/v1/analytics/top-tenants', { params: { limit } }).then((r) => r.data),
  exportCsv: (months) =>
    api.get('/api/v1/analytics/export', { params: { months }, responseType: 'blob' }).then((r) => r.data),
  captureSnapshot: () =>
    api.get('/api/v1/analytics/capture-snapshot').then((r) => r.data),
}