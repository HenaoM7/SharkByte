import { useState } from 'react'
import { useCreateDeal, useUpdateDeal, useDeleteDeal } from '../hooks'
import Button from '../../../shared/ui/Button'

export default function DealModal({ tenantId, stages, deal, defaultStageId, onClose }) {
  const isEdit = !!deal
  const [form, setForm] = useState({
    title: deal?.title ?? '',
    value: deal?.value ?? '',
    contactPhone: deal?.contactPhone ?? '',
    notes: deal?.notes ?? '',
    stageId: deal?.stageId ?? defaultStageId ?? stages?.[0]?.id ?? '',
  })
  const [msg, setMsg] = useState(null)

  const createDeal = useCreateDeal()
  const updateDeal = useUpdateDeal(tenantId)
  const deleteDeal = useDeleteDeal(tenantId)
  const saving = createDeal.isPending || updateDeal.isPending

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, tenantId, value: Number(form.value) || 0 }
    const action = isEdit
      ? updateDeal.mutateAsync({ id: deal._id, data })
      : createDeal.mutateAsync(data)
    action
      .then(() => { setMsg({ type: 'ok', text: 'Guardado' }); setTimeout(onClose, 400) })
      .catch(() => setMsg({ type: 'err', text: 'Error al guardar' }))
  }

  const handleWon = () => {
    updateDeal.mutateAsync({ id: deal._id, data: { status: 'won' } }).then(onClose).catch(() => {})
  }
  const handleLost = () => {
    updateDeal.mutateAsync({ id: deal._id, data: { status: 'lost' } }).then(onClose).catch(() => {})
  }
  const handleDelete = () => {
    if (window.confirm('¿Eliminar este deal?')) {
      deleteDeal.mutateAsync(deal._id).then(onClose).catch(() => {})
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{isEdit ? 'Editar deal' : 'Nuevo deal'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Título <span className="text-red-400">*</span></label>
            <input required value={form.title} onChange={set('title')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (COP)</label>
              <input type="number" min="0" value={form.value} onChange={set('value')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Etapa</label>
              <select value={form.stageId} onChange={set('stageId')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary">
                {(stages || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono contacto</label>
            <input value={form.contactPhone} onChange={set('contactPhone')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary" placeholder="573001234567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sb-primary resize-none" />
          </div>
          {msg && <p className={`text-xs ${msg.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving} className="flex-1">
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
            {isEdit && (
              <>
                <button type="button" onClick={handleWon} className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100">
                  Ganado
                </button>
                <button type="button" onClick={handleLost} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100">
                  Perdido
                </button>
                <button type="button" onClick={handleDelete} className="text-xs text-gray-400 hover:text-red-500 px-2" title="Eliminar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
