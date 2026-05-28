import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelineApi } from './api'

export function usePipelineBoard(tenantId) {
  return useQuery({
    queryKey: ['pipeline', tenantId],
    queryFn: () => pipelineApi.getBoard(tenantId),
    enabled: !!tenantId,
    select: (res) => res.data,
    refetchOnWindowFocus: true,
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => pipelineApi.createDeal(data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['pipeline', vars.tenantId] }),
  })
}

export function useUpdateDeal(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => pipelineApi.updateDeal(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline', tenantId] }),
  })
}

export function useMoveDeal(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stageId }) => pipelineApi.moveDeal(id, stageId, tenantId),
    onMutate: async ({ id, stageId }) => {
      await qc.cancelQueries({ queryKey: ['pipeline', tenantId] })
      const prev = qc.getQueryData(['pipeline', tenantId])
      qc.setQueryData(['pipeline', tenantId], (old) => {
        if (!old) return old
        const dealsByStage = {}
        for (const [sid, stageDeals] of Object.entries(old.dealsByStage ?? {})) {
          dealsByStage[sid] = stageDeals.filter((d) => d._id !== id)
        }
        const movedDeal = Object.values(old.dealsByStage ?? {}).flat().find((d) => d._id === id)
        if (movedDeal && dealsByStage[stageId] !== undefined) {
          dealsByStage[stageId] = [...dealsByStage[stageId], { ...movedDeal, stageId }]
        }
        return { ...old, dealsByStage }
      })
      return { prev }
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(['pipeline', tenantId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['pipeline', tenantId] }),
  })
}

export function useDeleteDeal(tenantId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => pipelineApi.deleteDeal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline', tenantId] }),
  })
}
