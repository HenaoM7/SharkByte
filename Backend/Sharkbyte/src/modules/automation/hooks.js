import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automationApi } from './api'

const KEYS = {
  all: ['automation'],
  list: (params) => ['automation', 'rules', params],
}

export function useRules(params = {}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => automationApi.getRules(params),
  })
}

export function useCreateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: automationApi.createRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useUpdateRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => automationApi.updateRule(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useToggleRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: automationApi.toggleRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}

export function useDeleteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: automationApi.deleteRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  })
}