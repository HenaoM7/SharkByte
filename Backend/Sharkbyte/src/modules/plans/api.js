import api from '../../shared/api/client'

export const plansApi = {
  getAll: () => api.get('/api/v1/plans').then((r) => r.data),
}
