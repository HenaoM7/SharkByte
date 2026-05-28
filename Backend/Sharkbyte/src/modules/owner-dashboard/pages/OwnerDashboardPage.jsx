import { Link } from 'react-router-dom'
import { useAuthStore } from '../../auth/store'
import { useSales, useSalesStats, useGoogleStatus, useTenant } from '../../tenants/hooks'
import { useMonthlySales } from '../../tenants/salesMonthlyHook'
import { usePipelineBoard } from '../../pipeline/hooks'
import { useConversations } from '../../conversations/hooks'
import { useWhatsAppStatus } from '../../whatsapp/hooks'
import Badge from '../../../shared/ui/Badge'
import Spinner from '../../../shared/ui/Spinner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmt  = (n) => n != null ? `$${Number(n).toLocaleString('es-CO')}` : '—'
const fmtK = (n) => {
  if (n == null) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'
const STATUS_BADGE  = { confirmed: 'active', pending: 'inactive', cancelled: 'disconnected' }
const STATUS_LABEL  = { confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada' }

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'indigo', icon }) {
  const palette = {
    green:  'bg-green-50  text-green-600',
    indigo: 'bg-sb-primary/10 text-sb-primary',
    purple: 'bg-sb-primary/10 text-sb-primary',
    blue:   'bg-sb-primary/10 text-sb-primary',
    amber:  'bg-amber-50  text-amber-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${palette[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Revenue Tooltip ──────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-sb-primary font-bold">{fmt(payload[0]?.value)}</p>
      <p className="text-gray-400">{payload[0]?.payload?.count ?? 0} ventas</p>
    </div>
  )
}

// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ to, icon, label, color = 'indigo' }) {
  const cls = {
    indigo: 'bg-sb-primary hover:bg-sb-secondary text-white',
    green:  'bg-green-600  hover:bg-green-700  text-white',
    blue:   'bg-sb-primary hover:bg-sb-secondary text-white',
    gray:   'bg-gray-800   hover:bg-gray-900   text-white',
  }
  return (
    <Link to={to}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${cls[color]}`}>
      {icon}
      {label}
    </Link>
  )
}

// ─── Status Indicator ─────────────────────────────────────────────────────────
function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-gray-300'}`}/>
        <span className={`text-xs font-medium ${ok ? 'text-green-600' : 'text-gray-400'}`}>{value}</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenantId

  const { data: tenant                                 } = useTenant(tenantId)
  const { data: salesData,  isLoading: loadingSales   } = useSales(tenantId, { limit: 5 })
  const { data: stats,      isLoading: loadingStats   } = useSalesStats(tenantId)
  const { data: monthly,    isLoading: loadingMonthly } = useMonthlySales(tenantId)
  const { data: board                                  } = usePipelineBoard(tenantId)
  const { data: convData                               } = useConversations(tenantId)
  const { data: waStatus                               } = useWhatsAppStatus(tenantId)
  const { data: googleStatus                           } = useGoogleStatus(tenantId)

  const sales     = salesData?.data ?? []
  const pipeline  = board?.pipeline
  const deals     = board?.deals ?? []
  const openDeals = deals.filter((d) => d.status === 'open')
  const convAll   = convData?.data ?? []
  const convOpen  = convAll.filter((c) => c.status === 'open').length

  const pipelineValue = openDeals.reduce((s, d) => s + (d.value || 0), 0)

  // Smart state detection
  const isWaConnected     = waStatus?.status === 'open'
  const isGoogleConnected = googleStatus?.connected === true
  const hasData = (stats?.monthCount ?? 0) > 0 || openDeals.length > 0 || convOpen > 0

  // Full date header
  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const greetName = tenant?.name || user?.name || user?.email?.split('@')[0] || 'tu negocio'

  // Pipeline stages list
  const stages = (pipeline?.stages ?? []).map((s) => ({
    id:    s.id,
    name:  s.name,
    count: deals.filter((d) => d.stageId === s.id && d.status === 'open').length,
    color: s.color ?? '#6366f1',
  }))

  // Recent activity feed (recent sales + open conversations merged)
  const activityItems = [
    ...sales.slice(0, 3).map((s) => ({
      id:    s._id,
      type:  'sale',
      label: s.clientName || s.clientPhone || 'Cliente',
      sub:   s.productName || '—',
      value: fmt(s.totalAmount),
      date:  fmtDate(s.confirmedAt),
      ok:    s.status === 'confirmed',
    })),
    ...convAll.slice(0, 2).map((c) => ({
      id:    c._id,
      type:  'conv',
      label: c.contactName || c.contactPhone || 'Contacto',
      sub:   c.lastMessage?.slice(0, 40) || 'Conversación activa',
      value: null,
      date:  fmtDate(c.lastMessageAt),
      ok:    c.status === 'open',
    })),
  ].slice(0, 5)

  // ── Icons ────────────────────────────────────────────────────────────────────
  const IcoDollar = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
  const IcoCart = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
  const IcoPipe = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
  const IcoChat = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
  const IcoUsers = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )

  return (
    <div className="space-y-6">

      {/* ── 1. Encabezado inteligente ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido a SharkByte
          </h1>
          <p className="text-base font-medium text-sb-primary mt-0.5">{greetName}</p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{today}</p>
        </div>
        {!hasData && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-xs text-amber-700 font-medium">Negocio nuevo — comienza conectando</span>
          </div>
        )}
      </div>

      {/* ── 2. KPIs ──────────────────────────────────────────────────────────── */}
      {loadingStats ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <KpiCard
            label="Ingresos del mes"
            value={fmtK(stats?.monthRevenue)}
            sub={(stats?.monthRevenue ?? 0) === 0 ? 'Sin ventas registradas aún' : 'ventas confirmadas'}
            color="green"
            icon={<IcoDollar />}
          />
          <KpiCard
            label="Ventas"
            value={stats?.monthCount ?? 0}
            sub={`Hoy: ${stats?.today ?? 0}`}
            color="indigo"
            icon={<IcoCart />}
          />
          <KpiCard
            label="Pipeline activo"
            value={fmtK(pipelineValue)}
            sub={`${openDeals.length} ${openDeals.length === 1 ? 'oportunidad' : 'oportunidades'} en curso`}
            color="purple"
            icon={<IcoPipe />}
          />
          <KpiCard
            label="Conversaciones"
            value={convOpen}
            sub={convOpen === 0 ? 'Sin mensajes recientes' : `${convAll.filter(c => c.status === 'escalated').length} escaladas`}
            color="blue"
            icon={<IcoChat />}
          />
          <KpiCard
            label="Clientes"
            value={stats?.uniqueClients ?? 0}
            sub={`${stats?.uniqueClients ?? 0} clientes con compras`}
            color="amber"
            icon={<IcoUsers />}
          />
        </div>
      )}

      {/* ── 3. Acciones rápidas ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Acciones rápidas</p>
        <div className="flex flex-wrap gap-3">
          <QuickAction to="/app/integrations" color="green" label="Conectar canal" icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          }/>
          <QuickAction to="/app/crm" color="blue" label="Agregar cliente" icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
            </svg>
          }/>
          <QuickAction to="/app/sales" color="indigo" label="Crear venta" icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
          }/>
          <QuickAction to="/app/settings" color="gray" label="Configurar automatización" icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          }/>
        </div>
      </div>

      {/* ── 4. Mensaje guía (solo si negocio vacío) ──────────────────────────── */}
      {!hasData && !loadingStats && (
        <div className="bg-gradient-to-r from-sb-primary/10 to-sb-primary/5 border border-sb-primary/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-sb-primary/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-sb-dark mb-1">Tu negocio aún no tiene actividad</p>
              <p className="text-xs text-sb-primary leading-relaxed">
                Conecta un canal o registra tu primera venta para comenzar a ver resultados.<br/>
                Usa las acciones rápidas de arriba para empezar en menos de 2 minutos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 5 & 6. Ingresos + Pipeline ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">Ingresos</h2>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 6 meses</p>
            </div>
            {monthly?.length > 0 && (
              <span className="text-xs font-semibold text-sb-primary">
                {fmtK(monthly.reduce((s, m) => s + (m.revenue || 0), 0))} total
              </span>
            )}
          </div>
          {loadingMonthly ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !monthly?.length ? (
            <div className="flex flex-col items-center justify-center h-44 gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Aún no hay ventas registradas</p>
                <p className="text-xs text-gray-400 mt-0.5">Comienza registrando tu primera venta</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={55}/>
                <Tooltip content={<RevenueTooltip />}/>
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#revGrad)" dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pipeline stages list */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Estado del pipeline</h2>
            <Link to="/app/pipeline" className="text-xs text-sb-primary hover:underline">Ver →</Link>
          </div>
          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 gap-2">
              <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              <p className="text-xs text-gray-400 text-center">Sin etapas configuradas</p>
            </div>
          ) : (
            <div className="space-y-1">
              {stages.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }}/>
                    <span className="text-sm text-gray-700 truncate max-w-[140px]">{s.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${s.count > 0 ? 'text-sb-primary' : 'text-gray-300'}`}>
                    {s.count}
                  </span>
                </div>
              ))}
              {stages.length > 0 && (
                <div className="pt-2 mt-2 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                  <span>Total abiertos</span>
                  <span className="font-semibold text-gray-700">{openDeals.length}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 7 & 8. Ventas recientes + Estado del sistema ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent sales */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Ventas recientes</h2>
            <Link to="/app/sales" className="text-xs text-sb-primary hover:underline">Ver todas →</Link>
          </div>
          {loadingSales ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">No hay ventas registradas aún</p>
                <p className="text-xs text-gray-400 mt-0.5">Comienza creando una venta o conectando un canal de comunicación</p>
              </div>
              <Link to="/app/sales" className="text-xs text-sb-primary font-medium hover:underline mt-1">
                Crear primera venta →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sales.map((s) => (
                <div key={s._id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-sb-primary/15 flex items-center justify-center flex-shrink-0 text-sb-primary text-xs font-bold">
                    {(s.clientName || s.clientPhone || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.clientName || s.clientPhone || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{s.productName || '—'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800">{fmt(s.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{fmtDate(s.confirmedAt)}</p>
                  </div>
                  <Badge type={STATUS_BADGE[s.status] || 'inactive'}>{STATUS_LABEL[s.status] || s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Estado del sistema</h2>
          <div className="space-y-0">
            <StatusRow
              label="Canales"
              value={isWaConnected ? 'WhatsApp activo' : 'No conectados'}
              ok={isWaConnected}
            />
            <StatusRow
              label="Agenda"
              value={isGoogleConnected ? 'Google conectado' : 'No configurada'}
              ok={isGoogleConnected}
            />
            <StatusRow
              label="Automatizaciones"
              value={(stats?.monthCount ?? 0) > 0 ? 'Activas' : 'Inactivas'}
              ok={(stats?.monthCount ?? 0) > 0}
            />
          </div>
          <Link to="/app/integrations"
            className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-sb-primary border border-sb-primary/30 rounded-xl hover:bg-sb-primary/10 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Gestionar integraciones
          </Link>
        </div>
      </div>

      {/* ── 9. Actividad reciente ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Actividad reciente</h2>
          <Link to="/app/conversations" className="text-xs text-sb-primary hover:underline">Ver conversaciones →</Link>
        </div>
        {activityItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-sm text-gray-400 font-medium">No hay actividad reciente aún</p>
            <p className="text-xs text-gray-300">Aquí verás mensajes, ventas y acciones en tiempo real</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                  ${item.type === 'sale' ? 'bg-sb-primary/15 text-sb-primary' : 'bg-green-100 text-green-600'}`}>
                  {item.type === 'sale' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.label}</p>
                  <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {item.value && <p className="text-sm font-semibold text-gray-800">{item.value}</p>}
                  <p className="text-xs text-gray-400">{item.date}</p>
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.ok ? 'bg-green-400' : 'bg-gray-200'}`}/>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
