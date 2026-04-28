import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useTenant } from '../hooks'
import Badge from '../../../shared/ui/Badge'
import ConversationsPage from '../../conversations/pages/ConversationsPage'
import ContactsPage from '../../contacts/pages/ContactsPage'
import ContactDetailPage from '../../contacts/pages/ContactDetailPage'
import PipelinePage from '../../pipeline/pages/PipelinePage'
import OwnerSalesPage from '../../owner-sales/pages/OwnerSalesPage'
import AgendaPage from '../../agenda/pages/AgendaPage'
import IntegrationsPage from '../../integrations/pages/IntegrationsPage'

// ── Tab wrapper components ────────────────────────────────────────────────────

export function TenantConversationsTab() {
  const { tenantId } = useParams()
  return <ConversationsPage tenantId={tenantId} />
}

export function TenantCRMTab() {
  const { tenantId } = useParams()
  return <ContactsPage tenantId={tenantId} />
}

export function TenantContactDetailTab() {
  const { tenantId } = useParams()
  return (
    <ContactDetailPage
      tenantId={tenantId}
      backUrl={`/admin/tenants/${tenantId}/crm`}
    />
  )
}

export function TenantPipelineTab() {
  const { tenantId } = useParams()
  return <PipelinePage tenantId={tenantId} />
}

export function TenantSalesTab() {
  const { tenantId } = useParams()
  return <OwnerSalesPage tenantId={tenantId} />
}

export function TenantAgendaTab() {
  const { tenantId } = useParams()
  return <AgendaPage tenantId={tenantId} />
}

export function TenantIntegrationsTab() {
  const { tenantId } = useParams()
  return <IntegrationsPage tenantId={tenantId} />
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  active: 'active', inactive: 'inactive', suspended: 'disconnected',
  trial: 'plan-free', cancelled: 'inactive',
}
const STATUS_LABEL = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido',
  trial: 'Trial', cancelled: 'Cancelado',
}

const TABS = [
  { key: '',               label: 'Gestión' },
  { key: 'conversations',  label: 'Conversaciones' },
  { key: 'crm',            label: 'CRM' },
  { key: 'pipeline',       label: 'Pipeline' },
  { key: 'sales',          label: 'Ventas' },
  { key: 'agenda',         label: 'Agenda' },
  { key: 'integrations',   label: 'Integraciones' },
  { key: 'config',         label: 'Configuración' },
]

// ── Shell layout ──────────────────────────────────────────────────────────────

export default function TenantAdminShell() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: tenant, isLoading } = useTenant(tenantId)

  // Derive active tab from URL: /admin/tenants/:id[/tab[/...]]
  const segments = location.pathname.split('/')
  const activeTab = segments[4] ?? ''

  const status = tenant?.status ?? (tenant?.isActive ? 'active' : 'inactive')

  return (
    <div className="flex flex-col min-h-0 -mt-6 -mx-6">

      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 pt-4 pb-0 shrink-0">

        {/* Breadcrumb + tenant name */}
        <div className="flex items-center gap-2 mb-3 min-w-0">
          <button
            onClick={() => navigate('/admin/tenants')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tenants
          </button>
          <span className="text-gray-300 text-sm shrink-0">/</span>
          {isLoading ? (
            <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-800 truncate">{tenant?.name}</span>
              <span className="text-xs text-gray-400 font-mono shrink-0">{tenantId}</span>
              <Badge variant={STATUS_BADGE[status] ?? 'inactive'} className="shrink-0">
                {STATUS_LABEL[status] ?? status}
              </Badge>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={() => navigate(`/admin/tenants/${tenantId}${tab.key ? `/${tab.key}` : ''}`)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'border-sb-primary text-sb-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 pt-5 pb-6 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
