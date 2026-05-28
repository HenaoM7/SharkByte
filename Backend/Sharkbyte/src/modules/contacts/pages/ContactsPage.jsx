import { useState, useDeferredValue } from 'react'
import { useAuthStore } from '../../auth/store'
import { useContacts } from '../hooks'
import ContactsTable from '../components/ContactsTable'
import ContactForm from '../components/ContactForm'
import Button from '../../../shared/ui/Button'

export default function ContactsPage({ tenantId: tenantIdProp } = {}) {
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId

  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [page, setPage] = useState(1)

  const deferredSearch = useDeferredValue(search)

  const params = {
    page,
    limit: 20,
    ...(deferredSearch && { search: deferredSearch }),
    ...(tagFilter && { tag: tagFilter }),
  }

  const { data: contacts, isLoading } = useContacts(tenantId, params)
  const totalPages = contacts?.totalPages ?? 1

  const handleEdit = (c) => {
    setEditContact(c)
    setShowForm(true)
  }

  const handleClose = () => {
    setShowForm(false)
    setEditContact(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contacts?.total != null ? `${contacts.total} contactos` : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Nuevo contacto</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary w-64"
        />
        <input
          type="text"
          placeholder="Filtrar por etiqueta..."
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary w-48"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <ContactsTable contacts={contacts} isLoading={isLoading} onEdit={handleEdit} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40"
          >
            ‹ Anterior
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Siguiente ›
          </button>
        </div>
      )}

      {showForm && (
        <ContactForm
          tenantId={tenantId}
          contact={editContact}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
