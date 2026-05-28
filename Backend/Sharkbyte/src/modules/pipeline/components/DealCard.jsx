import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STATUS_COLORS = {
  open: 'border-gray-200',
  won: 'border-green-400',
  lost: 'border-red-300',
}
const STATUS_DOT = {
  open: 'bg-gray-400',
  won: 'bg-green-500',
  lost: 'bg-red-400',
}

function fmt(n) {
  if (!n && n !== 0) return ''
  return `$${Number(n).toLocaleString('es-CO')}`
}

export default function DealCard({ deal, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white rounded-lg border ${STATUS_COLORS[deal.status] || 'border-gray-200'} p-3 cursor-pointer hover:shadow-sm transition-shadow select-none`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 leading-tight">{deal.title}</p>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${STATUS_DOT[deal.status] || 'bg-gray-400'}`} />
      </div>
      {deal.contactPhone && (
        <p className="text-xs text-gray-400 mt-1">{deal.contactPhone}</p>
      )}
      {deal.value > 0 && (
        <p className="text-xs font-semibold text-sb-primary mt-2">{fmt(deal.value)}</p>
      )}
    </div>
  )
}
