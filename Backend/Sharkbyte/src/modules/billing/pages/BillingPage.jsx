import { useState } from "react"
import {
  useSubscription,
  useInvoices,
  useCreateCheckout,
  useCancelSubscription,
  usePauseSubscription,
  useResumeSubscription,
} from "../hooks"
import Badge from "../../../shared/ui/Badge"
import Spinner from "../../../shared/ui/Spinner"
import ConfirmModal from "../../../shared/ui/ConfirmModal"

const STATUS_LABELS = {
  authorized: "Activa",
  pending:    "Pendiente de pago",
  paused:     "Pausada",
  cancelled:  "Cancelada",
  free:       "Sin suscripción",
}

const STATUS_BADGE = {
  authorized: "active",
  pending:    "trial",
  paused:     "inactive",
  cancelled:  "inactive",
  free:       "inactive",
}

const PLANS = [
  {
    key: "pro",
    label: "Plan Mensual",
    price: "$999.998",
    period: "/mes",
    billing: "Facturado mensualmente · COP",
    features: [
      "Mensajes ilimitados",
      "Tokens IA ilimitados",
      "Todos los módulos (Ventas, Soporte, Agendamiento)",
      "Escalamiento a agentes humanos",
      "Analytics completo",
      "Soporte por email",
    ],
  },
  {
    key: "enterprise",
    label: "Plan Anual",
    price: "$9.999.998",
    period: "/año",
    billing: "Facturado anualmente · COP · ¡Ahorra ~2 meses!",
    features: [
      "Todo lo del Plan Mensual",
      "Equivale a $833.333/mes",
      "SLA garantizado",
      "Soporte prioritario 24/7",
      "Onboarding dedicado",
      "Instancias ilimitadas",
    ],
    highlighted: true,
  },
]

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-sb-primary shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={active
        ? "px-4 py-2 text-sm font-medium rounded-lg bg-sb-primary text-white"
        : "px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"}
    >
      {label}
    </button>
  )
}

function SubscriptionTab({ tenantId }) {
  const { data: sub, isLoading } = useSubscription(tenantId)
  const checkout = useCreateCheckout()
  const cancel = useCancelSubscription(tenantId)
  const pause = usePauseSubscription(tenantId)
  const resume = useResumeSubscription(tenantId)

  const [confirmAction, setConfirmAction] = useState(null) // 'cancel' | 'pause'

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  const status = sub?.status ?? "free"
  const isActive = status === "authorized"
  const isPaused = status === "paused"
  const hasSubscription = !!sub?.mpPreapprovalId

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de suscripción</h3>
        <div className="flex items-center gap-3 mb-3">
          <Badge variant={STATUS_BADGE[status] || "inactive"}>
            {STATUS_LABELS[status] ?? status}
          </Badge>
          {sub?.planName && (
            <span className="text-sm text-gray-600 font-medium capitalize">{sub.planName}</span>
          )}
        </div>
        {sub?.currentPeriodEnd && (
          <p className="text-sm text-gray-500 mb-2">
            Próximo cobro:{" "}
            <span className="font-medium text-gray-700">
              {new Date(sub.currentPeriodEnd).toLocaleDateString("es-CO", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
          </p>
        )}
        {sub?.mpPayerEmail && (
          <p className="text-xs text-gray-400">Correo de pago: {sub.mpPayerEmail}</p>
        )}

        {/* Acciones de gestión */}
        {hasSubscription && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {isPaused && (
              <button
                onClick={() => resume.mutate({ tenantId })}
                disabled={resume.isPending}
                className="px-3 py-1.5 rounded-lg bg-sb-primary text-white text-xs font-medium hover:bg-sb-secondary disabled:opacity-50 transition-colors"
              >
                {resume.isPending ? "Reanudando..." : "Reanudar suscripción"}
              </button>
            )}
            {isActive && (
              <button
                onClick={() => setConfirmAction("pause")}
                disabled={pause.isPending}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Pausar suscripción
              </button>
            )}
            {(isActive || isPaused) && (
              <button
                onClick={() => setConfirmAction("cancel")}
                disabled={cancel.isPending}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Cancelar suscripción
              </button>
            )}
          </div>
        )}
      </div>

      {/* Planes disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`bg-white rounded-xl border-2 p-6 ${
              plan.highlighted
                ? "border-sb-secondary ring-2 ring-sb-primary/10"
                : "border-gray-100"
            }`}
          >
            <div className="mb-4">
              <div className="flex items-start justify-between mb-1">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  plan.highlighted ? "bg-sb-primary text-white" : "bg-gray-100 text-gray-700"
                }`}>
                  {plan.label}
                </span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-xs text-gray-500">{plan.period}</span>
                </div>
              </div>
              {plan.billing && (
                <p className="text-xs text-gray-400 mt-2">{plan.billing}</p>
              )}
            </div>
            <ul className="space-y-1.5 mb-5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => tenantId && checkout.mutate({ tenantId, planName: plan.key })}
              disabled={!tenantId || checkout.isPending}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                plan.highlighted
                  ? "bg-sb-primary text-white hover:bg-sb-secondary"
                  : "border border-sb-primary text-sb-primary hover:bg-sb-primary/5"
              }`}
            >
              {checkout.isPending ? "Redirigiendo a MercadoPago..." : `Suscribirse — ${plan.label}`}
            </button>
          </div>
        ))}
      </div>

      {!tenantId && (
        <p className="text-xs text-gray-400">Ingresa un Tenant ID arriba para gestionar su suscripción.</p>
      )}

      {/* Modal confirmar pausa */}
      <ConfirmModal
        open={confirmAction === "pause"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          pause.mutate({ tenantId })
          setConfirmAction(null)
        }}
        loading={pause.isPending}
        title="Pausar suscripción"
        message="El tenant no podrá procesar mensajes mientras la suscripción esté pausada. ¿Confirmas?"
        variant="warning"
      />

      {/* Modal confirmar cancelación */}
      <ConfirmModal
        open={confirmAction === "cancel"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          cancel.mutate({ tenantId })
          setConfirmAction(null)
        }}
        loading={cancel.isPending}
        title="Cancelar suscripción"
        message="Se cancelará la suscripción en MercadoPago y el plan regresará a Free. Esta acción no se puede deshacer. ¿Confirmas?"
        variant="danger"
      />
    </div>
  )
}

function InvoicesTab({ tenantId }) {
  const { data: invoices = [], isLoading } = useInvoices(tenantId)

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Historial de pagos</h3>
        <p className="text-xs text-gray-400 mt-0.5">Pagos procesados por MercadoPago</p>
      </div>
      {invoices.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">Sin pagos registrados aún</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {["Fecha", "Descripción", "Monto", "Estado"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">
                    {new Date(inv.date).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-6 py-3.5 text-gray-700">{inv.description || "—"}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-800">
                    {inv.amount.toLocaleString("es-CO")} {inv.currency}
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant={inv.status === "paid" ? "active" : "inactive"}>
                      {inv.status === "paid" ? "Aprobado" : inv.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [tab, setTab] = useState("subscription")
  const [tenantId, setTenantId] = useState("")

  const tabs = [
    { key: "subscription", label: "Suscripción" },
    { key: "invoices", label: "Pagos" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Facturación</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de suscripciones y pagos con MercadoPago</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">
          Tenant ID
        </label>
        <input
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          placeholder="ej: tenant_abc123"
          className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary"
        />
      </div>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <TabBtn key={t.key} label={t.label} active={tab === t.key} onClick={() => setTab(t.key)} />
        ))}
      </div>
      {tab === "subscription" && <SubscriptionTab tenantId={tenantId} />}
      {tab === "invoices" && <InvoicesTab tenantId={tenantId} />}
    </div>
  )
}
