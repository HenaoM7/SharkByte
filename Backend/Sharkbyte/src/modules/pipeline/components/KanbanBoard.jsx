import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import KanbanColumn from './KanbanColumn'
import { useMoveDeal } from '../hooks'

export default function KanbanBoard({ tenantId, pipeline, deals, dealsByStage: dealsByStageFromServer, onAddDeal, onSelectDeal }) {
  const moveDeal = useMoveDeal(tenantId)
  const stages = pipeline?.stages ?? []

  // Use server-computed grouping when available (avoids ID type mismatch)
  // Fall back to client-side grouping for optimistic updates after drag-drop
  const dealsByStage = dealsByStageFromServer ?? stages.reduce((acc, s) => {
    acc[s.id] = deals.filter((d) => String(d.stageId) === String(s.id))
    return acc
  }, {})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over) return
    const dealId = active.id
    const deal = deals.find((d) => d._id === dealId)
    if (!deal) return

    // over.id could be a stageId (dropped on column) or a dealId (dropped on card → find its stage)
    let targetStage = stages.find((s) => s.id === over.id)
    if (!targetStage) {
      const overDeal = deals.find((d) => d._id === over.id)
      if (overDeal) targetStage = stages.find((s) => s.id === overDeal.stageId)
    }

    if (!targetStage || targetStage.id === deal.stageId) return
    moveDeal.mutate({ id: dealId, stageId: targetStage.id })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage[stage.id] ?? []}
            onAddDeal={onAddDeal}
            onSelectDeal={onSelectDeal}
          />
        ))}
      </div>
    </DndContext>
  )
}
