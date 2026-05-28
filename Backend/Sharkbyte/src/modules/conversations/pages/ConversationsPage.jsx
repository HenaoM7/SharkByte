import { useState } from 'react'
import { useAuthStore } from '../../auth/store'
import { useConversations, useSSEStream } from '../hooks'
import ConversationList from '../components/ConversationList'
import ChatWindow from '../components/ChatWindow'

const CHANNEL_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'whatsapp', label: 'WhatsApp' },
]

export default function ConversationsPage({ tenantId: tenantIdProp } = {}) {
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId
  const [selectedId, setSelectedId] = useState(null)
  const [channel, setChannel] = useState('')

  const { data: conversations, isLoading } = useConversations(tenantId)
  useSSEStream(tenantId)

  // Filter by channel
  const filtered = channel
    ? { ...conversations, data: (conversations?.data ?? []).filter((c) => c.channel === channel) }
    : conversations

  const selectedConv = (conversations?.data ?? []).find((c) => c._id === selectedId)

  // Stats
  const all = conversations?.data ?? []
  const openCount = all.filter((c) => c.status === 'open').length
  const escalatedCount = all.filter((c) => c.status === 'escalated').length

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-6 overflow-hidden">
      {/* Top stats bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-6">
        <h1 className="text-sm font-semibold text-gray-800">Conversaciones</h1>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span><strong className="text-sb-primary">{openCount}</strong> abiertas</span>
          {escalatedCount > 0 && <span><strong className="text-red-500">{escalatedCount}</strong> escaladas</span>}
          <span className="text-gray-300">|</span>
          <span>{all.length} total</span>
        </div>
        {/* Channel filter */}
        <div className="ml-auto flex gap-1">
          {CHANNEL_OPTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setChannel(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-colors ${
                channel === opt.value ? 'bg-sb-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar list */}
        <div className="w-72 md:w-80 border-r border-gray-100 bg-white flex-shrink-0 flex flex-col overflow-hidden">
          <ConversationList
            conversations={filtered}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Chat pane */}
        <div className="flex-1 bg-gray-50 overflow-hidden">
          {selectedId ? (
            <ChatWindow conversationId={selectedId} conv={selectedConv} tenantId={tenantId} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p className="font-medium text-gray-500">Selecciona una conversación</p>
                <p className="text-xs text-gray-400 mt-1">
                  {all.length > 0 ? `${openCount} conversaciones abiertas` : 'No hay conversaciones aún'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
