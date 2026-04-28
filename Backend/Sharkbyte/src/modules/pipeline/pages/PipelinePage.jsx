import { useState } from 'react'
import { useAuthStore } from '../../auth/store'
import { usePipelineBoard } from '../hooks'
import KanbanBoard from '../components/KanbanBoard'
import DealModal from '../components/DealModal'
import Spinner from '../../../shared/ui/Spinner'

export default function PipelinePage({ tenantId: tenantIdProp } = {}) {
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId

  const { data: board, isLoading } = usePipelineBoard(tenantId)
  const [modal, setModal] = useState(null) // { deal?, defaultStageId? }

  const pipeline = board?.pipeline
  const dealsByStage = board?.dealsByStage ?? {}
  // Flatten all stage arrays into one list (for count, DnD, and DealModal)
  const deals = Object.values(dealsByStage).flat()

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner /></div>
  }

  return (
    <div className="space-y-4 -mx-6">
      <div className="px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {deals.length} deal{deals.length !== 1 ? 's' : ''} en el pipeline
          </p>
        </div>
        <button
          onClick={() => setModal({})}
          className="bg-sb-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-sb-secondary transition-colors"
        >
          + Nuevo deal
        </button>
      </div>

      <div className="px-6">
        <KanbanBoard
          tenantId={tenantId}
          pipeline={pipeline}
          deals={deals}
          dealsByStage={dealsByStage}
          onAddDeal={(stageId) => setModal({ defaultStageId: stageId })}
          onSelectDeal={(deal) => setModal({ deal })}
        />
      </div>

      {/* Footer explicativo */}
      <div className="px-6 pb-6">
        <div className="flex flex-wrap items-start gap-6 border-t border-gray-100 pt-5 mt-2">
          {[
            {
              icon: (
                <svg className="w-4 h-4 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
                </svg>
              ),
              title: 'Etapas personalizables',
              desc: 'Organiza tu proceso de ventas en las columnas que definas — desde el primer contacto hasta el cierre.',
            },
            {
              icon: (
                <svg className="w-4 h-4 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              ),
              title: 'Arrastra y suelta',
              desc: 'Mueve un deal de etapa con un solo gesto. El valor y el estado se actualizan en tiempo real.',
            },
            {
              icon: (
                <svg className="w-4 h-4 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 16v1m0-1v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              ),
              title: 'Valor por etapa',
              desc: 'Cada columna muestra el total acumulado de deals activos para estimar ingresos proyectados.',
            },
            {
              icon: (
                <svg className="w-4 h-4 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              ),
              title: 'Cierre de deals',
              desc: 'Marca un deal como Ganado o Perdido para llevar un historial limpio de conversiones.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-2.5 min-w-45 flex-1">
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-sb-primary/8 flex items-center justify-center">
                {icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <DealModal
          tenantId={tenantId}
          stages={pipeline?.stages}
          deal={modal.deal}
          defaultStageId={modal.defaultStageId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
