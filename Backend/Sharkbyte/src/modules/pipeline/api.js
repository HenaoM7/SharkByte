import client from '../../shared/api/client'

export const pipelineApi = {
  getBoard: (tenantId) =>
    client.get('/api/v1/pipeline', { params: { tenantId } }),

  createDeal: (data) =>
    client.post('/api/v1/pipeline/deals', data),

  updateDeal: (id, data) =>
    client.patch(`/api/v1/pipeline/deals/${id}`, data),

  moveDeal: (id, stageId, tenantId) =>
    client.patch(`/api/v1/pipeline/deals/${id}/move`, { stageId }, { params: { tenantId } }),

  deleteDeal: (id) =>
    client.delete(`/api/v1/pipeline/deals/${id}`),
}
