import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from './api'

export const USER_KEYS = {
  all: ['users'],
  list: (params) => ['users', params],
}

export const useUsers = (params = {}) =>
  useQuery({
    queryKey: USER_KEYS.list(params),
    queryFn: () => usersApi.getAll(params),
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  })
}

export const useDeactivateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  })
}

export const useActivateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => usersApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  })
}
