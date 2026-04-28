import { useEffect, useRef, useState } from 'react'
import { useMessages, useUpdateConversationStatus, useUpdateConversationCategory } from '../hooks'
import MessageBubble from './MessageBubble'
import ConversationPanel from './ConversationPanel'
import Spinner from '../../../shared/ui/Spinner'

export default function ChatWindow({ conversationId, conv, tenantId }) {
  const { data, isLoading } = useMessages(conversationId, tenantId)
  const bottomRef = useRef(null)
  const messages = data?.data ?? []
  const [panelOpen, setPanelOpen] = useState(false)

  const updateStatus = useUpdateConversationStatus(tenantId)
  const updateCategory = useUpdateConversationCategory(tenantId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const name = conv?.contactName || conv?.contactPhone || 'Conversación'

  const handleStatusChange = (status) => {
    updateStatus.mutate({ id: conversationId, status })
  }

  const handleCategoryChange = (category) => {
    updateCategory.mutate({ id: conversationId, category })
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-sb-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{name}</p>
            {conv?.contactPhone && conv?.contactName && (
              <p className="text-xs text-gray-400">{conv.contactPhone}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {conv?.status === 'escalated' && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">
                Escalada
              </span>
            )}
            {conv?.category && conv.category !== 'general' && (() => {
              const styles = {
                sales:     'bg-green-100 text-green-700',
                support:   'bg-blue-100 text-blue-700',
                inquiry:   'bg-amber-100 text-amber-700',
                complaint: 'bg-red-100 text-red-700',
              }
              const labels = { sales: 'Venta', support: 'Soporte', inquiry: 'Consulta', complaint: 'Reclamo' }
              return (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${styles[conv.category] || ''}`}>
                  {labels[conv.category] || conv.category}
                </span>
              )
            })()}
            {/* Panel toggle */}
            <button
              onClick={() => setPanelOpen((v) => !v)}
              title="Info del cliente"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                panelOpen ? 'bg-sb-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <svg className="w-10 h-10 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm text-gray-400">Sin mensajes aún</p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg._id} msg={msg} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar — v1 disabled */}
        <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-2 items-center bg-gray-100 rounded-xl px-4 py-2.5">
            <p className="text-sm text-gray-400 flex-1">Respuesta manual — próximamente</p>
            <button
              disabled
              className="text-xs bg-sb-primary/20 text-sb-neutral px-3 py-1 rounded-lg cursor-not-allowed"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>

      {/* Side panel */}
      {panelOpen && (
        <ConversationPanel
          conv={conv}
          tenantId={tenantId}
          onStatusChange={handleStatusChange}
          onCategoryChange={handleCategoryChange}
        />
      )}
    </div>
  )
}
