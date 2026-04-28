import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  useTenant,
  useTenantUsage,
  useUpdateTenantPlan,
  useActivateTenant,
  useDeactivateTenant,
  useUpdateTenantInstance,
  useUpdateTenantStatus,
  useSales,
  useSalesStats,
  useHardDeleteTenant,
} from '../hooks'
import { useAdminActivate, useCreateCheckout, useSubscription } from '../../billing/hooks'
import Badge from '../../../shared/ui/Badge'
import ProgressBar from '../../../shared/ui/ProgressBar'
import Button from '../../../shared/ui/Button'
import Spinner from '../../../shared/ui/Spinner'
import ConfirmModal from '../../../shared/ui/ConfirmModal'
import { useToast } from '../../../shared/hooks/useToast'
import { nextMonthReset } from '../../../shared/utils/formatters'
import { useAuthStore } from '../../auth/store'
import WhatsAppConnectionCard from '../../whatsapp/components/WhatsAppConnectionCard'
import { useWhatsAppStatus } from '../../whatsapp/hooks'

function Card({ title, children, className }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-6 ${className ?? ''}`}>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  )
}

const STATUS_LABELS = {
  active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido',
  trial: 'Trial', cancelled: 'Cancelado',
}
const STATUS_BADGE = {
  active: 'active', inactive: 'inactive', suspended: 'disconnected',
  trial: 'plan-free', cancelled: 'inactive',
}
const PLAN_LABELS = {
  pro:        'Plan Mensual',
  enterprise: 'Plan Anual',
  free:       'Free',
}

const PLAN_OPTIONS = [
  { key: 'pro',        label: 'Mensual', price: '$999.998/mes',   badge: null },
  { key: 'enterprise', label: 'Anual',   price: '$9.999.998/año', badge: '~2 meses gratis' },
]

const SUB_BADGE = {
  authorized: 'active',
  pending:    'trial',
  paused:     'inactive',
  cancelled:  'inactive',
  free:       'inactive',
}
const SUB_LABEL = {
  authorized: 'Activa',
  pending:    'Pago en proceso',
  paused:     'Pausada',
  cancelled:  'Cancelada',
  free:       'Sin suscripción',
}

export default function TenantDetailPage() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'

  const { data: tenant, isLoading: loadingTenant } = useTenant(tenantId)
  const { data: usage } = useTenantUsage(tenantId)
  const { data: waStatus } = useWhatsAppStatus(tenantId)
  const { data: sub } = useSubscription(tenantId)
  const { data: salesData } = useSales(tenantId)
  const { data: salesStats } = useSalesStats(tenantId)
  const updatePlan     = useUpdateTenantPlan()
  const adminActivate  = useAdminActivate(tenantId)
  const checkout       = useCreateCheckout()
  const activate       = useActivateTenant()
  const deactivate     = useDeactivateTenant()
  const updateInstance = useUpdateTenantInstance()
  const updateStatus   = useUpdateTenantStatus()

  const [confirmPlan, setConfirmPlan]         = useState(false)
  const [confirmCheckout, setConfirmCheckout] = useState(null) // planName a contratar
  const [selectedPlan, setSelectedPlan]       = useState('enterprise')
  const [instanceName, setInstanceName]     = useState('')
  const [instanceApiUrl, setInstanceApiUrl] = useState('')
  const [instanceApiKey, setInstanceApiKey] = useState('')
  const [instMsg, setInstMsg]               = useState(null)
  const [confirmActivate, setConfirmActivate] = useState(false)
  const [confirmSuspend, setConfirmSuspend]   = useState(false)
  const [confirmHardDelete, setConfirmHardDelete] = useState(false)
  const [hardDeleteInput, setHardDeleteInput]     = useState('')
  const hardDelete = useHardDeleteTenant()

  useEffect(() => {
    if (tenant) {
      setInstanceName(tenant.evolutionInstance?.instanceName ?? '')
      setInstanceApiUrl(tenant.evolutionInstance?.apiUrl ?? '')
      setInstanceApiKey(tenant.evolutionInstance?.apiKey ?? '')
      if (tenant.plan?.name === 'enterprise') setSelectedPlan('enterprise')
      else if (tenant.plan?.name === 'pro') setSelectedPlan('pro')
    }
  }, [tenant])

  if (loadingTenant) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
  if (!tenant) return null

  const plan    = tenant.plan ?? {}
  const maxMsg  = plan.maxMessages ?? 100
  const maxTok  = plan.maxTokens ?? 50000
  const usedMsg = usage?.messagesUsed ?? 0
  const usedTok = usage?.tokensUsed ?? 0
  const currentStatus = tenant.status ?? (tenant.isActive ? 'active' : 'inactive')

  // WhatsApp: two connection modes — direct QR or custom Evolution server
  const hasQRConnection = !!tenant?.evolutionInstance?.instanceName?.trim()
  const hasCustomServer = !!(tenant?.evolutionInstance?.apiUrl?.trim() && tenant?.evolutionInstance?.apiKey?.trim())
  const isWhatsAppSetup = hasQRConnection || hasCustomServer
  const waConnected     = waStatus?.status === 'open'

  // Plan
  const currentPlanName = tenant.plan?.name ?? ''
  const isPaidPlan      = currentPlanName === 'pro' || currentPlanName === 'enterprise'
  const planChanging    = selectedPlan !== currentPlanName

  const handleActivate = () => {
    activate.mutate(tenantId, {
      onSuccess: () => { toast.success('Negocio activado correctamente'); setConfirmActivate(false) },
      onError: (err) => { toast.error(err.response?.data?.message ?? 'Error al activar'); setConfirmActivate(false) },
    })
  }

  const handleDeactivate = () => {
    deactivate.mutate(tenantId, {
      onSuccess: () => { toast.success('Negocio pausado'); setConfirmSuspend(false) },
      onError: () => { toast.error('Error al pausar'); setConfirmSuspend(false) },
    })
  }

  const handleSuspend = () => {
    updateStatus.mutate({ tenantId, status: 'suspended' }, {
      onSuccess: () => { toast.success('Tenant suspendido'); setConfirmSuspend(false) },
      onError: () => { toast.error('Error al suspender'); setConfirmSuspend(false) },
    })
  }

  const handlePlanSave = () => {
    updatePlan.mutate({ tenantId, planName: selectedPlan }, {
      onSuccess: () => { toast.success(`${PLAN_LABELS[selectedPlan] ?? selectedPlan} asignado correctamente`); setConfirmPlan(false) },
      onError: (err) => { toast.error(err.response?.data?.message ?? 'Error al actualizar plan'); setConfirmPlan(false) },
    })
  }

  const handleHardDelete = () => {
    hardDelete.mutate(tenantId, {
      onSuccess: () => {
        toast.success('Negocio eliminado permanentemente')
        if (isOwner) navigate('/dashboard')
        else navigate('/admin/tenants')
      },
      onError: (err) => {
        toast.error(err.response?.data?.message ?? 'Error al eliminar')
        setConfirmHardDelete(false)
      },
    })
  }

  const handleInstanceSave = (e) => {
    e.preventDefault()
    setInstMsg(null)
    const payload = { tenantId, instanceName }
    if (instanceApiUrl) payload.apiUrl = instanceApiUrl
    if (instanceApiKey) payload.apiKey = instanceApiKey
    updateInstance.mutate(payload, {
      onSuccess: () => setInstMsg({ type: 'success', text: 'Configuración guardada correctamente' }),
      onError: (err) => setInstMsg({ type: 'error', text: err.response?.data?.message ?? 'Error al guardar' }),
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Estado del negocio (owner) ────────────────────────────────────── */}
      {isOwner && (
        <div className={`rounded-xl border-2 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          tenant.isActive
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              tenant.isActive ? 'bg-emerald-100' : 'bg-gray-200'
            }`}>
              {tenant.isActive ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${tenant.isActive ? 'text-emerald-800' : 'text-gray-700'}`}>
                {tenant.isActive ? 'Tu negocio está activo' : 'Tu negocio está pausado'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {tenant.isActive
                  ? 'Procesando mensajes de WhatsApp con IA en tiempo real'
                  : isWhatsAppSetup
                    ? 'Actívalo para empezar a procesar mensajes de WhatsApp'
                    : 'Configura WhatsApp primero para poder activar tu negocio'}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            {tenant.isActive ? (
              <button
                onClick={() => setConfirmSuspend(true)}
                disabled={deactivate.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Pausar negocio
              </button>
            ) : (
              <button
                onClick={() => isWhatsAppSetup ? setConfirmActivate(true) : toast.error('Conecta WhatsApp primero para activar tu negocio')}
                disabled={activate.isPending}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  isWhatsAppSetup
                    ? 'bg-sb-primary text-white hover:bg-sb-primary/90'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {activate.isPending ? 'Activando…' : 'Activar negocio'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Warning: WhatsApp not connected */}
      {!isWhatsAppSetup && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800 text-sm">WhatsApp no conectado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Este tenant no puede procesar mensajes hasta que conectes WhatsApp.
              Usa <strong>"Conectar WhatsApp"</strong> para escanear el QR con tu teléfono,
              o configura un servidor Evolution API propio en la sección de abajo.
            </p>
          </div>
        </div>
      )}

      {/* Connected OK banner */}
      {isWhatsAppSetup && waConnected && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2.5">
          <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs font-medium text-green-800">WhatsApp activo — mensajes procesados en tiempo real</p>
        </div>
      )}

      {/* 3-col grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Información General */}
        <Card title="Información General">
          <div className="space-y-4">
            <Field label="Nombre">{tenant.name}</Field>
            <Field label="Teléfono">{tenant.phone}</Field>
            <Field label="Email">{tenant.email}</Field>
            <Field label="Tenant ID">
              <div className="flex items-center gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">{tenantId}</code>
                <button onClick={() => { navigator.clipboard.writeText(tenantId); toast.success('Copiado') }} className="text-xs text-sb-primary hover:text-sb-secondary shrink-0">Copiar</button>
              </div>
            </Field>
            <Field label="Estado">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={STATUS_BADGE[currentStatus] ?? 'inactive'}>{STATUS_LABELS[currentStatus] ?? currentStatus}</Badge>
                {currentStatus !== 'active' && (
                  <button onClick={() => setConfirmActivate(true)} className="text-xs font-medium transition-colors text-sb-primary hover:text-sb-secondary">Activar</button>
                )}
                {currentStatus === 'active' && (
                  <button onClick={() => setConfirmSuspend(true)} className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
                    {isOwner ? 'Pausar' : 'Suspender'}
                  </button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        {/* Uso del Mes */}
        <Card title="Uso del Mes">
          <div className="space-y-5">
            <ProgressBar used={usedMsg} max={maxMsg === -1 ? -1 : maxMsg} label="Mensajes" />
            <ProgressBar used={usedTok} max={maxTok === -1 ? -1 : maxTok} label="Tokens" />
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400">Próximo reset</p>
              <p className="text-sm text-gray-700 mt-0.5">{nextMonthReset()}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-gray-500">Mensajes: <span className="font-medium text-gray-700">{usedMsg.toLocaleString()}</span>{maxMsg !== -1 && <span className="text-gray-400"> / {maxMsg.toLocaleString()}</span>}</p>
              <p className="text-xs text-gray-500">Tokens: <span className="font-medium text-gray-700">{usedTok.toLocaleString()}</span>{maxTok !== -1 && <span className="text-gray-400"> / {maxTok.toLocaleString()}</span>}</p>
            </div>
          </div>
        </Card>

        {/* Plan / Config */}
        {!isOwner ? (
          <Card title="Plan de Suscripción">
            <div className="space-y-4">
              {isPaidPlan && (
                <div className="flex items-center gap-2.5 bg-sb-primary/5 border border-sb-primary/15 rounded-lg px-3 py-2.5">
                  <svg className="w-4 h-4 text-sb-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-sb-dark">{PLAN_LABELS[currentPlanName] ?? currentPlanName}</p>
                    <p className="text-xs text-sb-neutral">
                      {currentPlanName === 'enterprise'
                        ? '$9.999.998 / año · ~$833.333/mes · ~2 meses gratis'
                        : '$999.998 / mes · facturación mensual'}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-2">
                  {isPaidPlan ? 'Cambiar modalidad de facturación:' : 'Seleccionar plan:'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PLAN_OPTIONS.map(({ key, label, price, badge }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPlan(key)}
                      className={[
                        'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-all',
                        selectedPlan === key
                          ? 'border-sb-primary bg-sb-primary/8 ring-1 ring-sb-primary/30'
                          : 'border-gray-200 hover:border-gray-300 bg-white',
                      ].join(' ')}
                    >
                      <span className={`text-xs font-semibold ${selectedPlan === key ? 'text-sb-dark' : 'text-gray-600'}`}>{label}</span>
                      <span className={`text-xs ${selectedPlan === key ? 'text-sb-primary' : 'text-gray-400'}`}>{price}</span>
                      {badge && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 mt-0.5">{badge}</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full justify-center"
                  loading={updatePlan.isPending}
                  onClick={() => setConfirmPlan(true)}
                  disabled={isPaidPlan && !planChanging}
                >
                  {isPaidPlan && !planChanging
                    ? 'Plan activo'
                    : isPaidPlan
                      ? `Cambiar a ${PLAN_LABELS[selectedPlan] ?? selectedPlan}`
                      : `Asignar ${PLAN_LABELS[selectedPlan] ?? selectedPlan}`}
                </Button>

                <div className="relative flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide shrink-0">o</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  disabled={adminActivate.isPending}
                  onClick={() => adminActivate.mutate(
                    { tenantId, planName: selectedPlan },
                    {
                      onSuccess: (r) => toast.success(r.message ?? 'Plan activado y factura enviada'),
                      onError: (e) => toast.error(e.response?.data?.message ?? 'Error al activar plan'),
                    }
                  )}
                >
                  {adminActivate.isPending
                    ? <Spinner size="sm" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  Activar + Enviar Factura
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <Link to={`/admin/tenants/${tenantId}/config`} className="flex items-center justify-between w-full px-3 py-2.5 bg-sb-primary/5 hover:bg-sb-primary/10 text-sb-primary rounded-lg transition-colors text-xs font-medium">
                  <span>Configuración del negocio</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Mi Plan">
            <div className="space-y-4">

              {/* Plan activo actual */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Plan actual</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">
                    {PLAN_LABELS[tenant.plan?.name] ?? tenant.plan?.name ?? 'Free'}
                  </p>
                </div>
                {sub?.status === 'authorized' ? (
                  <Badge variant="active">Activa</Badge>
                ) : isPaidPlan ? (
                  <Badge variant={`plan-${currentPlanName}`}>Activo</Badge>
                ) : sub?.status === 'pending' ? (
                  <Badge variant="trial">Pago pendiente</Badge>
                ) : (
                  <Badge variant="inactive">Sin suscripción</Badge>
                )}
              </div>

              {/* Suscripción autorizada — info de renovación */}
              {sub?.status === 'authorized' && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 space-y-1">
                  {sub.currentPeriodEnd && (
                    <p className="text-xs text-emerald-700">
                      Próxima renovación: <span className="font-semibold">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </p>
                  )}
                  {sub.mpPayerEmail && (
                    <p className="text-xs text-emerald-600">Email de facturación: {sub.mpPayerEmail}</p>
                  )}
                </div>
              )}

              {/* Cambiar modalidad — cuando hay suscripción activa o plan pagado asignado */}
              {(sub?.status === 'authorized' || isPaidPlan) && (
                <div className="pt-1 border-t border-gray-100 space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Cambiar modalidad</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => currentPlanName !== 'pro' && setConfirmCheckout('pro')}
                      disabled={checkout.isPending || currentPlanName === 'pro'}
                      className={`py-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                        currentPlanName === 'pro'
                          ? 'border-sb-primary bg-sb-primary/8 text-sb-primary cursor-default'
                          : 'border-gray-200 text-gray-600 hover:border-sb-primary hover:text-sb-primary disabled:opacity-40'
                      }`}
                    >
                      {currentPlanName === 'pro' ? '✓ Mensual activo' : 'Cambiar a Mensual'}
                    </button>
                    <button
                      onClick={() => currentPlanName !== 'enterprise' && setConfirmCheckout('enterprise')}
                      disabled={checkout.isPending || currentPlanName === 'enterprise'}
                      className={`py-2.5 text-xs font-semibold rounded-lg border transition-colors ${
                        currentPlanName === 'enterprise'
                          ? 'border-sb-primary bg-sb-primary/8 text-sb-primary cursor-default'
                          : 'border-gray-200 text-gray-600 hover:border-sb-primary hover:text-sb-primary disabled:opacity-40'
                      }`}
                    >
                      {currentPlanName === 'enterprise' ? '✓ Anual activo' : 'Cambiar a Anual'}
                    </button>
                  </div>
                </div>
              )}

              {/* Opciones de suscripción — solo si plan NO está asignado y NO hay sub activa */}
              {sub?.status !== 'authorized' && !isPaidPlan && (
                <div className="space-y-3">
                  {/* Aviso pago pendiente — solo cuando no hay plan pagado */}
                  {sub?.status === 'pending' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-amber-800 font-semibold">Pago pendiente en MercadoPago</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Si completaste el pago, se activará automáticamente en minutos.
                        Si no fue exitoso, elige un plan a continuación para intentar de nuevo.
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {sub?.status === 'paused'
                      ? 'Tu suscripción está pausada. Renuévala para recuperar el acceso completo.'
                      : sub?.status === 'cancelled'
                        ? 'Tu suscripción fue cancelada. Elige un plan para reactivar.'
                        : 'Elige tu plan para acceder a todas las funcionalidades sin límites.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Plan Mensual */}
                    <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">Mensual</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Ilimitado · sin contrato</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900 leading-none">$999.998</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">/mes · COP</p>
                      </div>
                      <button
                        onClick={() => setConfirmCheckout('pro')}
                        disabled={checkout.isPending}
                        className="w-full py-2 text-xs font-semibold text-sb-primary border border-sb-primary/40 rounded-lg hover:bg-sb-primary/5 disabled:opacity-50 transition-colors"
                      >
                        Suscribirse
                      </button>
                    </div>
                    {/* Plan Anual */}
                    <div className="border-2 border-sb-primary rounded-xl p-4 flex flex-col gap-3 relative">
                      <span className="absolute -top-2.5 right-3 bg-sb-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        ~2 meses gratis
                      </span>
                      <div className="mt-1">
                        <p className="text-xs font-semibold text-gray-800">Anual</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Ilimitado · soporte prioritario</p>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-900 leading-none">$9.999.998</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">/año · COP</p>
                      </div>
                      <button
                        onClick={() => setConfirmCheckout('enterprise')}
                        disabled={checkout.isPending}
                        className="w-full py-2 text-xs font-semibold text-white bg-sb-primary rounded-lg hover:bg-sb-primary/90 disabled:opacity-50 transition-colors"
                      >
                        Suscribirse
                      </button>
                    </div>
                  </div>
                  {checkout.isError && (
                    <p className="text-xs text-red-500">{checkout.error?.response?.data?.message || 'Error al iniciar el pago'}</p>
                  )}
                </div>
              )}

              {/* Plan activo sin suscripción formal (asignado por administrador) */}
              {isPaidPlan && sub?.status !== 'authorized' && (
                <div className="bg-sb-primary/10 border border-sb-primary/20 rounded-lg px-3 py-2.5 space-y-1">
                  <p className="text-xs text-sb-dark font-semibold">Plan activo</p>
                  <p className="text-xs text-sb-primary">
                    Tu plan fue activado por el administrador. Tienes acceso completo a todas las funcionalidades.
                  </p>
                </div>
              )}

              {/* Configuración del negocio */}
              <div className="pt-2 border-t border-gray-100">
                <Link to={`/admin/tenants/${tenantId}/config`} className="flex items-center justify-between w-full px-3 py-2.5 bg-sb-primary/5 hover:bg-sb-primary/10 text-sb-primary rounded-lg transition-colors text-xs font-medium">
                  <span>Configuración del negocio</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* WhatsApp section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Card title="Conexión WhatsApp">
          <WhatsAppConnectionCard tenantId={tenantId} />
        </Card>

        <Card title="Servidor Evolution API propio (opcional)">
          <form onSubmit={handleInstanceSave} className="space-y-4">
            <div className="flex items-start gap-2 bg-sb-primary/10 border border-sb-primary/20 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 text-sb-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-sb-primary">
                Solo necesitas esto si el tenant usa <strong>su propio servidor Evolution API</strong>.
                La mayoría de clientes se conecta con el QR de la izquierda (servidor global de SharkByte).
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre de instancia</label>
              <input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="mi-empresa-whatsapp" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL del servidor</label>
              <input value={instanceApiUrl} onChange={(e) => setInstanceApiUrl(e.target.value)} placeholder="https://evolution.miservidor.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">API Key</label>
              <input type="password" value={instanceApiKey} onChange={(e) => setInstanceApiKey(e.target.value)} placeholder="Dejar vacío para no cambiar" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary" />
            </div>
            {hasCustomServer && (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Servidor propio configurado
              </div>
            )}
            {instMsg && <p className={`text-xs ${instMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{instMsg.text}</p>}
            <Button type="submit" className="w-full justify-center" loading={updateInstance.isPending}>Guardar configuración</Button>
          </form>
        </Card>
      </div>

      {/* Panel de Ventas */}
      <div className="mt-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Panel de Ventas</h2>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Ventas hoy', value: salesStats?.today ?? 0 },
              { label: 'Ventas del mes', value: salesStats?.monthCount ?? 0 },
              { label: 'Ingresos del mes', value: salesStats?.monthRevenue ? `$${Number(salesStats.monthRevenue).toLocaleString('es-CO')}` : '$0' },
              { label: 'Clientes únicos', value: salesStats?.uniqueClients ?? 0 },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-gray-800">{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Tabla de ventas */}
          {salesData?.data?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Teléfono</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Producto</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Cant.</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Estado</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.data.map((sale, i) => (
                    <tr key={sale._id ?? i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-800">{sale.clientName || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-500">+{sale.clientPhone}</td>
                      <td className="py-2.5 px-3 text-gray-700 max-w-[160px] truncate" title={sale.productName}>{sale.productName || '—'}</td>
                      <td className="py-2.5 px-3 text-center text-gray-600">{sale.quantity}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          sale.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          sale.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {sale.status === 'confirmed' ? 'Confirmada' : sale.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400 text-xs">
                        {new Date(sale.confirmedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {salesData.total > 10 && (
                <p className="text-xs text-gray-400 mt-3 text-center">{salesData.total} ventas en total — mostrando las últimas 10</p>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No hay ventas registradas aún</p>
              <p className="text-xs mt-1">Las ventas confirmadas desde WhatsApp aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Zona de peligro ──────────────────────────────────────────────── */}
      <div className="border border-red-200 rounded-xl overflow-hidden">
        <div className="bg-red-50 px-5 py-3 border-b border-red-200">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Zona de peligro</p>
        </div>
        <div className="bg-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Eliminar negocio permanentemente</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Borra el negocio, toda su configuración, productos, ventas, integraciones y archivos. <strong>Esta acción no se puede deshacer.</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setHardDeleteInput(''); setConfirmHardDelete(true) }}
            className="flex-shrink-0 px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            Eliminar negocio
          </button>
        </div>
      </div>

      {/* Modal confirmación hard delete — requiere escribir nombre */}
      {confirmHardDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Eliminar "{tenant.name}"</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Se eliminarán permanentemente: configuración, productos, ventas, integraciones Google, suscripción y archivos en la nube. <strong>No hay recuperación posible.</strong>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">
                Escribe <strong className="text-gray-700">{tenant.name}</strong> para confirmar
              </label>
              <input
                autoFocus
                value={hardDeleteInput}
                onChange={(e) => setHardDeleteInput(e.target.value)}
                placeholder={tenant.name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmHardDelete(false)}
                disabled={hardDelete.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={hardDeleteInput !== tenant.name || hardDelete.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {hardDelete.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modals — activate/suspend (para owner y admin) */}
      <ConfirmModal open={confirmActivate} onClose={() => setConfirmActivate(false)} onConfirm={handleActivate}
        title="Activar negocio"
        message={`"${tenant.name}" comenzará a procesar mensajes de WhatsApp con IA inmediatamente.`}
        confirmLabel="Activar" variant="primary" loading={activate.isPending} />

      <ConfirmModal open={confirmSuspend} onClose={() => setConfirmSuspend(false)}
        onConfirm={isOwner ? handleDeactivate : handleSuspend}
        title={isOwner ? 'Pausar negocio' : 'Suspender tenant'}
        message={isOwner
          ? `"${tenant.name}" dejará de procesar mensajes. Puedes reactivarlo cuando quieras.`
          : `Suspender a "${tenant.name}" bloqueará el procesamiento de mensajes hasta ser reactivado.`}
        confirmLabel={isOwner ? 'Pausar' : 'Suspender'}
        variant="danger"
        loading={isOwner ? deactivate.isPending : updateStatus.isPending} />

      {/* Confirm modal — plan checkout (owner) */}
      <ConfirmModal
        open={!!confirmCheckout}
        onClose={() => setConfirmCheckout(null)}
        onConfirm={() => {
          checkout.mutate({ tenantId, planName: confirmCheckout })
          setConfirmCheckout(null)
        }}
        title={confirmCheckout === 'enterprise' ? 'Suscribirse al Plan Anual' : 'Suscribirse al Plan Mensual'}
        message={confirmCheckout === 'enterprise'
          ? `Se abrirá MercadoPago para completar el pago de $9.999.998/año COP. Equivale a ~$833.333/mes — ahorras ~2 meses frente al plan mensual.`
          : `Se abrirá MercadoPago para completar el pago de $999.998/mes COP. Sin contrato, cancela cuando quieras.`}
        confirmLabel="Ir a pagar"
        variant="primary"
        loading={checkout.isPending}
      />

      {/* Confirm modals — solo para admin */}
      {!isOwner && (
        <ConfirmModal open={confirmPlan} onClose={() => setConfirmPlan(false)} onConfirm={handlePlanSave}
          title={`Asignar ${PLAN_LABELS[selectedPlan] ?? selectedPlan}`}
          message={selectedPlan === 'enterprise'
            ? `Asignar Plan Anual ($9.999.998/año COP) a "${tenant.name}". Equivale a ~$833.333/mes — ahorra ~2 meses frente al plan mensual.`
            : `Asignar Plan Mensual ($999.998/mes COP) a "${tenant.name}".`}
          confirmLabel={`Asignar ${PLAN_LABELS[selectedPlan] ?? selectedPlan}`}
          variant="primary" loading={updatePlan.isPending} />
      )}
    </div>
  )
}
