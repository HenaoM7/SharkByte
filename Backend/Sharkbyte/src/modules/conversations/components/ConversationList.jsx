import { useState } from 'react'
import Spinner from '../../../shared/ui/Spinner'
import ConversationItem from './ConversationItem'

const STATUS_TABS = [
  { label: 'Abiertas', value: 'open' },
  { label: 'Cerradas', value: 'closed' },
  { label: 'Escaladas', value: 'escalated' },
]

export default function ConversationList({ conversations, isLoading, selectedId, onSelect }) {
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')

  const filtered = (conversations?.data ?? []).filter((c) => {
    if (c.status !== filter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.contactName?.toLowerCase().includes(q) ||
      c.contactPhone?.includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-sb-primary"
        />
      </div>

      {/* Status tabs */}
      <div className="flex border-b border-gray-100">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              filter === tab.value
                ? 'text-sb-primary border-b-2 border-sb-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">No hay conversaciones</div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv._id}
              conv={conv}
              isSelected={conv._id === selectedId}
              onClick={() => onSelect(conv._id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
