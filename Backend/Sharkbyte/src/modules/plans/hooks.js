import { useQuery } from '@tanstack/react-query'
import { plansApi } from './api'

export const usePlans = () =>
  useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.getAll,
    staleTime: 1000 * 60 * 10, // 10 min — plans rarely change
  })
