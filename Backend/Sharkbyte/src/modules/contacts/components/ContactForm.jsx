import { useState } from 'react'
import { useCreateContact, useUpdateContact } from '../hooks'
import Button from '../../../shared/ui/Button'

export default function ContactForm({ tenantId, contact, onClose }) {
  const isEdit = !!contact
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    notes: contact?.notes ?? '',
    tags: (contact?.tags ?? []).join(', '),
  })
  const [msg, setMsg] = useState(null)

  const createContact = useCreateContact()
  const updateContact = useUpdateContact()
  const saving = createContact.isPending || updateContact.isPending

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      tenantId,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    }
    const action = isEdit
      ? updateContact.mutateAsync({ id: contact._id, data })
      : createContact.mutateAsync(data)

    action
      .then(() => { setMsg({ type: 'ok', text: 'Guardado' }); setTimeout(onClose, 600) })
      .catch(() => setMsg({ type: 'err', text: 'Error al guardar' }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Editar contacto' : 'Nuevo contacto'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <input value={form.name} onChange={set('name')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono <span className="text-red-400">*</span></label>
            <input required value={form.phone} onChange={set('phone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" placeholder="573001234567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={form.email} onChange={set('email')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Etiquetas (separadas por coma)</label>
            <input value={form.tags} onChange={set('tags')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" placeholder="cliente, vip, pendiente" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary resize-none" />
          </div>
          {msg && (
            <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              {isEdit ? 'Guardar cambios' : 'Crear contacto'}
            </Button>
            <button type="button" onClick={onClose} className="flex-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg py-2">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
