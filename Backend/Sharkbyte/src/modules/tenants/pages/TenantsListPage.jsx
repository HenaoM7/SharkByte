import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenants, useCreateTenant } from '../hooks'
import { useDebounce } from '../../../shared/hooks/useDebounce'
import { useAuthStore } from '../../auth/store'
import Badge from '../../../shared/ui/Badge'
import ProgressBar from '../../../shared/ui/ProgressBar'
import Modal from '../../../shared/ui/Modal'
import Button from '../../../shared/ui/Button'
import Pagination from '../../../shared/ui/Pagination'
import TableSkeleton from '../../../shared/ui/TableSkeleton'
import TenantForm from '../components/TenantForm'
import { useToast } from '../../../shared/hooks/useToast'
import { parseApiError } from '../../../shared/api/client'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'suspended', label: 'Suspendidos' },
  { value: 'trial', label: 'Trial' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Más recientes' },
  { value: 'name', label: 'Nombre A→Z' },
  { value: 'messagesUsed', label: 'Mayor uso' },
]

export default function TenantsListPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [modalOpen, setModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const queryParams = {
    page,
    limit: 20,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter && { status: statusFilter }),
    sortBy,
    sortOrder: 'desc',
  }

  const { data, isLoading } = useTenants(queryParams)
  const createTenant = useCreateTenant()

  const tenants = data?.data ?? []
  const pagination = { page: data?.page ?? 1, pages: data?.pages ?? 1, total: data?.total ?? 0, limit: 20 }

  const handleSearchChange = useCallback((e) => { setSearch(e.target.value); setPage(1) }, [])
  const handleFilterChange = useCallback((val) => { setStatusFilter(val); setPage(1) }, [])

  const handleCreate = async (formData) => {
    try {
      await createTenant.mutateAsync({ ...formData, planName: 'enterprise' })
      setModalOpen(false)
      toast.success('Tenant creado correctamente')
    } catch (err) {
      toast.error(parseApiError(err).message)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">
        {isOwner ? 'Mis Tenants' : 'Todos los Tenants'}
      </h1>

      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary"
          >
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sb-primary"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <Button onClick={() => setModalOpen(true)} className="shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Tenant
        </Button>
      </div>

      {!isLoading && (
        <p className="text-xs text-gray-500">
          {pagination.total} tenant{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
        </p>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Tenant', 'Teléfono', 'Plan', 'Estado', 'Instancia', 'Uso / mes', 'Acciones'].map((h) => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <TableSkeleton rows={8} cols={7} />
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <p className="text-gray-400 text-sm">Sin resultados</p>
                  {(search || statusFilter) && (
                    <button
                      onClick={() => { setSearch(''); setStatusFilter(''); setPage(1) }}
                      className="text-xs text-sb-primary hover:text-sb-secondary mt-1"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              tenants.map((t) => {
                const max = t.plan?.maxMessages ?? 100
                const used = t.messagesUsed ?? 0
                const inst = t.evolutionInstance
                return (
                  <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">{t.phone}</td>
                    <td className="px-6 py-3.5">
                      {(() => {
                        const planName = t.plan?.name ?? 'free'
                        const planLabel = planName === 'enterprise' ? 'Enterprise' : planName === 'pro' ? 'Pro' : planName === 'free' ? 'Free' : planName
                        return <Badge variant={`plan-${planName}`}>{planLabel}</Badge>
                      })()}
                    </td>
                    <td className="px-6 py-3.5">
                      {(() => {
                        const hasWhatsApp = !!(
                          inst?.instanceName?.trim() ||
                          (inst?.apiUrl?.trim() && inst?.apiKey?.trim())
                        )
                        if (t.isActive && !hasWhatsApp)
                          return <Badge variant="no-credentials">Sin WhatsApp</Badge>
                        return (
                          <Badge variant={t.isActive ? 'active' : 'inactive'}>
                            {t.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-3.5">
                      {inst?.instanceName
                        ? <Badge variant={inst.status === 'connected' ? 'connected' : 'disconnected'}>{inst.instanceName}</Badge>
                        : <span className="text-xs text-gray-400">Sin vincular</span>
                      }
                    </td>
                    <td className="px-6 py-3.5 min-w-36">
                      <ProgressBar used={used} max={max === -1 ? -1 : max} />
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() => navigate(`/admin/tenants/${t.tenantId}`)}
                        className="text-xs font-medium text-sb-primary hover:text-sb-secondary transition-colors"
                      >
                        Ver →
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination {...pagination} onPageChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Tenant">
        <TenantForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          loading={createTenant.isPending}
        />
      </Modal>
    </div>
  )
}
