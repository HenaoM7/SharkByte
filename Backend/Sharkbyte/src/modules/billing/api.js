import api from '../../shared/api/client'

export const billingApi = {
  getSubscription: (tenantId) =>
    api.get(`/api/v1/billing/subscription/${tenantId}`).then((r) => r.data),
  getInvoices: (tenantId) =>
    api.get('/api/v1/billing/invoices', { params: { tenantId } }).then((r) => r.data),
  createCheckout: (data) =>
    api.post('/api/v1/billing/checkout', data).then((r) => r.data),
  cancelSubscription: (data) =>
    api.post('/api/v1/billing/cancel', data).then((r) => r.data),
  pauseSubscription: (data) =>
    api.post('/api/v1/billing/pause', data).then((r) => r.data),
  resumeSubscription: (data) =>
    api.post('/api/v1/billing/resume', data).then((r) => r.data),
  adminActivate: (data) =>
    api.post('/api/v1/billing/admin-activate', data).then((r) => r.data),
}
