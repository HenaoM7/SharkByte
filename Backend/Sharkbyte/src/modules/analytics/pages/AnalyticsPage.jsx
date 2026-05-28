import { useState } from "react"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts"
import {
  useAnalyticsOverview,
  useMessageVolume,
  useTenantGrowth,
  useTopTenants,
  useExportCsv,
  useCaptureSnapshot,
} from "../hooks"
import Badge from "../../../shared/ui/Badge"
import Spinner from "../../../shared/ui/Spinner"

const PLAN_COLORS = { enterprise: "#153959" }

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {[3, 6, 12].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={m === value ? "px-3 py-1 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm" : "px-3 py-1 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700"}
        >
          {m}M
        </button>
      ))}
    </div>
  )
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={active ? "px-4 py-2 text-sm font-medium rounded-lg bg-sb-primary text-white" : "px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"}
    >
      {label}
    </button>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm text-xs">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-medium">{p.value?.toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, color = "text-gray-800" }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className={color + " text-2xl font-bold"}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
function OverviewTab({ months }) {
  const { data: overview, isLoading: oLoad } = useAnalyticsOverview()
  const { data: topTenants = [], isLoading: tLoad } = useTopTenants(5)

  if (oLoad) return <div className="flex justify-center py-16"><Spinner /></div>

  const planDist = overview?.planDistribution ?? []
  const pieData = planDist.map((p) => ({
    name: p._id ?? "free",
    value: p.count,
    color: PLAN_COLORS[p._id] ?? "#6b7280",
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Tenants" value={overview?.totalTenants?.toLocaleString() ?? "—"} />
        <KpiCard label="Tenants Activos" value={overview?.activeTenants?.toLocaleString() ?? "—"} color="text-sb-primary" />
        <KpiCard label="Mensajes este mes" value={overview?.messagesThisMonth?.toLocaleString() ?? "—"} color="text-sb-primary" />
        <KpiCard label="Ingreso estimado" value={"$" + (overview?.estimatedRevenue?.toFixed(0) ?? "0")} color="text-sb-primary" sub="mensual" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución por plan</h3>
          {pieData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="55%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {pieData.map((e) => (
                  <div key={e.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                      <span className="text-sm text-gray-600 capitalize">{e.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 tenants (mensajes)</h3>
          {tLoad ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : topTenants.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos este mes</p>
          ) : (
            <div className="space-y-2">
              {topTenants.map((t, i) => (
                <div key={t.tenantId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.tenantName}</p>
                    <p className="text-xs text-gray-400">{t.planName}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{t.messagesUsed?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
function MessagesTab({ months }) {
  const { data: volumeData = [], isLoading } = useMessageVolume(months)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Volumen de mensajes por período</h3>
        {volumeData.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin datos históricos aún</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={volumeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="totalMessages" name="Mensajes" stroke="#153959" fill="#dde8f0" strokeWidth={2} />
              <Area type="monotone" dataKey="activeTenants" name="Tenants activos" stroke="#3b82f6" fill="#dbeafe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {volumeData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {["Período", "Mensajes", "Tokens", "Tenants activos"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {volumeData.map((d) => (
                <tr key={d.period}>
                  <td className="px-6 py-3 font-medium text-gray-700">{d.label}</td>
                  <td className="px-6 py-3 text-gray-600">{d.totalMessages?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-600">{d.totalTokens?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-600">{d.activeTenants}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TenantsTab({ months }) {
  const { data: growthData = [], isLoading } = useTenantGrowth(months)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  const totalNew = growthData.reduce((s, d) => s + (d.newTenants ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label={"Nuevos tenants (" + months + "M)"} value={totalNew} color="text-sb-primary" />
        <KpiCard label="Promedio mensual" value={(totalNew / months).toFixed(1)} sub="tenants/mes" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Nuevos tenants por mes</h3>
        {growthData.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="newTenants" name="Nuevos tenants" fill="#153959" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
function TopTenantsTab() {
  const { data: topTenants = [], isLoading } = useTopTenants(20)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      {topTenants.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">Sin datos de uso este mes</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Top tenants por uso este mes</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {["#", "Tenant", "Mensajes", "Tokens"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topTenants.map((t, i) => (
                <tr key={t.tenantId}>
                  <td className="px-6 py-3 text-xs font-bold text-gray-400">{i + 1}</td>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-800">{t.tenantName}</p>
                    <p className="text-xs text-gray-400">{t.tenantId}</p>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{t.messagesUsed?.toLocaleString()}</td>
                  <td className="px-6 py-3 text-gray-600">{t.tokensUsed?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
export default function AnalyticsPage() {
  const [tab, setTab] = useState("overview")
  const [months, setMonths] = useState(6)
  const exportCsv = useExportCsv()
  const captureSnapshot = useCaptureSnapshot()

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "messages", label: "Mensajes" },
    { key: "tenants", label: "Tenants" },
    { key: "top", label: "Top Tenants" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas históricas de la plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => captureSnapshot.mutate()}
            disabled={captureSnapshot.isPending}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {captureSnapshot.isPending ? "Capturando..." : "Capturar snapshot"}
          </button>
          <button
            onClick={() => exportCsv.mutate(months)}
            disabled={exportCsv.isPending}
            className="px-3 py-1.5 text-xs font-medium text-white bg-sb-primary rounded-lg hover:bg-sb-secondary disabled:opacity-50 transition-colors"
          >
            {exportCsv.isPending ? "Exportando..." : "↓ Exportar CSV"}
          </button>
          <PeriodSelector value={months} onChange={setMonths} />
        </div>
      </div>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <TabBtn key={t.key} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
        ))}
      </div>
      {tab === "overview" && <OverviewTab months={months} />}
      {tab === "messages" && <MessagesTab months={months} />}
      {tab === "tenants" && <TenantsTab months={months} />}
      {tab === "top" && <TopTenantsTab />}
    </div>
  )
}