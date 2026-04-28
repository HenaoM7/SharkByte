import client from '../../shared/api/client'

export const whatsappApi = {
  connect:        (tenantId) => client.post(`/api/v1/whatsapp/${tenantId}/connect`).then(r => r.data),
  getQR:          (tenantId) => client.get(`/api/v1/whatsapp/${tenantId}/qr`).then(r => r.data),
  getStatus:      (tenantId) => client.get(`/api/v1/whatsapp/${tenantId}/status`).then(r => r.data),
  disconnect:     (tenantId) => client.post(`/api/v1/whatsapp/${tenantId}/disconnect`).then(r => r.data),
  deleteInstance: (tenantId) => client.delete(`/api/v1/whatsapp/${tenantId}/instance`).then(r => r.data),
}
