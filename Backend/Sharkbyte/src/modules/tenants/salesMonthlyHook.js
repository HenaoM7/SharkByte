import { useQuery } from '@tanstack/react-query'
import client from '../../shared/api/client'

export function useMonthlySales(tenantId) {
  return useQuery({
    queryKey: ['sales', 'monthly', tenantId],
    queryFn: () => client.get('/api/v1/sales/monthly', { params: { tenantId } }),
    enabled: !!tenantId,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  })
}
