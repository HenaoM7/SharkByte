import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../auth/store'
import { agendaApi } from '../api'
import Spinner from '../../../shared/ui/Spinner'
import Badge from '../../../shared/ui/Badge'

const STATUS_BADGE = { scheduled: 'inactive', confirmed: 'active', cancelled: 'disconnected', completed: 'active' }
const STATUS_LABEL = { scheduled: 'Agendada', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' }
const STATUS_OPTS = ['', 'scheduled', 'confirmed', 'cancelled', 'completed']
const STATUS_FILTER_LABEL = { '': 'Todas', scheduled: 'Agendadas', confirmed: 'Confirmadas', cancelled: 'Canceladas', completed: 'Completadas' }

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDateOnly(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })
}
function fmtTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
function isToday(d) {
  if (!d) return false
  const dt = new Date(d)
  const now = new Date()
  return dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
}
function isUpcoming(d) {
  return d && new Date(d) > new Date()
}

function KpiCard({ label, value, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-sb-primary/10 text-sb-primary border-sb-primary/20',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    blue: 'bg-sb-primary/10 text-sb-primary border-sb-primary/20',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function AgendaPage({ tenantId: tenantIdProp } = {}) {
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('list') // 'list' | 'today'

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', tenantId, statusFilter],
    queryFn: () => agendaApi.getAppointments(tenantId, { limit: 100, ...(statusFilter && { status: statusFilter }) }),
    enabled: !!tenantId,
    select: (res) => res.data,
    refetchInterval: 60000,
  })

  const appointments = (data?.data ?? []).filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return a.clientName?.toLowerCase().includes(q) || a.clientPhone?.includes(q) || a.reason?.toLowerCase().includes(q)
  })

  const totalAll = data?.total ?? 0
  const todayCount = (data?.data ?? []).filter((a) => isToday(a.appointmentDateTime)).length
  const upcomingCount = (data?.data ?? []).filter((a) => isUpcoming(a.appointmentDateTime) && a.status !== 'cancelled').length
  const confirmedCount = (data?.data ?? []).filter((a) => a.status === 'confirmed').length

  // Group by date for list view
  const grouped = appointments.reduce((acc, apt) => {
    const key = apt.appointmentDateTime ? new Date(apt.appointmentDateTime).toDateString() : 'Sin fecha'
    if (!acc[key]) acc[key] = []
    acc[key].push(apt)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(a) - new Date(b))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agenda</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestión de citas y agendamientos de tu negocio</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total citas" value={totalAll} color="indigo" />
        <KpiCard label="Hoy" value={todayCount} color="blue" />
        <KpiCard label="Próximas" value={upcomingCount} color="green" />
        <KpiCard label="Confirmadas" value={confirmedCount} color="amber" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por cliente o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-sb-primary w-56"
          />
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${statusFilter === s ? 'bg-sb-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {STATUS_FILTER_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs rounded-lg ${view === 'list' ? 'bg-sb-primary text-white' : 'bg-gray-100 text-gray-500'}`}>Lista</button>
            <button onClick={() => setView('today')} className={`px-3 py-1.5 text-xs rounded-lg ${view === 'today' ? 'bg-sb-primary text-white' : 'bg-gray-100 text-gray-500'}`}>Hoy</button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No hay citas {statusFilter ? `con estado "${STATUS_FILTER_LABEL[statusFilter]}"` : 'registradas'}</p>
          <p className="text-xs text-gray-400 mt-1">Las citas creadas por tus flujos de WhatsApp aparecerán aquí automáticamente</p>
        </div>
      ) : view === 'today' ? (
        /* Today view */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-sb-primary/10">
            <h2 className="text-sm font-semibold text-sb-dark">
              Citas de hoy — {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
          </div>
          {appointments.filter((a) => isToday(a.appointmentDateTime)).length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">Sin citas para hoy</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {appointments.filter((a) => isToday(a.appointmentDateTime)).map((apt) => (
                <AppointmentRow key={apt._id} apt={apt} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grouped list view */
        <div className="space-y-4">
          {sortedDates.map((dateKey) => (
            <div key={dateKey} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className={`px-6 py-3 border-b flex items-center gap-3 ${
                dateKey === new Date().toDateString()
                  ? 'bg-sb-primary/10 border-sb-primary/20'
                  : new Date(dateKey) < new Date()
                  ? 'bg-gray-50 border-gray-100'
                  : 'bg-white border-gray-50'
              }`}>
                <span className="text-xs font-semibold text-gray-700">
                  {dateKey === new Date().toDateString() ? 'HOY · ' : ''}{fmtDateOnly(new Date(dateKey))}
                </span>
                <span className="text-xs text-gray-400">{grouped[dateKey].length} cita{grouped[dateKey].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {grouped[dateKey].map((apt) => <AppointmentRow key={apt._id} apt={apt} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AppointmentRow({ apt }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
      {/* Time */}
      <div className="w-14 text-center flex-shrink-0">
        <p className="text-sm font-bold text-gray-800">{fmtTime(apt.appointmentDateTime)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">hs</p>
      </div>
      {/* Color line */}
      <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
        apt.status === 'confirmed' ? 'bg-green-400' :
        apt.status === 'cancelled' ? 'bg-red-300' :
        apt.status === 'completed' ? 'bg-gray-300' : 'bg-sb-primary'
      }`} />
      {/* Client */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">{apt.clientName || '—'}</p>
        <p className="text-xs text-gray-400">{apt.clientPhone} {apt.reason ? `· ${apt.reason}` : ''}</p>
      </div>
      {/* Notes */}
      {apt.notes && (
        <p className="text-xs text-gray-400 truncate max-w-[180px] hidden md:block">{apt.notes}</p>
      )}
      {/* Status */}
      <Badge type={STATUS_BADGE[apt.status] || 'inactive'}>
        {STATUS_LABEL[apt.status] || apt.status}
      </Badge>
    </div>
  )
}
