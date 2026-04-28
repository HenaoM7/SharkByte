import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import DealCard from './DealCard'

export default function KanbanColumn({ stage, deals, onAddDeal, onSelectDeal }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const fmt = (n) => n ? `$${Number(n).toLocaleString('es-CO')}` : ''
  const totalValue = deals.filter((d) => d.status === 'open').reduce((s, d) => s + (d.value || 0), 0)

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3 py-2 rounded-t-xl mb-1"
        style={{ backgroundColor: stage.color + '22', borderLeft: `3px solid ${stage.color}` }}
      >
        <div>
          <p className="text-xs font-semibold text-gray-700">{stage.name}</p>
          <p className="text-xs text-gray-400">{deals.length} · {fmt(totalValue)}</p>
        </div>
        <button
          onClick={() => onAddDeal(stage.id)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          title="Agregar deal"
        >
          +
        </button>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto space-y-2 p-2 rounded-xl min-h-[200px] transition-colors ${
          isOver ? 'bg-sb-primary/10' : 'bg-gray-50'
        }`}
      >
        <SortableContext items={deals.map((d) => d._id)} strategy={verticalListSortingStrategy}>
          {deals.map((deal) => (
            <DealCard key={deal._id} deal={deal} onClick={() => onSelectDeal(deal)} />
          ))}
        </SortableContext>
        {deals.length === 0 && (
          <div className="text-center text-xs text-gray-300 py-8">Sin deals</div>
        )}
      </div>
    </div>
  )
}
