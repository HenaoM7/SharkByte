import { useState } from 'react'
import { useContacts } from '../../contacts/hooks'
import { usePipelineBoard } from '../../pipeline/hooks'

const STAGE_LABELS = {
  nuevo_lead: 'Nuevo lead',
  contactado: 'Contactado',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganado: 'Ganado',
  perdido: 'Perdido',
}

const CONTACT_STAGE_STYLES = {
  lead:     { label: 'Lead',      color: 'bg-blue-100 text-blue-700' },
  prospect: { label: 'Prospecto', color: 'bg-purple-100 text-purple-700' },
  customer: { label: 'Cliente',   color: 'bg-green-100 text-green-700' },
  churned:  { label: 'Inactivo',  color: 'bg-gray-100 text-gray-500' },
}

const CATEGORY_OPTIONS = [
  { value: 'general',   label: 'General',  style: 'border-gray-200 bg-white text-gray-700',    active: 'border-gray-400 bg-gray-50 text-gray-900' },
  { value: 'sales',     label: 'Venta',    style: 'border-green-100 bg-white text-green-700',  active: 'border-green-400 bg-green-50 text-green-800' },
  { value: 'support',   label: 'Soporte',  style: 'border-blue-100 bg-white text-blue-700',   active: 'border-blue-400 bg-blue-50 text-blue-800' },
  { value: 'inquiry',   label: 'Consulta', style: 'border-amber-100 bg-white text-amber-700', active: 'border-amber-400 bg-amber-50 text-amber-800' },
  { value: 'complaint', label: 'Reclamo',  style: 'border-red-100 bg-white text-red-700',     active: 'border-red-400 bg-red-50 text-red-800' },
]

const STATUS_OPTIONS = [
  { value: 'open',      label: 'Abierta',  style: 'border-green-100 bg-white text-green-700',  active: 'border-green-400 bg-green-50 text-green-800' },
  { value: 'escalated', label: 'Escalada', style: 'border-red-100 bg-white text-red-700',      active: 'border-red-400 bg-red-50 text-red-800' },
  { value: 'closed',    label: 'Cerrada',  style: 'border-gray-200 bg-white text-gray-600',    active: 'border-gray-400 bg-gray-100 text-gray-700' },
]

function InfoRow({ label, value, capitalize }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-xs shrink-0 mr-2">{label}</span>
      <span className={`text-gray-800 text-xs font-medium text-right break-words max-w-[55%] ${capitalize ? 'capitalize' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

export default function ConversationPanel({ conv, tenantId, onStatusChange, onCategoryChange }) {
  const [tab, setTab] = useState('client')

  const { data: contactsData } = useContacts(
    tenantId,
    { search: conv?.contactPhone, limit: 1 },
  )
  const contact = contactsData?.data?.[0]

  const { data: pipelineData } = usePipelineBoard(tenantId)
  const allDeals = Object.values(pipelineData?.dealsByStage ?? {}).flat()
  const deal = allDeals.find((d) => d.contactPhone === conv?.contactPhone)

  if (!conv) return null

  const avatarLetters = (conv.contactName || conv.contactPhone || '?').slice(0, 2).toUpperCase()

  return (
    <div className="w-72 shrink-0 border-l border-gray-100 bg-white flex flex-col h-full overflow-hidden">
      {/* Contact header */}
      <div className="px-4 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-sb-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
            {avatarLetters}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {conv.contactName || 'Sin nombre'}
            </p>
            <p className="text-xs text-gray-500">{conv.contactPhone}</p>
            <p className="text-[10px] text-gray-400 capitalize mt-0.5">
              {conv.channel} · {conv.status === 'open' ? 'Abierta' : conv.status === 'escalated' ? 'Escalada' : 'Cerrada'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 shrink-0">
        {[
          { key: 'client', label: 'Cliente' },
          { key: 'deal',   label: 'Negocio' },
          { key: 'actions',label: 'Acciones' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? 'text-sb-primary border-b-2 border-sb-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">

        {/* ── CLIENT TAB ── */}
        {tab === 'client' && (
          <div className="space-y-0">
            <InfoRow label="Teléfono"       value={conv.contactPhone} />
            <InfoRow label="Nombre"         value={conv.contactName} />
            <InfoRow label="Canal"          value={conv.channel} capitalize />
            <InfoRow
              label="Primera interacción"
              value={conv.createdAt ? new Date(conv.createdAt).toLocaleDateString('es-CO') : null}
            />
            <InfoRow
              label="Último mensaje"
              value={conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleDateString('es-CO') : null}
            />

            {contact ? (
              <div className="mt-4 pt-3 border-t border-gray-100 space-y-0">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Perfil CRM
                </p>
                {contact.email && <InfoRow label="Email" value={contact.email} />}
                <InfoRow label="Fuente" value={contact.source} capitalize />
                {contact.stage && (() => {
                  const s = CONTACT_STAGE_STYLES[contact.stage]
                  return (
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                      <span className="text-gray-400 text-xs">Etapa</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s?.color || 'bg-gray-100 text-gray-600'}`}>
                        {s?.label || contact.stage}
                      </span>
                    </div>
                  )
                })()}
                {contact.score > 0 && <InfoRow label="Score" value={`${contact.score} pts`} />}
                {contact.notes && (
                  <div className="py-2">
                    <p className="text-gray-400 text-xs mb-1">Notas</p>
                    <p className="text-gray-700 text-xs leading-relaxed">{contact.notes}</p>
                  </div>
                )}
                {contact.tags?.length > 0 && (
                  <div className="py-2 flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <span key={tag} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-gray-100 text-center py-4">
                <p className="text-xs text-gray-400">Sin perfil CRM registrado</p>
              </div>
            )}
          </div>
        )}

        {/* ── DEAL TAB ── */}
        {tab === 'deal' && (
          <div>
            {deal ? (
              <div className="space-y-0">
                <InfoRow label="Título"  value={deal.title} />
                <InfoRow label="Etapa"   value={STAGE_LABELS[deal.stageId] || deal.stageId} />
                <InfoRow
                  label="Estado"
                  value={deal.status === 'won' ? 'Ganado' : deal.status === 'lost' ? 'Perdido' : 'Activo'}
                />
                {deal.value > 0 && (
                  <InfoRow
                    label="Valor"
                    value={`$${Number(deal.value).toLocaleString('es-CO')} ${deal.currency || 'COP'}`}
                  />
                )}
                {deal.assignedTo && <InfoRow label="Asignado a" value={deal.assignedTo} />}
                {deal.expectedCloseDate && (
                  <InfoRow
                    label="Cierre estimado"
                    value={new Date(deal.expectedCloseDate).toLocaleDateString('es-CO')}
                  />
                )}
                {deal.notes && (
                  <div className="py-2 mt-1 border-t border-gray-50">
                    <p className="text-gray-400 text-xs mb-1">Notas del negocio</p>
                    <p className="text-gray-700 text-xs leading-relaxed">{deal.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">Sin negocio activo</p>
                <p className="text-xs text-gray-400 mt-1">Se crea automáticamente con el primer mensaje</p>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIONS TAB ── */}
        {tab === 'actions' && (
          <div className="space-y-5">
            {/* Status */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Estado de conversación
              </p>
              <div className="space-y-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = conv.status === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !isActive && onStatusChange?.(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        isActive ? opt.active + ' cursor-default' : opt.style + ' hover:opacity-80 cursor-pointer'
                      }`}
                    >
                      {isActive && <span className="mr-1">✓</span>}{opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Categoría
              </p>
              <div className="space-y-1.5">
                {CATEGORY_OPTIONS.map((opt) => {
                  const currentCat = conv.category || 'general'
                  const isActive = currentCat === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !isActive && onCategoryChange?.(opt.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        isActive ? opt.active + ' cursor-default' : opt.style + ' hover:opacity-80 cursor-pointer'
                      }`}
                    >
                      {isActive && <span className="mr-1">✓</span>}{opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
