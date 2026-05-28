import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { useDashboardStats, useOwnerDashboard, useTenants, PLAN_LABELS } from '../hooks'
import { useAuthStore } from '../../auth/store'
import Badge from '../../../shared/ui/Badge'
import Spinner from '../../../shared/ui/Spinner'
import SharedProgressBar from '../../../shared/ui/ProgressBar'

// ─── Shared components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, colorClass }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm text-xs">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────────

const QUICK_LINKS = (tenantId) => [
  {
    label: 'Mi negocio',
    desc: 'WhatsApp, configuración y estado',
    path: `/tenants/${tenantId}`,
    iconBg: 'bg-sb-primary/8',
    icon: (
      <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: 'Configuración de IA',
    desc: 'Personaliza tu asistente',
    path: `/tenants/${tenantId}/config`,
    iconBg: 'bg-sb-neutral/10',
    icon: (
      <svg className="w-5 h-5 text-sb-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: 'Planes y facturación',
    desc: 'Gestiona tu suscripción',
    path: `/tenants/${tenantId}`,
    iconBg: 'bg-green-50',
    icon: (
      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
]

function UsageCard({ label, used, max, icon }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-sb-primary/8 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-800">
            {max === -1 ? '∞' : used.toLocaleString()}
          </p>
        </div>
      </div>
      <SharedProgressBar used={used} max={max} />
    </div>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-sb-neutral">{label}</span>
      <div className="text-sm font-medium text-gray-800 text-right">{children}</div>
    </div>
  )
}

function OwnerDashboard({ tenantId }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedId, setSelectedId] = useState(tenantId || null)
  const { data: tenantsResp, isLoading: loadingTenants } = useTenants({ limit: 50, sortBy: 'createdAt', sortOrder: 'desc' })

  // Auto-seleccionar el primer tenant si user.tenantId es null
  useEffect(() => {
    if (!selectedId && tenantsResp?.data?.length) {
      setSelectedId(tenantsResp.data[0].tenantId)
    }
  }, [selectedId, tenantsResp])

  const { isLoading, tenant, usage, waConnected, sub, subStatus, planLabel, activePlanName, isPaidPlan, isActive } =
    useOwnerDashboard(selectedId)

  if (isLoading || (!selectedId && loadingTenants)) {
    return (
      <div className="flex justify-center items-center h-60">
        <Spinner />
      </div>
    )
  }

  // Sin tenants creados aún
  if (!selectedId && !loadingTenants && !tenantsResp?.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
        <p className="text-gray-500 text-sm">Aún no tienes negocios registrados.</p>
        <button
          onClick={() => navigate('/tenants')}
          className="px-5 py-2.5 bg-sb-primary text-white text-sm font-semibold rounded-lg hover:bg-sb-primary/90 transition-colors"
        >
          Crear mi primer negocio
        </button>
      </div>
    )
  }

  const { usedMsg, usedTok, maxMsg, maxTok } = usage
  const renewalDate = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null
  return (
    <div className="space-y-5">

      {/* Welcome header */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">
          {tenant?.name ?? 'Mi negocio'}
        </h1>
        <p className="text-sm text-sb-neutral mt-0.5">
          Resumen del estado de tu negocio.
        </p>
      </div>

      {/* Inactive banner */}
      {!isActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {activePlanName === 'pro' || activePlanName === 'enterprise'
                  ? 'Negocio inactivo'
                  : 'Cuenta pendiente de activación'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {activePlanName === 'pro' || activePlanName === 'enterprise'
                  ? 'Tu negocio tiene un plan activo pero está pausado. Actívalo para comenzar a recibir mensajes.'
                  : 'Activa tu plan para comenzar a usar el sistema de automatización.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/tenants/${selectedId}`)}
            className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg px-4 py-2 transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            {activePlanName === 'pro' || activePlanName === 'enterprise'
              ? 'Activar negocio →'
              : 'Activar plan →'}
          </button>
        </div>
      )}

      {/* KPI row: Plan + WhatsApp + Usage cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Plan activo */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${subStatus === 'pending' && !isPaidPlan ? 'bg-yellow-50' : 'bg-sb-primary/8'}`}>
              <svg className={`w-5 h-5 ${subStatus === 'pending' && !isPaidPlan ? 'text-yellow-600' : 'text-sb-primary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Plan activo</p>
              <p className={`text-lg font-bold truncate ${subStatus === 'pending' && !isPaidPlan ? 'text-yellow-700' : 'text-gray-800'}`}>
                {planLabel}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50">
            {subStatus === 'pending' && !isPaidPlan ? (
              <Badge variant="pending">Pago en proceso</Badge>
            ) : subStatus === 'authorized' || isPaidPlan ? (
              <Badge variant={`plan-${activePlanName}`}>{PLAN_LABELS[activePlanName] ?? activePlanName}</Badge>
            ) : (
              <Badge variant="plan-free">Free</Badge>
            )}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${waConnected ? 'bg-green-50' : 'bg-gray-50'}`}>
              <svg
                className={`w-5 h-5 ${waConnected ? 'text-green-600' : 'text-gray-400'}`}
                fill="currentColor" viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">WhatsApp</p>
              <p className={`text-lg font-bold ${waConnected ? 'text-green-700' : 'text-gray-500'}`}>
                {waConnected ? 'Conectado' : 'Desconectado'}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${waConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-400">
              {waConnected ? 'Recibiendo mensajes' : 'Sin conexión activa'}
            </span>
          </div>
        </div>

        {/* Mensajes */}
        <UsageCard
          label="Mensajes usados"
          used={usedMsg}
          max={maxMsg}
          icon={
            <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />

        {/* Tokens */}
        <UsageCard
          label="Tokens IA usados"
          used={usedTok}
          max={maxTok}
          icon={
            <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      {/* Info + Quick access */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Mi negocio — info card (wider) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-700">Mi negocio</h2>
            <button
              onClick={() => navigate(`/tenants/${selectedId}`)}
              className="text-xs text-sb-primary hover:text-sb-secondary font-medium transition-colors"
            >
              Ver detalle →
            </button>
          </div>
          <div className="mt-2">
            <InfoRow label="Nombre">{tenant?.name ?? '—'}</InfoRow>
            <InfoRow label="Teléfono WhatsApp">{tenant?.phone ?? '—'}</InfoRow>
            <InfoRow label="Estado">
              <Badge variant={isActive ? 'active' : 'inactive'}>
                {isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </InfoRow>
            {sub?.status && sub.status !== 'free' && (
              <InfoRow label="Suscripción">
                <Badge variant={
                  subStatus === 'authorized' ? `plan-${sub.planName}` :
                  isPaidPlan ? `plan-${activePlanName}` :
                  subStatus === 'pending' ? 'pending' : 'inactive'
                }>
                  {subStatus === 'authorized' ? (PLAN_LABELS[sub.planName] ?? sub.planName) :
                   isPaidPlan ? (PLAN_LABELS[activePlanName] ?? activePlanName) :
                   subStatus === 'pending'    ? 'Pago en proceso' :
                   subStatus === 'paused'     ? 'Pausada' : 'Cancelada'}
                </Badge>
              </InfoRow>
            )}
            {renewalDate && (
              <InfoRow label="Próxima renovación">
                <span className="text-sb-primary font-semibold">{renewalDate}</span>
              </InfoRow>
            )}
            {(!sub || sub.status === 'free') && !isPaidPlan && (
              <div className="mt-4">
                <button
                  onClick={() => navigate(`/tenants/${selectedId}`)}
                  className="w-full py-2.5 rounded-xl bg-sb-primary text-white text-sm font-semibold hover:bg-sb-secondary transition-colors"
                >
                  Activar suscripción
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Acceso rápido */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Acceso rápido</h2>
          <div className="space-y-1">
            {QUICK_LINKS(selectedId).map(({ label, desc, path, icon, iconBg }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-sb-bg transition-colors text-left group"
              >
                <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-sb-primary transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-sb-primary shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mis negocios — tabla resumen de todos los tenants del owner */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Mis negocios</h2>
            {!loadingTenants && (
              <p className="text-xs text-sb-neutral mt-0.5">
                {tenantsResp?.total ?? 0} negocio{(tenantsResp?.total ?? 0) !== 1 ? 's' : ''} registrado{(tenantsResp?.total ?? 0) !== 1 ? 's' : ''} · Clic en una fila para ver su resumen arriba
              </p>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Nombre', 'Teléfono', 'Plan', 'Estado', 'Mensajes', ''].map((h, i) => (
                  <th key={i} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingTenants ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Cargando...</td></tr>
              ) : !tenantsResp?.data?.length ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sin negocios registrados</td></tr>
              ) : (
                tenantsResp.data.map((t) => {
                  const isSelected = t.tenantId === selectedId
                  return (
                    <tr
                      key={t._id}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-sb-primary/5 border-l-2 border-l-sb-primary' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedId(t.tenantId)}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-sb-primary shrink-0" />
                          )}
                          <div>
                            <p className={`font-medium ${isSelected ? 'text-sb-primary' : 'text-gray-800'}`}>{t.name}</p>
                            <p className="text-xs text-gray-400">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">{t.phone}</td>
                      <td className="px-6 py-3.5">
                        <Badge variant={`plan-${t.plan?.name ?? 'free'}`}>
                          {PLAN_LABELS[t.plan?.name] ?? 'Free'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge variant={t.isActive ? 'active' : 'inactive'}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{t.messagesUsed ?? 0}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/tenants/${t.tenantId}`) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-sb-primary hover:bg-sb-primary/8 transition-colors"
                          title="Ver detalle"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const navigate = useNavigate()
  const { stats, isLoading } = useDashboardStats()
  const val = (n) => (isLoading ? '—' : n.toLocaleString())

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Negocios"
          value={val(stats.total)}
          colorClass="bg-gray-100"
          icon={
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Negocios Activos"
          value={val(stats.active)}
          colorClass="bg-sb-primary/8"
          icon={
            <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Con Suscripción"
          value={val(stats.paid)}
          colorClass="bg-sb-primary/8"
          icon={
            <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          }
        />
        <StatCard
          label="Ingresos est."
          value={isLoading ? '—' : `$${stats.estimatedRevenue.toLocaleString()}`}
          sub="mensual"
          colorClass="bg-sb-primary/10"
          icon={
            <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribución por plan</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Spinner /></div>
          ) : stats.planChartData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Sin datos</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={160}>
                <PieChart>
                  <Pie
                    data={stats.planChartData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value"
                  >
                    {stats.planChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {stats.planChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                      <span className="text-sm text-gray-600">{entry.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Uso de mensajes (negocios activos)</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Spinner /></div>
          ) : stats.usageChartData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Sin negocios activos</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats.usageChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="limite" name="Límite" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
                <Bar dataKey="usado" name="Usado" fill="#153959" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent tenants table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Últimos negocios registrados</h2>
          <button
            onClick={() => navigate('/tenants')}
            className="text-xs text-sb-primary hover:text-sb-secondary font-medium transition-colors"
          >
            Ver todos →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Nombre', 'Teléfono', 'Plan', 'Estado', 'Mensajes'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Cargando...</td></tr>
              ) : stats.recent.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Sin negocios registrados</td></tr>
              ) : (
                stats.recent.map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/tenants/${t.tenantId}`)}
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">{t.phone}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={`plan-${t.plan?.name ?? 'free'}`}>
                        {PLAN_LABELS[t.plan?.name] ?? 'Free'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={t.isActive ? 'active' : 'inactive'}>
                        {t.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{t.messagesUsed ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  if (user?.role === 'owner') return <OwnerDashboard tenantId={user.tenantId} />
  return <AdminDashboard />
}
