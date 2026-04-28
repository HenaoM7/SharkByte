import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useContact, useUpdateContact } from '../hooks'
import { useAuthStore } from '../../auth/store'
import { useSales } from '../../tenants/hooks'
import Badge from '../../../shared/ui/Badge'
import Spinner from '../../../shared/ui/Spinner'
import ContactTagBadge from '../components/ContactTagBadge'
import ContactForm from '../components/ContactForm'

const STATUS_BADGE = { confirmed: 'active', pending: 'inactive', cancelled: 'disconnected' }
const STATUS_LABEL = { confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmt(n) {
  return n != null ? `$${Number(n).toLocaleString('es-CO')}` : '—'
}

const TABS = ['Ventas', 'Info']

export default function ContactDetailPage({ tenantId: tenantIdProp, backUrl } = {}) {
  const { contactId } = useParams()
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId

  const { data: contact, isLoading } = useContact(contactId, tenantId)
  const { data: salesData } = useSales(tenantId)
  const [activeTab, setActiveTab] = useState(0)
  const [showEdit, setShowEdit] = useState(false)

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }
  if (!contact) {
    return <div className="text-center py-16 text-gray-400 text-sm">Contacto no encontrado</div>
  }

  // Filter sales by phone
  const sales = (salesData?.data ?? []).filter(
    (s) => s.clientPhone === contact.phone
  )

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Back */}
      <Link to={backUrl ?? '/app/crm'} className="text-xs text-sb-primary hover:underline inline-flex items-center gap-1">
        ← Volver a contactos
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-full bg-sb-primary flex items-center justify-center text-white text-xl font-bold">
            {(contact.name || contact.phone).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{contact.name || '—'}</h1>
            <p className="text-sm text-gray-500">{contact.phone}</p>
            {contact.email && <p className="text-sm text-gray-400">{contact.email}</p>}
            <div className="flex gap-1 mt-2 flex-wrap">
              {(contact.tags || []).map((t) => <ContactTagBadge key={t} tag={t} />)}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm text-sb-primary hover:text-sb-secondary border border-sb-primary/30 px-4 py-2 rounded-lg"
        >
          Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === i
                ? 'text-sb-primary border-sb-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No hay ventas vinculadas a este contacto</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Producto</th>
                    <th className="px-6 py-3 text-left">Total</th>
                    <th className="px-6 py-3 text-left">Estado</th>
                    <th className="px-6 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-800">{s.productName || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{fmt(s.totalAmount)}</td>
                      <td className="px-6 py-3">
                        <Badge type={STATUS_BADGE[s.status] || 'inactive'}>
                          {STATUS_LABEL[s.status] || s.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{fmtDate(s.confirmedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-3 text-sm">
          <div><span className="text-gray-400 text-xs uppercase tracking-wide">Fuente</span>
            <p className="mt-1 text-gray-700">{contact.source || '—'}</p>
          </div>
          {contact.notes && (
            <div><span className="text-gray-400 text-xs uppercase tracking-wide">Notas</span>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}
          <div><span className="text-gray-400 text-xs uppercase tracking-wide">Registrado</span>
            <p className="mt-1 text-gray-700">{fmtDate(contact.createdAt)}</p>
          </div>
        </div>
      )}

      {showEdit && (
        <ContactForm
          tenantId={tenantId}
          contact={contact}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
