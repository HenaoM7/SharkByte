import { usePlans } from '../hooks'
import Spinner from '../../../shared/ui/Spinner'

const FEATURES = [
  'Mensajes ilimitados',
  'Tokens de IA ilimitados',
  'Todos los módulos (Ventas, Soporte, Agendamiento)',
  'Escalamiento a agentes humanos',
  'Analytics avanzado',
  'Instancias WhatsApp ilimitadas',
  'Soporte dedicado',
  'Acceso completo a API',
]

function CheckIcon({ dark }) {
  return (
    <svg
      className={`w-4 h-4 shrink-0 mt-0.5 ${dark ? 'text-sb-secondary' : 'text-sb-primary'}`}
      viewBox="0 0 20 20" fill="currentColor"
    >
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  )
}

export default function PlansPage() {
  const { data: plans = [], isLoading } = usePlans()
  const planMensual = plans.find((p) => p.name === 'pro')
  const planAnual   = plans.find((p) => p.name === 'enterprise')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-sb-dark tracking-tight">Planes SharkByte</h1>
        <p className="text-sm text-sb-neutral mt-2 leading-relaxed">
          Elige la modalidad de facturación que mejor se adapte a tu operación.
          Ambas incluyen exactamente las mismas funcionalidades sin límites.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">

            {/* ─── Mensual (Pro) ─── */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col shadow-sm">
              <p className="text-xs font-semibold text-sb-neutral uppercase tracking-widest mb-6">
                Plan Mensual
              </p>

              <div className="mb-1 flex items-end gap-2">
                <span className="text-4xl font-bold text-sb-dark leading-none">$999.998</span>
                <span className="text-sb-neutral text-sm mb-1">/ mes</span>
              </div>
              <p className="text-xs text-gray-400 mb-8">COP · facturado mensualmente</p>

              {planMensual && (
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-[11px] text-sb-neutral uppercase tracking-wide mb-1">Mensajes</p>
                    <p className="text-sm font-bold text-sb-dark">
                      {planMensual.maxMessages === -1 ? 'Ilimitados' : planMensual.maxMessages?.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                    <p className="text-[11px] text-sb-neutral uppercase tracking-wide mb-1">Tokens IA</p>
                    <p className="text-sm font-bold text-sb-dark">
                      {planMensual.maxTokens === -1 ? 'Ilimitados' : planMensual.maxTokens?.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 mb-6" />

              <ul className="space-y-3 flex-1">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckIcon />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ─── Anual (Enterprise) — recomendado ─── */}
            <div className="bg-sb-dark rounded-2xl p-8 flex flex-col shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-sb-primary/20 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex items-center justify-between mb-6 relative">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                  Plan Anual
                </p>
                <span className="text-[11px] font-bold bg-white/15 text-white px-2.5 py-1 rounded-full">
                  Recomendado
                </span>
              </div>

              <div className="mb-1 flex items-end gap-2 relative">
                <span className="text-4xl font-bold text-white leading-none">$9.999.998</span>
                <span className="text-white/50 text-sm mb-1">/ año</span>
              </div>
              <p className="text-xs text-white/40 mb-3">COP · $833.333/mes · facturación anual</p>

              <div className="inline-flex items-center gap-1.5 bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 self-start relative">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
                Ahorra ~$2.000.000 — equivale a 2 meses gratis
              </div>

              {planAnual && (
                <div className="grid grid-cols-2 gap-3 mb-8 relative">
                  <div className="bg-white/8 rounded-xl p-3 text-center border border-white/10">
                    <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">Mensajes</p>
                    <p className="text-sm font-bold text-white">
                      {planAnual.maxMessages === -1 ? 'Ilimitados' : planAnual.maxMessages?.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/8 rounded-xl p-3 text-center border border-white/10">
                    <p className="text-[11px] text-white/50 uppercase tracking-wide mb-1">Tokens IA</p>
                    <p className="text-sm font-bold text-white">
                      {planAnual.maxTokens === -1 ? 'Ilimitados' : planAnual.maxTokens?.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-white/10 mb-6 relative" />

              <ul className="space-y-3 flex-1 relative">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-white/80">
                    <CheckIcon dark />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            Ambos planes incluyen las mismas funcionalidades sin límites de uso.
            Para gestionar pagos y suscripciones ve a{' '}
            <strong className="text-sb-neutral font-medium">Facturación</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
