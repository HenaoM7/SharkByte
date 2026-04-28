import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from './api'

export function useContacts(tenantId, params = {}) {
  return useQuery({
    queryKey: ['contacts', tenantId, params],
    queryFn: () => contactsApi.getAll(tenantId, params),
    enabled: !!tenantId,
    select: (res) => res.data,
    refetchOnWindowFocus: true,
  })
}

export function useContact(id, tenantId) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.getOne(id, tenantId),
    enabled: !!id && !!tenantId,
    select: (res) => res.data,
  })
}

export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => contactsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}

export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => contactsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['contact', id] })
    },
  })
}

export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => contactsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  })
}
