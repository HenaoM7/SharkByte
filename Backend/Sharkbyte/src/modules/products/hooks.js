import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi, catalogPdfApi } from './api'

// ─── Query keys ──────────────────────────────────────────────────────────────

export const PRODUCT_KEYS = {
  all: (tenantId) => ['products', tenantId],
  list: (tenantId, params) => ['products', tenantId, 'list', params],
  categories: (tenantId) => ['products', tenantId, 'categories'],
  detail: (tenantId, id) => ['products', tenantId, id],
  pdf: (tenantId) => ['catalog-pdf', tenantId],
}

// ─── Products hooks ───────────────────────────────────────────────────────────

export function useProducts(tenantId, params = {}) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(tenantId, params),
    queryFn: () => productsApi.getAll(tenantId, params),
    enabled: !!tenantId,
  })
}

export function useProductCategories(tenantId) {
  return useQuery({
    queryKey: PRODUCT_KEYS.categories(tenantId),
    queryFn: () => productsApi.getCategories(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateProduct(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => productsApi.create(tenantId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all(tenantId) })
    },
  })
}

export function useUpdateProduct(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }) => productsApi.update(tenantId, id, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all(tenantId) })
    },
  })
}

export function useDeleteProduct(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => productsApi.remove(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all(tenantId) })
    },
  })
}

// ─── CatalogPdf hooks ─────────────────────────────────────────────────────────

export function useCatalogPdf(tenantId) {
  return useQuery({
    queryKey: PRODUCT_KEYS.pdf(tenantId),
    queryFn: () => catalogPdfApi.get(tenantId),
    enabled: !!tenantId,
    retry: false,                // 404 = no hay PDF, no reintentar
  })
}

export function useUploadCatalogPdf(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData) => catalogPdfApi.upload(tenantId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.pdf(tenantId) })
    },
  })
}

export function useDeleteCatalogPdf(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => catalogPdfApi.remove(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PRODUCT_KEYS.pdf(tenantId) })
    },
  })
}
