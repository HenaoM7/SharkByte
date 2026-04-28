import api from '../../shared/api/client'

export const productsApi = {
  getAll: (tenantId, params = {}) =>
    api.get(`/api/v1/tenants/${tenantId}/products`, { params }).then((r) => r.data),

  getCategories: (tenantId) =>
    api.get(`/api/v1/tenants/${tenantId}/products/categories`).then((r) => r.data),

  getById: (tenantId, id) =>
    api.get(`/api/v1/tenants/${tenantId}/products/${id}`).then((r) => r.data),

  create: (tenantId, formData) =>
    api.post(`/api/v1/tenants/${tenantId}/products`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  update: (tenantId, id, formData) =>
    api.patch(`/api/v1/tenants/${tenantId}/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  remove: (tenantId, id) =>
    api.delete(`/api/v1/tenants/${tenantId}/products/${id}`).then((r) => r.data),
}

export const catalogPdfApi = {
  get: (tenantId) =>
    api.get(`/api/v1/tenants/${tenantId}/catalog-pdf`).then((r) => r.data),

  upload: (tenantId, formData) =>
    api.post(`/api/v1/tenants/${tenantId}/catalog-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  remove: (tenantId) =>
    api.delete(`/api/v1/tenants/${tenantId}/catalog-pdf`).then((r) => r.data),
}
