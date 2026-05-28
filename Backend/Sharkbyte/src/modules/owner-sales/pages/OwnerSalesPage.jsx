import { useState } from 'react'
import { useAuthStore } from '../../auth/store'
import { useSales, useSalesStats } from '../../tenants/hooks'
import { useMonthlySales } from '../../tenants/salesMonthlyHook'
import Badge from '../../../shared/ui/Badge'
import Spinner from '../../../shared/ui/Spinner'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const STATUS_BADGE = { confirmed: 'active', pending: 'inactive', cancelled: 'disconnected' }
const STATUS_LABEL = { confirmed: 'Confirmada', pending: 'Pendiente', cancelled: 'Cancelada' }
const STATUS_OPTS = ['', 'confirmed', 'pending', 'cancelled']
const STATUS_FILTER_LABEL = { '': 'Todos', confirmed: 'Confirmadas', pending: 'Pendientes', cancelled: 'Canceladas' }

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-CO')}` : '—'
const fmtK = (n) => {
  if (n == null) return '—'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${n}`
}
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—'

function KpiCard({ label, value, sub, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-sb-primary/10 text-sb-primary border-sb-primary/20',
    green: 'bg-green-50 text-green-700 border-green-100',
    blue: 'bg-sb-primary/10 text-sb-primary border-sb-primary/20',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  )
}

function RevTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-sb-primary font-bold">{fmt(payload[0]?.value)}</p>
      <p className="text-gray-400">{payload[0]?.payload?.count ?? 0} ventas</p>
    </div>
  )
}

export default function OwnerSalesPage({ tenantId: tenantIdProp } = {}) {
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const params = { limit: 20, page, ...(statusFilter && { status: statusFilter }) }
  const { data: salesData, isLoading: loadingSales } = useSales(tenantId, params)
  const { data: stats, isLoading: loadingStats } = useSalesStats(tenantId)
  const { data: monthly, isLoading: loadingMonthly } = useMonthlySales(tenantId)

  const allSales = salesData?.data ?? []
  const totalPages = salesData?.totalPages ?? 1
  const total = salesData?.total ?? 0

  const sales = search
    ? allSales.filter((s) =>
        s.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        s.clientPhone?.includes(search) ||
        s.productName?.toLowerCase().includes(search.toLowerCase())
      )
    : allSales

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Panel comercial completo de tu negocio</p>
        </div>
      </div>

      {/* KPIs */}
      {loadingStats ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Ingresos del mes" value={fmtK(stats?.monthRevenue)} sub="confirmadas" color="green" />
          <KpiCard label="Ventas del mes" value={stats?.monthCount ?? 0} sub={`${stats?.today ?? 0} hoy`} color="indigo" />
          <KpiCard label="Clientes únicos" value={stats?.uniqueClients ?? 0} sub="total histórico" color="blue" />
          <KpiCard label="Ticket promedio" value={fmtK(stats?.monthCount > 0 ? (stats?.monthRevenue / stats?.monthCount) : 0)} sub="este mes" color="amber" />
        </div>
      )}

      {/* Revenue chart + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Tendencia de ingresos</h2>
            <span className="text-xs text-gray-400">Últimos 6 meses</span>
          </div>
          {loadingMonthly ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : !monthly?.length ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">Sin datos aún</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={55} />
                <Tooltip content={<RevTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#sg)" dot={{ fill: '#6366f1', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {stats?.topProducts?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Productos más vendidos</h2>
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => {
                const max = stats.topProducts[0]?.count || 1
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium truncate max-w-[70%]">{p.name || 'Sin nombre'}</span>
                      <span className="text-gray-400 flex-shrink-0">×{p.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full" style={{ width: `${Math.round((p.count / max) * 100)}%`, backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa'][i] || '#6366f1' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-50 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-700 mr-auto">
            Historial de ventas {total > 0 && <span className="text-gray-400 font-normal">({total})</span>}
          </h2>
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar cliente o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sb-primary w-52"
          />
          {/* Status filter */}
          <div className="flex gap-1">
            {STATUS_OPTS.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${statusFilter === s ? 'bg-sb-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {STATUS_FILTER_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {loadingSales ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {statusFilter || search ? 'No hay ventas con estos filtros' : 'No hay ventas registradas aún.'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Cliente</th>
                    <th className="px-6 py-3 text-left">Producto</th>
                    <th className="px-6 py-3 text-left">Cantidad</th>
                    <th className="px-6 py-3 text-left">Total</th>
                    <th className="px-6 py-3 text-left">Estado</th>
                    <th className="px-6 py-3 text-left">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-800">{sale.clientName || '—'}</p>
                        <p className="text-xs text-gray-400">{sale.clientPhone}</p>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-gray-700">{sale.productName || '—'}</p>
                        {sale.productDetails && <p className="text-xs text-gray-400 truncate max-w-[200px]">{sale.productDetails}</p>}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-center">{sale.quantity ?? 1}</td>
                      <td className="px-6 py-3 font-semibold text-gray-800">{fmt(sale.totalAmount)}</td>
                      <td className="px-6 py-3">
                        <Badge type={STATUS_BADGE[sale.status] || 'inactive'}>
                          {STATUS_LABEL[sale.status] || sale.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{fmtDate(sale.confirmedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 py-4 border-t border-gray-50">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
                <span className="px-3 py-1.5 text-xs text-gray-500">Pág {page} de {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
