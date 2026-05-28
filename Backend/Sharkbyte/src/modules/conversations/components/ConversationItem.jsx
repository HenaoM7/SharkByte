const CATEGORY_CONFIG = {
  sales:     { label: 'Venta',   color: 'bg-green-100 text-green-700' },
  support:   { label: 'Soporte', color: 'bg-blue-100 text-blue-700' },
  inquiry:   { label: 'Consulta',color: 'bg-amber-100 text-amber-700' },
  complaint: { label: 'Reclamo', color: 'bg-red-100 text-red-700' },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function initials(name, phone) {
  if (name && name.trim()) return name.trim().slice(0, 2).toUpperCase()
  return (phone || '?').slice(-2)
}

const AVATAR_COLORS = [
  'bg-sb-primary', 'bg-sb-secondary', 'bg-pink-500',
  'bg-teal-500', 'bg-amber-500', 'bg-violet-500',
]

function avatarColor(str) {
  let n = 0
  for (const c of String(str)) n += c.charCodeAt(0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

export default function ConversationItem({ conv, isSelected, onClick }) {
  const name = conv.contactName || conv.contactPhone
  const ini = initials(conv.contactName, conv.contactPhone)
  const color = avatarColor(conv.contactPhone)
  const cat = conv.category && conv.category !== 'general' ? CATEGORY_CONFIG[conv.category] : null

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-gray-50 transition-colors border-b border-gray-50 ${isSelected ? 'bg-sb-primary/10 border-l-2 border-l-sb-primary' : ''}`}
    >
      <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold ${color}`}>
        {ini}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
          <span className="text-xs text-gray-400 shrink-0">{timeAgo(conv.lastMessageAt)}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage || 'Sin mensajes'}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {conv.status === 'escalated' && (
            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
              Escalada
            </span>
          )}
          {cat && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cat.color}`}>
              {cat.label}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
