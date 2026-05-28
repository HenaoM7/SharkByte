import { useState } from 'react'
import { Link } from 'react-router-dom'
import ContactTagBadge from './ContactTagBadge'
import Spinner from '../../../shared/ui/Spinner'

const SOURCE_LABEL = { whatsapp: 'WhatsApp', manual: 'Manual', import: 'Importado' }

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ContactsTable({ contacts, isLoading, onEdit }) {
  const rows = contacts?.data ?? []

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No hay contactos registrados aún.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
            <th className="px-6 py-3 text-left">Contacto</th>
            <th className="px-6 py-3 text-left">Etiquetas</th>
            <th className="px-6 py-3 text-left">Fuente</th>
            <th className="px-6 py-3 text-left">Última interacción</th>
            <th className="px-6 py-3 text-left"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((c) => (
            <tr key={c._id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-3">
                <p className="font-medium text-gray-800">{c.name || '—'}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </td>
              <td className="px-6 py-3">
                <div className="flex flex-wrap gap-1">
                  {(c.tags || []).map((t) => <ContactTagBadge key={t} tag={t} />)}
                  {(!c.tags || c.tags.length === 0) && <span className="text-gray-300 text-xs">—</span>}
                </div>
              </td>
              <td className="px-6 py-3 text-gray-500 text-xs">{SOURCE_LABEL[c.source] ?? c.source ?? '—'}</td>
              <td className="px-6 py-3 text-gray-500 text-xs">{fmtDate(c.lastInteractionAt)}</td>
              <td className="px-6 py-3 flex gap-3">
                <Link
                  to={`/app/crm/${c._id}`}
                  className="text-xs text-sb-primary hover:underline"
                >
                  Ver
                </Link>
                <button
                  onClick={() => onEdit(c)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
