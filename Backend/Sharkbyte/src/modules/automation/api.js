import api from '../../shared/api/client'

export const automationApi = {
  getRules: (params = {}) =>
    api.get('/api/v1/automation/rules', { params }).then((r) => r.data),
  createRule: (data) =>
    api.post('/api/v1/automation/rules', data).then((r) => r.data),
  updateRule: (id, data) =>
    api.patch(`/api/v1/automation/rules/${id}`, data).then((r) => r.data),
  toggleRule: (id) =>
    api.patch(`/api/v1/automation/rules/${id}/toggle`).then((r) => r.data),
  deleteRule: (id) =>
    api.delete(`/api/v1/automation/rules/${id}`).then((r) => r.data),
}