import { useState } from 'react'
import {
  useWhatsAppStatus,
  useConnectWhatsApp,
  useDisconnectWhatsApp,
  useDeleteWhatsAppInstance,
} from '../hooks'
import ConfirmModal from '../../../shared/ui/ConfirmModal'
import Spinner from '../../../shared/ui/Spinner'

function StatusDot({ status }) {
  const map = {
    open:        'bg-green-500',
    connecting:  'bg-yellow-400 animate-pulse',
    pending:     'bg-yellow-400 animate-pulse',
    disconnected:'bg-gray-400',
    error:       'bg-red-400',
    not_created: 'bg-gray-300',
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${map[status] ?? 'bg-gray-300'}`} />
  )
}

function StatusLabel({ status }) {
  const map = {
    open:        { text: 'Conectado',      color: 'text-green-700' },
    connecting:  { text: 'Conectando...',  color: 'text-yellow-700' },
    pending:     { text: 'Esperando QR…',  color: 'text-yellow-700' },
    disconnected:{ text: 'Desconectado',   color: 'text-gray-500' },
    error:       { text: 'Error',          color: 'text-red-600' },
    not_created: { text: 'Sin instancia',  color: 'text-gray-400' },
    unknown:     { text: 'Desconocido',    color: 'text-gray-400' },
  }
  const { text, color } = map[status] ?? { text: status, color: 'text-gray-500' }
  return <span className={`text-sm font-medium ${color}`}>{text}</span>
}

export default function WhatsAppConnectionCard({ tenantId }) {
  const [showQR, setShowQR] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: statusData, isLoading: statusLoading } = useWhatsAppStatus(tenantId)
  const connectMutation = useConnectWhatsApp(tenantId)
  const disconnectMutation = useDisconnectWhatsApp(tenantId)
  const deleteMutation = useDeleteWhatsAppInstance(tenantId)

  const status = statusData?.status ?? 'not_created'
  const instanceName = statusData?.instanceName ?? ''
  const isConnected = status === 'open'
  const isPending = status === 'pending' || status === 'connecting'

  const handleConnect = async () => {
    setQrData(null)
    setShowQR(true)
    try {
      const result = await connectMutation.mutateAsync()
      if (result?.qr) setQrData(result.qr)
    } catch {
      setShowQR(false)
    }
  }

  const handleDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => { setConfirmDisconnect(false); setShowQR(false); setQrData(null) },
      onError: () => setConfirmDisconnect(false),
    })
  }

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => { setConfirmDelete(false); setShowQR(false); setQrData(null) },
      onError: () => setConfirmDelete(false),
    })
  }

  return (
    <div className="space-y-4">

      {/* Status row */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} />
          <div>
            <StatusLabel status={status} />
            {instanceName && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{instanceName}</p>
            )}
          </div>
        </div>
        {statusLoading && <Spinner size="sm" />}
      </div>

      {/* QR panel — shown while connecting */}
      {showQR && !isConnected && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sb-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-600">
              Abre WhatsApp en tu teléfono → <strong>Dispositivos vinculados</strong> → <strong>Vincular dispositivo</strong> y escanea el código.
            </p>
          </div>

          {connectMutation.isPending && !qrData ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Spinner />
              <p className="text-xs text-gray-400">Generando QR…</p>
            </div>
          ) : qrData ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={qrData}
                alt="QR WhatsApp"
                className="w-52 h-52 rounded-lg border border-gray-100 object-contain"
              />
              <p className="text-xs text-gray-400">El QR expira en ~60 segundos</p>
            </div>
          ) : (
            <p className="text-xs text-red-500 text-center py-4">No se pudo obtener el QR. Intenta de nuevo.</p>
          )}
        </div>
      )}

      {/* Connected banner */}
      {isConnected && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-green-800">WhatsApp conectado</p>
            {statusData?.phone && (
              <p className="text-xs text-green-600 mt-0.5">{statusData.phone}</p>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Connect / Reconnect */}
        {!isConnected && (
          <button
            onClick={handleConnect}
            disabled={connectMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-sb-primary hover:bg-sb-secondary disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {connectMutation.isPending ? (
              <>
                <Spinner size="sm" className="border-white" />
                Conectando…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {instanceName ? 'Reconectar' : 'Conectar WhatsApp'}
              </>
            )}
          </button>
        )}

        {/* Disconnect */}
        {isConnected && (
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="px-4 py-2 border border-orange-200 text-orange-600 hover:bg-orange-50 text-sm font-medium rounded-lg transition-colors"
          >
            Desconectar
          </button>
        )}

        {/* Delete instance */}
        {instanceName && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
          >
            Eliminar instancia
          </button>
        )}
      </div>

      <ConfirmModal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Desconectar WhatsApp"
        message="¿Desconectar WhatsApp? El tenant dejará de recibir mensajes hasta que vuelvas a conectar."
        confirmLabel="Desconectar"
        variant="danger"
        loading={disconnectMutation.isPending}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar instancia"
        message="¿Eliminar la instancia de Evolution API? Se perderá la configuración y deberás volver a escanear el QR."
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
