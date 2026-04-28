import { useState } from 'react'
import { useRules, useCreateRule, useUpdateRule, useToggleRule, useDeleteRule } from '../hooks'
import Badge from '../../../shared/ui/Badge'
import Spinner from '../../../shared/ui/Spinner'
import ConfirmModal from '../../../shared/ui/ConfirmModal'

const TRIGGER_LABELS = {
  keyword: 'Palabra clave',
  schedule: 'Horario',
  usage_limit: 'Límite de uso',
  inactivity: 'Inactividad',
}

const ACTION_LABELS = {
  auto_reply: 'Respuesta automática',
  notify_admin: 'Notificar admin',
  tag: 'Etiquetar',
  escalate: 'Escalar',
  webhook: 'Webhook',
}

function RuleFormModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState(rule ?? {
    tenantId: '',
    name: '',
    description: '',
    trigger: { type: 'keyword', keywords: [], matchMode: 'any' },
    action: { type: 'auto_reply', replyMessage: '' },
    isActive: true,
    priority: 1,
  })

  const setTrigger = (patch) => setForm((f) => ({ ...f, trigger: { ...f.trigger, ...patch } }))
  const setAction = (patch) => setForm((f) => ({ ...f, action: { ...f.action, ...patch } }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{rule ? 'Editar regla' : 'Nueva regla'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tenant ID *</label>
            <input
              value={form.tenantId}
              onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              placeholder="ej: tenant_abc123"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              placeholder="Ej: Responder saludo"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
            <input
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
            />
          </div>

          {/* Trigger */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disparador</h4>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select
                value={form.trigger.type}
                onChange={(e) => setTrigger({ type: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              >
                {Object.entries(TRIGGER_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {form.trigger.type === 'keyword' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Palabras clave (separadas por coma)
                  </label>
                  <input
                    value={(form.trigger.keywords ?? []).join(', ')}
                    onChange={(e) =>
                      setTrigger({ keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                    placeholder="hola, buenos dias, ayuda"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Modo de coincidencia</label>
                  <select
                    value={form.trigger.matchMode ?? 'any'}
                    onChange={(e) => setTrigger({ matchMode: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                  >
                    <option value="any">Cualquier palabra</option>
                    <option value="all">Todas las palabras</option>
                  </select>
                </div>
              </>
            )}

            {form.trigger.type === 'usage_limit' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Porcentaje de uso (0-100)
                </label>
                <input
                  type="number" min={0} max={100}
                  value={form.trigger.usagePercent ?? 80}
                  onChange={(e) => setTrigger({ usagePercent: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                />
              </div>
            )}

            {form.trigger.type === 'inactivity' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Días de inactividad</label>
                <input
                  type="number" min={1}
                  value={form.trigger.inactivityDays ?? 7}
                  onChange={(e) => setTrigger({ inactivityDays: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                />
              </div>
            )}
          </div>

          {/* Action */}
          <div className="border border-gray-100 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</h4>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
              <select
                value={form.action.type}
                onChange={(e) => setAction({ type: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              >
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {form.action.type === 'auto_reply' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mensaje de respuesta</label>
                <textarea
                  value={form.action.replyMessage ?? ''}
                  onChange={(e) => setAction({ replyMessage: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                  placeholder="Hola! Gracias por contactarnos..."
                />
              </div>
            )}

            {form.action.type === 'notify_admin' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email del admin</label>
                <input
                  value={form.action.notifyEmail ?? ''}
                  onChange={(e) => setAction({ notifyEmail: e.target.value })}
                  type="email"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                />
              </div>
            )}

            {form.action.type === 'tag' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Etiqueta</label>
                <input
                  value={form.action.tag ?? ''}
                  onChange={(e) => setAction({ tag: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                  placeholder="ej: urgente"
                />
              </div>
            )}

            {form.action.type === 'webhook' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">URL del webhook</label>
                <input
                  value={form.action.webhookUrl ?? ''}
                  onChange={(e) => setAction({ webhookUrl: e.target.value })}
                  type="url"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          {/* Priority + active */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridad (1 = mayor)</label>
              <input
                type="number" min={1}
                value={form.priority ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-sb-primary"
                />
                <span className="text-sm text-gray-700">Activa</span>
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 text-sm font-medium text-white bg-sb-primary rounded-lg hover:bg-sb-secondary"
          >
            {rule ? 'Guardar cambios' : 'Crear regla'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationPage() {
  const [filters, setFilters] = useState({ tenantId: '', isActive: '' })
  const [formModal, setFormModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const params = {}
  if (filters.tenantId) params.tenantId = filters.tenantId
  if (filters.isActive !== '') params.isActive = filters.isActive

  const { data, isLoading } = useRules(params)
  const rules = data?.data ?? []

  const createRule = useCreateRule()
  const updateRule = useUpdateRule()
  const toggleRule = useToggleRule()
  const deleteRule = useDeleteRule()

  const handleSave = (form) => {
    if (formModal === 'new') {
      createRule.mutate(form, { onSuccess: () => setFormModal(null) })
    } else {
      updateRule.mutate(
        { id: formModal._id, data: form },
        { onSuccess: () => setFormModal(null) },
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Automatización</h1>
          <p className="text-sm text-gray-500 mt-1">Reglas de automatización por tenant para n8n</p>
        </div>
        <button
          onClick={() => setFormModal('new')}
          className="px-4 py-2 text-sm font-medium text-white bg-sb-primary rounded-lg hover:bg-sb-secondary transition-colors"
        >
          + Nueva regla
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={filters.tenantId}
          onChange={(e) => setFilters((f) => ({ ...f, tenantId: e.target.value }))}
          placeholder="Filtrar por Tenant ID"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary w-56"
        />
        <select
          value={filters.isActive}
          onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
        >
          <option value="">Todas</option>
          <option value="true">Activas</option>
          <option value="false">Inactivas</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : rules.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">
            Sin reglas. Crea la primera con el botón de arriba.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Nombre', 'Tenant', 'Disparador', 'Acción', 'Prioridad', 'Ejecuciones', 'Estado', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((rule) => (
                  <tr key={rule._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{rule.name}</p>
                      {rule.description && (
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{rule.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-[120px]">
                      {rule.tenantId}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={`rule-${rule.trigger?.type}`}>
                        {TRIGGER_LABELS[rule.trigger?.type] ?? rule.trigger?.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={`action-${rule.action?.type}`}>
                        {ACTION_LABELS[rule.action?.type] ?? rule.action?.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-center">{rule.priority}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{rule.executions ?? 0}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRule.mutate(rule._id)}
                        disabled={toggleRule.isPending}
                        className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                          rule.isActive ? 'bg-sb-secondary' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                            rule.isActive ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFormModal(rule)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && data?.total > 0 && (
        <p className="text-xs text-gray-400">
          {data.total} regla{data.total !== 1 ? 's' : ''} en total
        </p>
      )}

      {/* Form Modal */}
      {formModal !== null && (
        <RuleFormModal
          rule={formModal === 'new' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar regla"
        message={`¿Seguro que quieres eliminar la regla "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteRule.isPending}
        onConfirm={() =>
          deleteRule.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) })
        }
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
