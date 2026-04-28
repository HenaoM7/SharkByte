import { useAuthStore } from '../../auth/store'
import { usePlans } from '../../plans/hooks'
import { useTenant } from '../../tenants/hooks'
import { useSubscription, useCreateCheckout } from '../../billing/hooks'
import Spinner from '../../../shared/ui/Spinner'

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-CO')}` : '—'

const PLAN_FEATURES = {
  free: [
    'Hasta 100 mensajes/mes',
    '1 número WhatsApp',
    'Dashboard básico',
    'Soporte por email',
  ],
  pro: [
    'Mensajes ilimitados',
    '1 número WhatsApp',
    'CRM completo',
    'Pipeline Kanban',
    'Agenda y citas',
    'Google Calendar + Sheets',
    'Analytics avanzado',
    'Soporte prioritario',
  ],
  enterprise: [
    'Todo lo de Pro',
    'Múltiples números WhatsApp',
    'Integraciones Meta (Instagram, FB)',
    'IA personalizada',
    'API access',
    'Onboarding dedicado',
    'SLA garantizado',
    'Soporte 24/7',
  ],
}

const PLAN_COLORS = {
  free: { badge: 'bg-gray-100 text-gray-600', btn: 'bg-gray-200 text-gray-500 cursor-not-allowed', border: 'border-gray-200' },
  pro: { badge: 'bg-sb-primary/10 text-sb-primary', btn: 'bg-sb-primary hover:bg-sb-secondary text-white', border: 'border-sb-primary', highlight: true },
  enterprise: { badge: 'bg-sb-dark/10 text-sb-dark', btn: 'bg-sb-dark hover:bg-sb-primary text-white', border: 'border-sb-dark/40' },
}

const PLAN_LABELS = { free: 'Gratuito', pro: 'Profesional', enterprise: 'Enterprise' }
const PLAN_PERIODS = { free: '', pro: '/mes', enterprise: '/año' }

function PlanCard({ plan, isCurrentPlan, onSelect, isLoading: isCheckoutLoading }) {
  const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.free
  const features = PLAN_FEATURES[plan.name] || []
  const label = PLAN_LABELS[plan.name] || plan.name
  const period = PLAN_PERIODS[plan.name] || ''

  return (
    <div className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${colors.border} ${colors.highlight ? 'shadow-lg shadow-sb-primary/10' : ''}`}>
      {colors.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-sb-primary text-white text-[10px] font-bold px-3 py-1 rounded-full">MÁS POPULAR</span>
        </div>
      )}
      <div className="mb-5">
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>{label}</span>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">{fmt(plan.price)}</span>
          <span className="text-sm text-gray-400">{period}</span>
        </div>
      </div>

      <ul className="space-y-2.5 flex-1 mb-6">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <div className="text-center py-2.5 bg-gray-50 rounded-xl text-sm font-medium text-gray-500">
          Plan actual
        </div>
      ) : (
        <button
          onClick={() => onSelect(plan)}
          disabled={plan.name === 'free' || isCheckoutLoading}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${colors.btn}`}
        >
          {isCheckoutLoading ? 'Redirigiendo...' : plan.name === 'free' ? 'Plan actual' : `Activar ${label}`}
        </button>
      )}
    </div>
  )
}

export default function OwnerBillingPage() {
  const { user } = useAuthStore()
  const tenantId = user?.tenantId
  const { data: tenant } = useTenant(tenantId)
  const { data: plans = [], isLoading } = usePlans()
  const { data: subscription } = useSubscription(tenantId)

  const currentPlan = tenant?.plan?.name || 'free'
  const isActive = tenant?.status === 'active'
  const planExpiresAt = subscription?.currentPeriodEnd ?? null

  const createCheckout = useCreateCheckout()

  const handleSelectPlan = (plan) => {
    if (!tenantId) return
    createCheckout.mutate({ tenantId, planName: plan.name })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Facturación y Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona tu suscripción y accede a todas las funciones</p>
      </div>

      {/* Current plan status */}
      <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 ${isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-amber-100'}`}>
            <svg className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isActive ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} />
            </svg>
          </div>
          <div>
            <p className={`text-sm font-semibold ${isActive ? 'text-green-800' : 'text-amber-800'}`}>
              {isActive ? 'Cuenta activa' : 'Cuenta inactiva'}
            </p>
            <p className={`text-xs ${isActive ? 'text-green-600' : 'text-amber-600'}`}>
              Plan actual: <strong className="capitalize">{PLAN_LABELS[currentPlan] || currentPlan}</strong>
              {planExpiresAt && ` · Vence: ${new Date(planExpiresAt).toLocaleDateString('es-CO')}`}
            </p>
          </div>
        </div>
        {!isActive && (
          <button
            onClick={() => window.open('mailto:soporte@sharkbyteia.com', '_blank')}
            className="text-xs bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex-shrink-0"
          >
            Contactar soporte
          </button>
        )}
      </div>

      {/* Error de checkout */}
      {createCheckout.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          No se pudo iniciar el pago. Intenta de nuevo o contacta soporte.
        </div>
      )}

      {/* Plans */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              isCurrentPlan={plan.name === currentPlan}
              onSelect={handleSelectPlan}
              isLoading={createCheckout.isPending}
            />
          ))}
        </div>
      )}

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Preguntas frecuentes</h2>
        {[
          { q: '¿Cuándo se activa mi plan?', a: 'Inmediatamente después de confirmar el pago vía MercadoPago. Recibirás un email de confirmación.' },
          { q: '¿Puedo cambiar de plan en cualquier momento?', a: 'Sí. Los cambios de plan se aplican inmediatamente. El saldo restante se prorratea.' },
          { q: '¿Qué pasa si cancelo?', a: 'Puedes usar el plan hasta que venza. Tus datos se conservan por 30 días adicionales.' },
        ].map((item) => (
          <div key={item.q} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-gray-800">{item.q}</p>
            <p className="text-xs text-gray-500 mt-1">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
