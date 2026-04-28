import client from '../../shared/api/client'

export const agendaApi = {
  getAppointments: (tenantId, params = {}) =>
    client.get('/api/v1/appointments', { params: { tenantId, ...params } }),
}
