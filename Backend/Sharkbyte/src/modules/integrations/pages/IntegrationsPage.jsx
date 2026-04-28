import { useState, useEffect } from 'react'
import { useAuthStore } from '../../auth/store'
import {
  useWhatsAppStatus, useConnectWhatsApp, useDisconnectWhatsApp,
  useWhatsAppQR, useDeleteWhatsAppInstance,
} from '../../whatsapp/hooks'
import {
  useGoogleStatus, useDisconnectGoogle, useUpdateGoogleConfig,
  useChannels, useUpsertChannel, useDeleteChannel,
} from '../../tenants/hooks'
import Spinner from '../../../shared/ui/Spinner'

// ─── Official Brand Logos ──────────────────────────────────────────────────────

const LogoWhatsApp = ({ size = 40 }) => (
  <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
    <circle cx="24" cy="24" r="24" fill="#25D366"/>
    <path fill="white" d="M24 10.5C16.54 10.5 10.5 16.54 10.5 24c0 2.42.65 4.69 1.78 6.64L10.5 37.5l6.52-1.71A13.47 13.47 0 0024 37.5c7.46 0 13.5-6.04 13.5-13.5S31.46 10.5 24 10.5z"/>
    <path fill="#25D366" d="M31.5 27.49c-.38-.19-2.26-1.11-2.61-1.24-.35-.13-.6-.19-.86.19-.25.38-.98 1.24-1.2 1.49-.22.25-.44.28-.82.09-.38-.19-1.6-.59-3.05-1.88-1.13-1.01-1.89-2.25-2.11-2.63-.22-.38-.02-.59.17-.77.17-.17.38-.44.57-.66.19-.22.25-.38.38-.63.13-.25.06-.47-.03-.66-.09-.19-.86-2.07-1.18-2.84-.31-.74-.63-.64-.86-.65-.22-.01-.47-.01-.72-.01-.25 0-.66.09-1.01.47-.34.38-1.32 1.29-1.32 3.14s1.35 3.65 1.54 3.9c.19.25 2.66 4.06 6.44 5.69.9.39 1.6.62 2.15.79.9.29 1.72.25 2.37.15.72-.11 2.22-.91 2.53-1.79.31-.88.31-1.63.22-1.79-.09-.16-.34-.25-.72-.44z"/>
  </svg>
)

const LogoGoogle = ({ size = 40 }) => (
  <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.37-.76-2.84-.76-4.59s.27-3.22.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)

const LogoGCalendar = ({ size = 40 }) => (
  <img src="/logo_calendar.png" alt="Google Calendar" style={{ width: size, height: size, objectFit: 'contain' }}/>
)

const LogoGSheets = ({ size = 40 }) => (
  <img src="/logo_sheets.png" alt="Google Sheets" style={{ width: size, height: size, objectFit: 'contain' }}/>
)

// Coming-soon app logos
const AppLogos = {
  meta: ({ size = 40 }) => (
    <img src="/logo_meta.png" alt="Meta" style={{ width: size, height: size, objectFit: 'contain' }}/>
  ),
  instagram: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <defs>
        <radialGradient id="ig" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig)"/>
      <rect x="11" y="11" width="26" height="26" rx="7" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="24" cy="24" r="7" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="33.5" cy="14.5" r="1.8" fill="white"/>
    </svg>
  ),
  facebook: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <rect width="48" height="48" rx="10" fill="#1877F2"/>
      <path fill="white" d="M33 24h-5v-3c0-1.2.5-2 2-2h3V14h-3c-4 0-6.5 2.5-6.5 7v3H20v5h3.5V44h6V29H33l.5-5z"/>
    </svg>
  ),
  telegram: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <circle cx="24" cy="24" r="24" fill="url(#tg)"/>
      <defs>
        <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2AABEE"/>
          <stop offset="100%" stopColor="#229ED9"/>
        </linearGradient>
      </defs>
      <path fill="white" d="M11.5 23.2l24.5-9.4c1.1-.4 2.2.3 1.8 1.7l-4.2 19.6c-.3 1.3-1.1 1.6-2.2 1l-6-4.5-2.9 2.8c-.3.3-.6.6-1.3.6l.5-6.2 11.2-10c.5-.4-.1-.7-.7-.2L14.5 27.8 8.4 26c-1.4-.4-1.4-1.4.3-2.1z"/>
    </svg>
  ),
  shopify: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <rect width="48" height="48" rx="10" fill="#96BF48"/>
      <path fill="white" d="M33.5 13.5c-.1-.1-.3-.1-.4 0l-2.5.7c-.4-.9-.9-1.7-1.6-2.3-.7-.6-1.5-1-2.4-1-.1 0-.2 0-.3 0-.3-.4-.7-.7-1.2-.9-.5-.2-1.1-.3-1.7-.2-1.3.2-2.5 1.1-3.4 2.6-.7 1.1-1.2 2.5-1.3 3.9l-3.5 1.1c-.5.1-.8.6-.8 1.1v.1L16 34h17.5L35 14.8c0-.6-.6-1.2-1.5-1.3zm-7.9 2.5c0-1 .2-1.9.5-2.7.7.1 1.4.5 1.9 1.2l-.2.1c-1.4.4-2 1.4-2.2 1.4zm-1.5-.1c-.2 0-.4 0-.6 0 .2-1.3.8-2.4 1.6-3.1.3.4.5.9.6 1.4-.5.5-.9 1.1-1.2 1.7h-.4zm2.9-3.4c.4 0 .8.1 1.1.2-.7.4-1.3 1.1-1.7 2-.6-.6-1.3-1-2.1-1.2.6-.6 1.6-1 2.7-1z"/>
    </svg>
  ),
  woocommerce: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <rect width="48" height="48" rx="10" fill="#7F54B3"/>
      <path fill="white" d="M7 14h34a3 3 0 013 3v10a3 3 0 01-3 3H29l-5 5-5-5H7a3 3 0 01-3-3V17a3 3 0 013-3zm2.5 5.5l3 7 3-5 3 5 3-7m9 0v7m3-7v7"/>
      <path fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" d="M11.5 19.5l2.5 6 2.5-4.5 2.5 4.5 2.5-6M28 19.5v6M32 19.5v6"/>
    </svg>
  ),
  tiktok: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <rect width="48" height="48" rx="10" fill="#010101"/>
      <path fill="#EE1D52" d="M33.5 17.5c-1.5-.5-2.8-1.4-3.8-2.5v11.5c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c.3 0 .6 0 .9.1v4.5c-.3-.1-.6-.1-.9-.1-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5V9h4.5c.5 2.5 2.5 4.5 5 5v3.5h-1.2z"/>
      <path fill="#69C9D0" d="M32 17c-1.3-.4-2.5-1.2-3.3-2.3v.8c1 1.2 2.3 2.1 3.8 2.5V17h-.5zm-10.3 7.5c-.3-.1-.6-.1-.9-.1v.5c.3 0 .6.1.9.1v-.5zm-3.5 2.5c0-1.9 1.6-3.5 3.5-3.5v-.5c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4c0-.1 0-.2 0-.3-.4 1.6-1.8 2.8-3.5 2.8-2-.1-3.5-1.6-3.5-3.5zM28 9h-.5v16c0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c.3 0 .6 0 .9.1v-.5c-.3 0-.6-.1-.9-.1-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8V9H28z"/>
      <path fill="white" d="M31.5 16c-1.5-.5-2.8-1.4-3.8-2.5-.7-.9-1.2-2-1.2-3.5H22v17c0 1.9-1.6 3.5-3.5 3.5S15 28.9 15 27s1.6-3.5 3.5-3.5c.3 0 .6.1.9.1v-4.5C19 19 18.8 19 18.5 19c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8V15.8c1 1.1 2.3 2 3.8 2.5V13.5l1.2.5V16h-1.2l.5.5L31.5 16z"/>
    </svg>
  ),
  n8n: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <rect width="48" height="48" rx="10" fill="#FF6D3E"/>
      <circle cx="14" cy="24" r="5" fill="white"/>
      <circle cx="34" cy="24" r="5" fill="white"/>
      <path stroke="white" strokeWidth="2.5" strokeLinecap="round" d="M19 24h10"/>
      <circle cx="14" cy="24" r="2.5" fill="#FF6D3E"/>
      <circle cx="34" cy="24" r="2.5" fill="#FF6D3E"/>
      <text x="24" y="44" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="system-ui">n8n</text>
    </svg>
  ),
  webhook: ({ size = 40 }) => (
    <svg viewBox="0 0 48 48" style={{ width: size, height: size }}>
      <rect width="48" height="48" rx="10" fill="#153959"/>
      <path stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
        d="M14 30 Q18 22 24 22 Q30 22 34 30"/>
      <circle cx="24" cy="16" r="3.5" fill="white"/>
      <circle cx="11" cy="33" r="3.5" fill="white"/>
      <circle cx="37" cy="33" r="3.5" fill="white"/>
      <circle cx="24" cy="16" r="1.5" fill="#153959"/>
      <circle cx="11" cy="33" r="1.5" fill="#153959"/>
      <circle cx="37" cy="33" r="1.5" fill="#153959"/>
    </svg>
  ),
}

// ─── Shared Icons ──────────────────────────────────────────────────────────────
const IcoCheck = ({ className = 'w-3 h-3' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
  </svg>
)
const IcoX = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
  </svg>
)
const IcoTrash = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
  </svg>
)
const IcoLink = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
  </svg>
)
const IcoPencil = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
)
const IcoShield = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
  </svg>
)

// ─── Modal base ────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className={`relative w-full ${maxWidth} bg-white rounded-3xl shadow-2xl overflow-hidden my-4`}>
        {children}
      </div>
    </div>
  )
}

// ─── Reusable sub-components ──────────────────────────────────────────────────
function Label({ children }) {
  return <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{children}</p>
}

function FeatureChip({ text, accent = 'green' }) {
  const map = {
    green:  'bg-[#25D366]/10 text-[#1a9e4f]',
    blue:   'bg-[#4285F4]/10 text-[#2b6ed9]',
    amber:  'bg-amber-50 text-amber-700',
  }
  return (
    <div className={`flex items-center gap-2.5 text-sm px-3 py-2 rounded-xl ${map[accent]}`}>
      <IcoCheck className="w-3 h-3 shrink-0" />
      <span className="text-xs font-medium">{text}</span>
    </div>
  )
}

function StatusBadge({ color, pulse, children }) {
  const map = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue:  'bg-[#4285F4]/10 border-[#4285F4]/20 text-[#2b6ed9]',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red:   'bg-red-50 border-red-200 text-red-600',
    gray:  'bg-gray-50 border-gray-200 text-gray-600',
  }
  const dotMap = { green: 'bg-green-500', blue: 'bg-[#4285F4]', amber: 'bg-amber-500', red: 'bg-red-500', gray: 'bg-gray-400' }
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 border rounded-2xl text-xs font-medium ${map[color]}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotMap[color]} ${pulse ? 'animate-pulse' : ''}`}/>
      {children}
    </div>
  )
}

// ─── WhatsApp Modal ────────────────────────────────────────────────────────────
const WA_FEATURES = [
  'Respuestas automáticas con IA 24/7',
  'Conversaciones sincronizadas al CRM',
  'Catálogo de productos vía WhatsApp',
  'Gestión de ventas desde el chat',
  'Notificaciones automáticas a clientes',
  'Historial completo de conversaciones',
]

const WA_STEPS = [
  'Abre WhatsApp en tu teléfono',
  'Toca los 3 puntos → Dispositivos vinculados',
  'Toca "Vincular un dispositivo" y escanea',
]

function QRCountdown({ startAt = 60 }) {
  const [secs, setSecs] = useState(startAt)
  useEffect(() => {
    setSecs(startAt)
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [startAt])
  const pct = (secs / startAt) * 100
  const color = secs > 20 ? '#25D366' : secs > 10 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <svg viewBox="0 0 20 20" className="w-4 h-4" style={{ color }}>
        <circle cx="10" cy="10" r="8" fill="none" stroke="#e5e7eb" strokeWidth="2.5"/>
        <circle
          cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={`${2 * Math.PI * 8}`}
          strokeDashoffset={`${2 * Math.PI * 8 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transformOrigin: 'center', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <span style={{ color }}>QR expira en <strong>{secs}s</strong></span>
    </div>
  )
}

function WhatsAppModal({ tenantId, open, onClose }) {
  const { data: status, isLoading: loadingStatus } = useWhatsAppStatus(tenantId)
  const connect    = useConnectWhatsApp(tenantId)
  const disconnect = useDisconnectWhatsApp(tenantId)
  const delInst    = useDeleteWhatsAppInstance(tenantId)

  // showQR is only set to true AFTER connect.mutate() succeeds → avoids race condition
  const [showQR, setShowQR] = useState(false)
  // userCanceled prevents auto-reentry into QR view after cancel
  const [userCanceled, setUserCanceled] = useState(false)
  // Inline confirm states (replaces window.confirm)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isConnected  = status?.status === 'open'
  const isConnecting = ['connecting', 'qrcode', 'pending'].includes(status?.status)

  // QR polling: only when showQR is set explicitly (not via isConnecting alone when canceled)
  const qrEnabled = (showQR || (isConnecting && !userCanceled)) && !isConnected
  const { data: qrData, isFetching: fetchingQR } = useWhatsAppQR(tenantId, qrEnabled)
  const qrImage = connect.data?.qr || qrData?.qr

  // If status says connecting (e.g. page reload) and user hasn't canceled, go to QR view
  useEffect(() => {
    if (isConnecting && !showQR && !userCanceled) setShowQR(true)
  }, [isConnecting, userCanceled])

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      connect.reset()
      setShowQR(false)
      setUserCanceled(false)
      setConfirmDisconnect(false)
      setConfirmDelete(false)
    }
  }, [open])

  const handleConnect = () => {
    setUserCanceled(false)
    connect.mutate(undefined, {
      onSuccess: () => setShowQR(true),
    })
  }

  const handleCancelQR = () => {
    // Disconnect to stop the WhatsApp instance from staying in "qrcode" state
    disconnect.mutate()
    connect.reset()
    setShowQR(false)
    setUserCanceled(true)
  }

  const handleDisconnect = () => {
    disconnect.mutate()
    setShowQR(false)
    setConfirmDisconnect(false)
  }

  const handleDelete = () => {
    delInst.mutate()
    setShowQR(false)
    setConfirmDelete(false)
  }

  // Derived phase from state + status
  const currentPhase = isConnected ? 'connected' : showQR ? 'qr' : connect.isPending ? 'initializing' : 'preview'

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#25D366] via-[#1aaa52] to-[#075E54] px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
              <LogoWhatsApp size={36}/>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">WhatsApp Business</h2>
              <p className="text-white/70 text-xs mt-0.5">
                {currentPhase === 'connected'
                  ? `● Activo · ${status?.phone || 'Número conectado'}`
                  : 'Canal oficial de mensajería con IA'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors mt-0.5">
            <IcoX className="w-4 h-4 text-white"/>
          </button>
        </div>

        {currentPhase !== 'connected' && (
          <div className="flex gap-4 mt-5">
            {[
              { label: 'Apertura', value: '98%' },
              { label: 'Respuesta', value: '< 1 min' },
              { label: 'Usuarios', value: '2B+' },
            ].map((s) => (
              <div key={s.label} className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 text-center">
                <p className="text-white font-bold text-base">{s.value}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

        {/* ── CONNECTED ── */}
        {currentPhase === 'connected' && (
          <>
            <StatusBadge color="green" pulse>
              WhatsApp activo · Automatizaciones corriendo
            </StatusBadge>

            {status?.phone && (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Número conectado</p>
                  <p className="text-base font-bold text-gray-800 mt-1">{status.phone}</p>
                </div>
                <div className="w-10 h-10 bg-[#25D366]/10 rounded-2xl flex items-center justify-center">
                  <LogoWhatsApp size={24}/>
                </div>
              </div>
            )}

            <div>
              <Label>Funciones activas</Label>
              <div className="grid grid-cols-2 gap-2">
                {WA_FEATURES.map((f) => <FeatureChip key={f} text={f} accent="green"/>)}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <Label>Zona de riesgo</Label>

              {/* Confirm disconnect inline */}
              {confirmDisconnect ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 space-y-3">
                  <p className="text-sm font-semibold text-red-700">¿Desconectar WhatsApp?</p>
                  <p className="text-xs text-red-600">Las automatizaciones se pausarán hasta que reconectes.</p>
                  <div className="flex gap-2">
                    <button onClick={handleDisconnect} disabled={disconnect.isPending}
                      className="flex-1 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60">
                      {disconnect.isPending ? 'Desconectando...' : 'Sí, desconectar'}
                    </button>
                    <button onClick={() => setConfirmDisconnect(false)}
                      className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : confirmDelete ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 space-y-3">
                  <p className="text-sm font-semibold text-red-700">¿Eliminar instancia?</p>
                  <p className="text-xs text-red-600">Se borrará toda la configuración. Deberás reconectar desde cero.</p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={delInst.isPending}
                      className="flex-1 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-60">
                      {delInst.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDisconnect(true)}
                    className="flex-1 py-2.5 text-sm text-red-500 border border-red-200 rounded-2xl hover:bg-red-50 transition-colors font-semibold"
                  >
                    Cerrar sesión
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-11 h-10 flex items-center justify-center text-gray-400 border border-gray-200 rounded-2xl hover:bg-gray-50 hover:text-red-400 transition-colors"
                    title="Eliminar instancia"
                  >
                    <IcoTrash className="w-4 h-4"/>
                  </button>
                </div>
              )}
              <p className="text-[11px] text-gray-400 mt-2">
                "Cerrar sesión" desvincula el número pero conserva el historial. "Eliminar" borra la instancia completa.
              </p>
            </div>
          </>
        )}

        {/* ── INITIALIZING ── */}
        {currentPhase === 'initializing' && (
          <div className="flex flex-col items-center py-6 gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <LogoWhatsApp size={40}/>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-[#25D366]/30 animate-ping"/>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">Inicializando instancia…</p>
              <p className="text-xs text-gray-400 mt-1">Preparando tu canal de WhatsApp Business</p>
            </div>
            <div className="w-full space-y-2.5">
              {['Creando instancia en Evolution API', 'Generando código QR único', 'Listo para escanear'].map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-gray-500">
                  <div className="w-5 h-5 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                    {i === 0 ? <Spinner size="xs"/> : <span className="text-[#25D366] text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  {s}
                </div>
              ))}
            </div>
            <button onClick={() => { connect.reset(); setUserCanceled(true); setShowQR(false) }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2">
              Cancelar
            </button>
          </div>
        )}

        {/* ── QR SCANNING ── */}
        {currentPhase === 'qr' && (
          <>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-800">Escanea el código QR</p>
              <p className="text-xs text-gray-400 mt-1">Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
            </div>

            <div className="flex flex-col items-center gap-3">
              {qrImage ? (
                <>
                  <div className="p-3 bg-white border-2 border-[#25D366] rounded-2xl shadow-lg shadow-[#25D366]/10">
                    <img src={qrImage} alt="QR WhatsApp" className="w-56 h-56 rounded-lg"/>
                  </div>
                  <QRCountdown key={qrImage} startAt={60}/>
                </>
              ) : (
                <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl gap-3">
                  <Spinner/>
                  <p className="text-xs text-gray-400">{fetchingQR ? 'Generando QR…' : 'Esperando QR…'}</p>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Instrucciones</p>
              {WA_STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="w-5 h-5 rounded-full bg-[#25D366] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {i + 1}
                  </span>
                  {s}
                </div>
              ))}
            </div>

            <StatusBadge color="gray" pulse>
              Esperando escaneo · El QR se actualiza automáticamente
            </StatusBadge>

            <button onClick={handleCancelQR} disabled={disconnect.isPending}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1.5 transition-colors disabled:opacity-50">
              {disconnect.isPending ? 'Cancelando...' : '← Cancelar y volver'}
            </button>
          </>
        )}

        {/* ── PREVIEW ── */}
        {currentPhase === 'preview' && (
          <>
            <p className="text-sm text-gray-500 leading-relaxed">
              Conecta tu número de <strong className="text-gray-700">WhatsApp Business</strong> para activar la IA, las automatizaciones de ventas y la gestión CRM completa desde un solo panel.
            </p>

            <div>
              <Label>Lo que se activa al conectar</Label>
              <div className="grid grid-cols-2 gap-2">
                {WA_FEATURES.map((f) => <FeatureChip key={f} text={f} accent="green"/>)}
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-amber-700">
                Necesitarás tu teléfono para escanear el código QR. El proceso toma menos de 1 minuto.
              </p>
            </div>

            {connect.isError && (
              <StatusBadge color="red">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {connect.error?.response?.data?.message ?? connect.error?.message ?? 'Error al conectar. Intenta de nuevo.'}
              </StatusBadge>
            )}

            <button
              onClick={handleConnect}
              disabled={connect.isPending || loadingStatus}
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#1da851] text-white font-bold rounded-2xl transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
            >
              {connect.isPending
                ? <><Spinner size="xs"/> Iniciando…</>
                : <><LogoWhatsApp size={18}/> Conectar WhatsApp Business</>}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Google Modal ──────────────────────────────────────────────────────────────
const GOOGLE_PERMS = [
  { Logo: LogoGCalendar, label: 'Google Calendar', desc: 'Crear y gestionar citas automáticamente' },
  { Logo: LogoGSheets,   label: 'Google Sheets',   desc: 'Registrar ventas y datos en hojas de cálculo' },
  { Logo: LogoGoogle,    label: 'Perfil de Google', desc: 'Solo tu correo para identificar la cuenta' },
]
const GOOGLE_SYNCS = [
  { text: 'Citas agendadas → evento en Google Calendar', accent: 'blue' },
  { text: 'Nuevas ventas → fila automática en Sheets', accent: 'blue' },
  { text: 'Cancelaciones → evento actualizado en Calendar', accent: 'blue' },
  { text: 'Recordatorios automáticos desde Calendar', accent: 'blue' },
]

function GoogleModal({ tenantId, open, onClose }) {
  const { data: gStatus, isLoading, refetch } = useGoogleStatus(tenantId)
  const disconnect   = useDisconnectGoogle()
  const updateConfig = useUpdateGoogleConfig()
  const isConnected  = gStatus?.connected === true
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [editCal, setEditCal] = useState(false)
  const [editSheet, setEditSheet] = useState(false)
  const [calId, setCalId] = useState('')
  const [sheetId, setSheetId] = useState('')

  useEffect(() => {
    if (gStatus) { setCalId(gStatus.calendarId || ''); setSheetId(gStatus.spreadsheetId || '') }
  }, [gStatus])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      refetch()
      const url = new URL(window.location.href)
      url.searchParams.delete('google')
      window.history.replaceState({}, '', url.toString())
    }
  }, [refetch])

  const handleConnect = async () => {
    setConnecting(true); setError(null)
    try {
      const { tenantsApi } = await import('../../tenants/api')
      const result = await tenantsApi.getGoogleAuthUrl(tenantId)
      const url = result?.url ?? result
      if (!url || typeof url !== 'string') throw new Error('URL inválida')
      window.location.href = url
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'No se pudo iniciar la conexión'
      setError(typeof msg === 'string' ? msg : 'Error de configuración en el servidor')
      setConnecting(false)
    }
  }

  const handleSaveConfig = () => {
    updateConfig.mutate({ tenantId, data: { calendarId: calId, spreadsheetId: sheetId } })
    setEditCal(false); setEditSheet(false)
  }

  const sheetLink = gStatus?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${gStatus.spreadsheetId}`
    : null

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#4285F4] via-[#3367d6] to-[#1a47b8] px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <LogoGoogle size={34}/>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Google Workspace</h2>
              <p className="text-white/70 text-xs mt-0.5">
                {isConnected ? `● Vinculado · ${gStatus?.email || 'Cuenta conectada'}` : 'Calendar · Sheets · Drive'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors">
            <IcoX className="w-4 h-4 text-white"/>
          </button>
        </div>

        {isConnected && (
          <div className="flex gap-3 mt-5">
            {[
              { Logo: LogoGCalendar, label: 'Calendar', active: true },
              { Logo: LogoGSheets,   label: 'Sheets', active: !!gStatus?.spreadsheetId },
              { Logo: LogoGoogle,    label: 'Drive', active: true },
            ].map(({ Logo, label, active }) => (
              <div key={label} className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <Logo size={20}/>
                </div>
                <p className="text-white/80 text-[10px] font-medium">{label}</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-green-400/30 text-green-200' : 'bg-white/10 text-white/40'}`}>
                  {active ? 'Activo' : 'Sin config'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

        {/* ── CONNECTED ── */}
        {isConnected && (
          <>
            <StatusBadge color="blue">
              Cuenta Google vinculada correctamente
            </StatusBadge>

            {/* Account card */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4285F4] rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(gStatus?.email?.[0] ?? 'G').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Cuenta vinculada</p>
                <p className="text-sm font-bold text-gray-800 truncate mt-0.5">{gStatus?.email || '—'}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                <IcoCheck className="w-2.5 h-2.5"/>
                Activo
              </div>
            </div>

            {/* Calendar config */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <LogoGCalendar size={22}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700">Google Calendar</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Citas → eventos automáticos</p>
                </div>
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Activo</span>
              </div>
              <div className="px-4 py-3.5">
                {editCal ? (
                  <div className="space-y-2.5">
                    <input value={calId} onChange={(e) => setCalId(e.target.value)}
                      placeholder="ID del calendario (vacío = primario)"
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20"/>
                    <div className="flex gap-2">
                      <button onClick={handleSaveConfig} disabled={updateConfig.isPending}
                        className="flex-1 py-2 text-xs font-semibold bg-[#4285F4] text-white rounded-xl hover:bg-[#3367d6] transition-colors">
                        {updateConfig.isPending ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditCal(false)}
                        className="flex-1 py-2 text-xs border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold">Calendario activo</p>
                      <p className="text-xs text-gray-700 font-medium mt-0.5">{gStatus?.calendarId || 'Primario (por defecto)'}</p>
                    </div>
                    <button onClick={() => setEditCal(true)} className="flex items-center gap-1 text-xs text-[#4285F4] hover:underline font-medium">
                      <IcoPencil/> Cambiar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Sheets config */}
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-4 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <LogoGSheets size={22}/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-700">Google Sheets</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Ventas y citas → filas automáticas</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gStatus?.spreadsheetId ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {gStatus?.spreadsheetId ? 'Configurado' : 'Sin hoja'}
                </span>
              </div>
              <div className="px-4 py-3.5">
                {editSheet ? (
                  <div className="space-y-2.5">
                    <input value={sheetId} onChange={(e) => setSheetId(e.target.value)}
                      placeholder="ID de la hoja (ej: 1BxiMVs0XRA5nFMd...)"
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#34A853] focus:ring-2 focus:ring-[#34A853]/20"/>
                    <p className="text-[10px] text-gray-400">Dejar vacío para crear una hoja nueva automáticamente.</p>
                    <div className="flex gap-2">
                      <button onClick={handleSaveConfig} disabled={updateConfig.isPending}
                        className="flex-1 py-2 text-xs font-semibold bg-[#34A853] text-white rounded-xl hover:bg-[#2d9249] transition-colors">
                        {updateConfig.isPending ? 'Guardando…' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditSheet(false)}
                        className="flex-1 py-2 text-xs border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold">Hoja de cálculo</p>
                      {gStatus?.spreadsheetId ? (
                        <a href={sheetLink} target="_blank" rel="noreferrer"
                          className="text-xs text-[#34A853] font-medium hover:underline flex items-center gap-1 mt-0.5">
                          Abrir en Google Sheets <IcoLink/>
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">Se crea automáticamente al primer uso</p>
                      )}
                    </div>
                    <button onClick={() => setEditSheet(true)} className="flex items-center gap-1 text-xs text-[#4285F4] hover:underline font-medium">
                      <IcoPencil/> Cambiar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-1 border-t border-gray-100">
              <button
                onClick={() => { if (window.confirm('¿Desvincular la cuenta de Google?')) disconnect.mutate(tenantId) }}
                disabled={disconnect.isPending}
                className="w-full py-2.5 text-sm text-red-500 border border-red-200 rounded-2xl hover:bg-red-50 transition-colors font-semibold"
              >
                {disconnect.isPending ? 'Desvinculando…' : 'Desvincular cuenta Google'}
              </button>
            </div>
          </>
        )}

        {/* ── DISCONNECTED ── */}
        {!isConnected && (
          <>
            <p className="text-sm text-gray-500 leading-relaxed">
              Vincula tu cuenta de <strong className="text-gray-700">Google Workspace</strong> para sincronizar citas en Calendar y registrar ventas en Sheets de forma automática.
            </p>

            <div>
              <Label>Acceso que se solicitará</Label>
              <div className="space-y-2">
                {GOOGLE_PERMS.map(({ Logo, label, desc }) => (
                  <div key={label} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 border border-gray-100">
                      <Logo size={20}/>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">{label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Datos que se sincronizarán</Label>
              <div className="space-y-1.5">
                {GOOGLE_SYNCS.map((s) => <FeatureChip key={s.text} text={s.text} accent="blue"/>)}
              </div>
            </div>

            {error && (
              <StatusBadge color="red">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {error}
              </StatusBadge>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleConnect} disabled={connecting || isLoading}
              className="w-full py-3 bg-white border-2 border-gray-200 hover:border-[#4285F4] hover:shadow-lg hover:shadow-[#4285F4]/10 text-gray-700 font-semibold rounded-2xl transition-all text-sm flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {connecting ? (
                <><Spinner size="xs"/> Redirigiendo a Google…</>
              ) : (
                <><LogoGoogle size={20}/> Iniciar sesión con Google</>
              )}
            </button>

            <div className="flex items-center gap-2 justify-center text-[11px] text-gray-400">
              <IcoShield className="w-3.5 h-3.5 text-gray-300"/>
              Serás redirigido a Google de forma segura. SharkByte nunca almacena tu contraseña.
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

const API_BASE_CH = 'https://api.sharkbyteia.com'
const N8N_BASE_CH = 'https://n8n.sharkbyteia.com'
const WEBHOOK_META = `${API_BASE_CH}/webhooks/meta`

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sb-primary bg-white'

function CopyBtn({ text }) {
  const [done, setDone] = useState(false)
  return (
    <button type="button"
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      className="shrink-0 text-xs text-gray-400 hover:text-sb-primary transition-colors px-1.5">
      {done ? '✓ Copiado' : '⎘ Copiar'}
    </button>
  )
}

function SecretInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} className={inputCls + ' pr-16'}/>
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600">
        {show ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  )
}

// ─── Meta Setup Modal (Facebook + Instagram unificados) ────────────────────────

function MetaSetupModal({ tenantId, fbData, igData, open, onClose }) {
  const empty = {
    pageId: '', accessToken: '', appSecret: '', webhookVerifyToken: '',
    instagramAccountId: '',
  }
  const [form, setForm]       = useState(empty)
  const [testResult, setTest] = useState(null)   // null | { ok, pageName, pageId, instagramId, error, diagnosis }
  const [testing, setTesting] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [confirmDel, setDel]  = useState(false)
  const [showGuide, setGuide] = useState(false)

  const upsert = useUpsertChannel(tenantId)
  const remove = useDeleteChannel(tenantId)

  const isConnected = !!fbData

  useEffect(() => {
    if (!open) return
    setForm(fbData
      ? { pageId: fbData.pageId || '', accessToken: fbData.accessToken || '',
          appSecret: fbData.appSecret || '', webhookVerifyToken: fbData.webhookVerifyToken || '',
          instagramAccountId: igData?.instagramAccountId || '' }
      : empty)
    setTest(null)
    setTesting(false)
    setSaving(false)
    setDel(false)
    setGuide(false)
  }, [open])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleTest = async () => {
    if (!form.accessToken) return
    setTesting(true)
    setTest(null)
    try {
      const { tenantsApi } = await import('../../tenants/api')
      const result = await tenantsApi.testMetaToken(tenantId, form.accessToken)
      setTest(result)
      // auto-fill pageId and instagramAccountId from test result
      if (result.ok) {
        setForm(f => ({
          ...f,
          pageId: result.pageId || f.pageId,
          instagramAccountId: result.instagramId || f.instagramAccountId,
        }))
      }
    } catch {
      setTest({ ok: false, error: 'Error al contactar el servidor', diagnosis: 'Intenta de nuevo.' })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const base = { accessToken: form.accessToken, appSecret: form.appSecret,
        webhookVerifyToken: form.webhookVerifyToken, isActive: true }
      await upsert.mutateAsync({
        platform: 'facebook', pageId: form.pageId,
        n8nWebhookUrl: `${N8N_BASE_CH}/webhook/facebook-handler`, ...base,
      })
      await upsert.mutateAsync({
        platform: 'instagram', instagramAccountId: form.instagramAccountId,
        n8nWebhookUrl: `${N8N_BASE_CH}/webhook/instagram-handler`, ...base,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    await remove.mutateAsync('facebook')
    await remove.mutateAsync('instagram')
    onClose()
  }

  const canSave = form.accessToken && form.appSecret && form.webhookVerifyToken && form.pageId

  return (
    <Modal open={open} onClose={onClose}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0866FF] to-[#0042b4] px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">Meta</h2>
              {isConnected
                ? <span className="text-[10px] font-bold bg-green-400 text-white px-2 py-0.5 rounded-full">Conectado</span>
                : <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">Sin conectar</span>
              }
            </div>
            <p className="text-white/70 text-xs mt-0.5">
              {isConnected
                ? 'Facebook Messenger + Instagram DM activos'
                : 'Una sola conexión habilita Facebook Messenger e Instagram DM'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">

        {/* Webhook URL — lo más importante */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-800 mb-1">
            URL del webhook <span className="font-normal text-blue-600">(copia esto en Meta Developers)</span>
          </p>
          <div className="flex items-center justify-between gap-2 bg-white border border-blue-200 rounded-xl px-3 py-2">
            <code className="text-xs text-blue-900 break-all">{WEBHOOK_META}</code>
            <CopyBtn text={WEBHOOK_META} />
          </div>
          <p className="text-[11px] text-blue-600 mt-2">
            Úsala en <strong>Messenger → Webhooks</strong> y también en <strong>Instagram → Webhooks</strong>
          </p>
        </div>

        {/* Guía rápida */}
        <button type="button" onClick={() => setGuide(g => !g)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
          <span className="font-medium">¿Cómo obtener las credenciales?</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        {showGuide && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-xs text-slate-700">
            <div className="space-y-2">
              {[
                { n: '1', t: 'Crea una app en', link: 'developers.facebook.com', href: 'https://developers.facebook.com', post: '→ Tipo: Empresa' },
                { n: '2', t: 'Agrega los productos: Messenger e Instagram' },
                { n: '3', t: 'Ve a Messenger → Configuración → Tokens de acceso → genera el Page Access Token' },
                { n: '4', t: 'Ve a Configuración → Básica → copia el App Secret' },
                { n: '5', t: 'Ve a Messenger → Webhooks → agrega la URL de arriba y un Verify Token tuyo → suscríbete a: messages' },
                { n: '6', t: 'Repite el paso 5 en Instagram → Webhooks' },
              ].map(s => (
                <div key={s.n} className="flex gap-2.5 items-start">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">{s.n}</span>
                  <span>
                    {s.t}{' '}
                    {s.link && <a href={s.href} target="_blank" rel="noreferrer" className="text-blue-600 underline">{s.link}</a>}
                    {s.post && <span className="text-slate-500"> {s.post}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="space-y-4">
          {/* Access Token + botón probar */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Page Access Token</label>
            <SecretInput value={form.accessToken} onChange={set('accessToken')} placeholder="EAABwz..."/>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-gray-400">Token de tu Página de Facebook (Messenger → Tokens de acceso)</p>
              <button type="button" onClick={handleTest} disabled={!form.accessToken || testing}
                className="shrink-0 text-xs font-semibold text-[#0866FF] border border-[#0866FF]/30 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors">
                {testing ? 'Verificando...' : 'Probar token'}
              </button>
            </div>
            {/* Test result */}
            {testResult && (
              <div className={`mt-2 px-3 py-2.5 rounded-xl text-xs flex items-start gap-2 ${testResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <span className={`mt-0.5 text-base leading-none ${testResult.ok ? 'text-green-500' : 'text-red-500'}`}>
                  {testResult.ok ? '✓' : '✕'}
                </span>
                <div>
                  {testResult.ok
                    ? <>
                        <p className="font-semibold text-green-800">Token válido</p>
                        <p className="text-green-700 mt-0.5">
                          Página: <strong>{testResult.pageName}</strong>
                          {testResult.instagramId && <span className="ml-2">· Instagram detectado ✓</span>}
                        </p>
                      </>
                    : <>
                        <p className="font-semibold text-red-800">{testResult.error}</p>
                        {testResult.diagnosis && <p className="text-red-600 mt-0.5">{testResult.diagnosis}</p>}
                      </>
                  }
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">App Secret</label>
            <SecretInput value={form.appSecret} onChange={set('appSecret')} placeholder="abc123def456..."/>
            <p className="text-[11px] text-gray-400 mt-1">Configuración → Básica → App Secret</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Verify Token</label>
            <input value={form.webhookVerifyToken} onChange={set('webhookVerifyToken')}
              placeholder="ej. sharkbyte_mi_negocio" className={inputCls}/>
            <p className="text-[11px] text-gray-400 mt-1">Cualquier texto que inventas tú — úsalo en Meta Developers al configurar el webhook</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Page ID
              {testResult?.ok && testResult.pageId && (
                <span className="ml-2 text-green-600 font-normal">· detectado automáticamente</span>
              )}
            </label>
            <input value={form.pageId} onChange={set('pageId')}
              placeholder="123456789012345" className={inputCls}/>
            <p className="text-[11px] text-gray-400 mt-1">ID numérico de tu Página de Facebook</p>
          </div>

          {(form.instagramAccountId || testResult?.ok) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Instagram Account ID
                {testResult?.instagramId && (
                  <span className="ml-2 text-green-600 font-normal">· detectado automáticamente</span>
                )}
              </label>
              <input value={form.instagramAccountId} onChange={set('instagramAccountId')}
                placeholder="17841234567890123" className={inputCls}/>
              <p className="text-[11px] text-gray-400 mt-1">Déjalo vacío si no usas Instagram DM</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div>
            {isConnected && !confirmDel && (
              <button type="button" onClick={() => setDel(true)}
                className="text-xs text-red-400 hover:text-red-600">Desconectar Meta</button>
            )}
            {confirmDel && (
              <div className="flex gap-2">
                <button onClick={handleDisconnect} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg">Confirmar</button>
                <button onClick={() => setDel(false)} className="text-xs text-gray-400 px-2">Cancelar</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-gray-400 px-4 py-2 rounded-xl">Cancelar</button>
            <button onClick={handleSave} disabled={saving || !canSave}
              className="text-sm bg-[#0866FF] text-white px-5 py-2 rounded-xl hover:bg-[#0042b4] disabled:opacity-40 font-medium transition-colors">
              {saving ? 'Guardando...' : isConnected ? 'Guardar cambios' : 'Conectar Meta'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Simple Channel Modal (Telegram / TikTok) ──────────────────────────────────

const SIMPLE_CHANNEL_CFG = {
  telegram: {
    label: 'Telegram', gradient: 'bg-gradient-to-br from-[#26A5E4] to-[#1a7ab3]',
    webhookNote: 'El webhook se registra automáticamente al guardar.',
    fields: [
      { key: 'botToken',      label: 'Bot Token',        placeholder: '123456789:ABCdef...', secret: true, hint: 'Obtenido de @BotFather en Telegram' },
      { key: 'botUsername',   label: 'Username del Bot', placeholder: '@MiTiendaBot',        hint: 'Nombre del bot (con @)' },
    ],
    defaultN8n: `${N8N_BASE_CH}/webhook/telegram-handler`,
    guide: ['Busca @BotFather en Telegram', 'Envía /newbot y sigue las instrucciones', 'Copia el token y pégalo aquí', 'Guarda — el webhook se registra automáticamente'],
  },
  tiktok: {
    label: 'TikTok Messages', gradient: 'bg-gradient-to-br from-[#444] to-[#010101]',
    webhookUrl: `${API_BASE_CH}/webhooks/tiktok`,
    fields: [
      { key: 'tiktokAccountId',   label: 'Account ID (open_id)', placeholder: 'abc123xyz...' },
      { key: 'tiktokAccessToken', label: 'Access Token',         placeholder: 'act.abc123...', secret: true, hint: 'Token con permisos de mensajería directa' },
    ],
    defaultN8n: `${N8N_BASE_CH}/webhook/tiktok-handler`,
    guide: ['Crea una app en developers.tiktok.com', 'Habilita la API de mensajes directos', `Registra el webhook: ${API_BASE_CH}/webhooks/tiktok`, 'Obtén el open_id y genera un access token con permisos DM'],
  },
}

function SimpleChannelModal({ platformId, tenantId, channelData, open, onClose }) {
  const cfg = SIMPLE_CHANNEL_CFG[platformId]
  const emptyForm = { platform: platformId, isActive: true, n8nWebhookUrl: cfg?.defaultN8n ?? '',
    botToken: '', botUsername: '', tiktokAccountId: '', tiktokAccessToken: '' }

  const [form, setForm]   = useState(emptyForm)
  const [showGuide, setG] = useState(false)
  const [saving, setS]    = useState(false)
  const [confirmDel, setD]= useState(false)

  const upsert = useUpsertChannel(tenantId)
  const remove = useDeleteChannel(tenantId)

  useEffect(() => {
    if (!open) return
    setForm(channelData ? { ...emptyForm, ...channelData, n8nWebhookUrl: channelData.n8nWebhookUrl || cfg.defaultN8n } : emptyForm)
    setG(false); setS(false); setD(false)
  }, [open])

  if (!cfg) return null

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const isConnected = !!channelData

  const handleSave = async () => {
    setS(true)
    try { await upsert.mutateAsync(form); onClose() }
    finally { setS(false) }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={`${cfg.gradient} px-6 py-5`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold text-lg">{cfg.label}</h2>
              {isConnected
                ? <span className="text-[10px] font-bold bg-green-400 text-white px-2 py-0.5 rounded-full">Conectado</span>
                : <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">Sin conectar</span>
              }
            </div>
            <p className="text-white/70 text-xs mt-0.5">Canal de mensajería con IA</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {cfg.webhookUrl && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">URL del webhook</p>
            <div className="flex items-center justify-between">
              <code className="text-xs text-slate-700 break-all">{cfg.webhookUrl}</code>
              <CopyBtn text={cfg.webhookUrl}/>
            </div>
          </div>
        )}
        {cfg.webhookNote && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {cfg.webhookNote}
          </div>
        )}

        <button type="button" onClick={() => setG(g => !g)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-dashed border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
          <span>¿Cómo configurarlo?</span>
          <svg className={`w-3.5 h-3.5 transition-transform ${showGuide ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        {showGuide && (
          <ol className="space-y-1.5">
            {cfg.guide.map((s, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center">{i+1}</span>
                {s}
              </li>
            ))}
          </ol>
        )}

        {cfg.fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
            {field.secret
              ? <SecretInput value={form[field.key] ?? ''} onChange={set(field.key)} placeholder={field.placeholder}/>
              : <input value={form[field.key] ?? ''} onChange={set(field.key)} placeholder={field.placeholder} className={inputCls}/>
            }
            {field.hint && <p className="text-[11px] text-gray-400 mt-1">{field.hint}</p>}
          </div>
        ))}

        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <div>
            {isConnected && !confirmDel && (
              <button onClick={() => setD(true)} className="text-xs text-red-400 hover:text-red-600">Desconectar</button>
            )}
            {confirmDel && (
              <div className="flex gap-2">
                <button onClick={async () => { await remove.mutateAsync(platformId); onClose() }}
                  className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg">Confirmar</button>
                <button onClick={() => setD(false)} className="text-xs text-gray-400">Cancelar</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-gray-400 px-4 py-2 rounded-xl">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="text-sm bg-sb-primary text-white px-5 py-2 rounded-xl hover:bg-sb-primary/90 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : isConnected ? 'Guardar cambios' : 'Conectar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Coming Soon Modal ─────────────────────────────────────────────────────────
function ComingSoonModal({ open, onClose, config }) {
  if (!config) return null
  const { Logo, name, gradient, description, features, eta } = config
  return (
    <Modal open={open} onClose={onClose}>
      <div className={`${gradient} px-6 py-5`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Logo size={34}/>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{name}</h2>
              <p className="text-white/70 text-xs mt-0.5">Próximamente disponible</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 transition-colors">
            <IcoX className="w-4 h-4 text-white"/>
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-9 h-9 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
            <svg className="w-4.5 h-4.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800">En desarrollo activo</p>
            {eta && <p className="text-[11px] text-amber-600 mt-0.5">Estimado: {eta}</p>}
          </div>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>

        <div>
          <Label>Lo que podrás hacer</Label>
          <div className="space-y-1.5">
            {features.map((f) => <FeatureChip key={f} text={f} accent="blue"/>)}
          </div>
        </div>

        <button onClick={onClose}
          className="w-full py-3 bg-gray-100 text-gray-600 font-semibold rounded-2xl text-sm hover:bg-gray-200 transition-colors">
          Entendido, me avisas cuando esté listo
        </button>
      </div>
    </Modal>
  )
}

// ─── Coming Soon Configs ───────────────────────────────────────────────────────
const COMING_SOON = {
  meta: {
    Logo: AppLogos.meta, name: 'Meta Platforms', gradient: 'bg-gradient-to-br from-[#0866FF] to-[#0042b4]',
    description: 'Conecta tu cuenta de Meta Business para gestionar mensajes de Facebook e Instagram desde SharkByte.',
    features: ['Mensajes de Facebook Messenger al CRM', 'Respuestas automáticas con IA en Messenger', 'Leads de Facebook Ads → CRM automático', 'Historial unificado de conversaciones'],
    eta: 'Q2 2026',
  },
  instagram: {
    Logo: AppLogos.instagram, name: 'Instagram', gradient: 'bg-gradient-to-br from-[#fd5949] to-[#d6249f]',
    description: 'Gestiona mensajes directos de Instagram y automatiza respuestas a DMs y comentarios.',
    features: ['DMs de Instagram al CRM en tiempo real', 'Respuestas automáticas personalizadas', 'Captación de leads desde el perfil', 'Notificaciones de comentarios en posts'],
    eta: 'Q2 2026',
  },
  facebook: {
    Logo: AppLogos.facebook, name: 'Facebook', gradient: 'bg-gradient-to-br from-[#1877F2] to-[#0f4fa8]',
    description: 'Integra tu página de Facebook para recibir mensajes y gestionar comentarios directamente.',
    features: ['Bandeja unificada de Messenger', 'IA respondiendo comentarios automáticamente', 'Leads de formularios nativos de Facebook', 'Publicación programada desde SharkByte'],
    eta: 'Q2 2026',
  },
  telegram: {
    Logo: AppLogos.telegram, name: 'Telegram', gradient: 'bg-gradient-to-br from-[#26A5E4] to-[#1a7ab3]',
    description: 'Conecta un bot de Telegram para atender clientes y automatizar procesos por este canal.',
    features: ['Bot de Telegram con IA integrada', 'Comandos rápidos (/catalogo, /pedido)', 'Notificaciones masivas a grupos', 'Conversaciones sincronizadas al CRM'],
    eta: 'Q3 2026',
  },
  shopify: {
    Logo: AppLogos.shopify, name: 'Shopify', gradient: 'bg-gradient-to-br from-[#96BF48] to-[#5e7a2c]',
    description: 'Sincroniza tu tienda Shopify con SharkByte para notificaciones de pedidos y recuperación de carritos vía WhatsApp.',
    features: ['Notificaciones de pedidos por WhatsApp', 'Estado de envío automático al cliente', 'Carrito abandonado → mensaje de recuperación', 'Inventario sincronizado al catálogo CRM'],
    eta: 'Q3 2026',
  },
  woocommerce: {
    Logo: AppLogos.woocommerce, name: 'WooCommerce', gradient: 'bg-gradient-to-br from-[#7F54B3] to-[#5a3b80]',
    description: 'Conecta tu tienda WooCommerce para automatizar la comunicación de pedidos y ventas con tus clientes.',
    features: ['Webhooks de pedidos → CRM en tiempo real', 'Confirmación y seguimiento vía WhatsApp', 'Catálogo de productos en el CRM', 'Clientes y ventas sincronizados'],
    eta: 'Q4 2026',
  },
  tiktok: {
    Logo: AppLogos.tiktok, name: 'TikTok Shop', gradient: 'bg-gradient-to-br from-[#444] to-[#010101]',
    description: 'Integra TikTok Shop para gestionar pedidos y comunicarte con compradores directamente.',
    features: ['Pedidos TikTok Shop → CRM automático', 'Mensajes de compradores en bandeja unificada', 'Notificaciones de envío personalizadas', 'Reseñas y devoluciones centralizadas'],
    eta: 'Q4 2026',
  },
  n8n: {
    Logo: AppLogos.n8n, name: 'n8n Workflows', gradient: 'bg-gradient-to-br from-[#FF6D3E] to-[#c44420]',
    description: 'Accede al panel de automatización n8n para crear flujos personalizados y conectar cualquier herramienta.',
    features: ['Editor visual de flujos de trabajo', 'Conecta con 400+ herramientas externas', 'Webhooks bidireccionales configurables', 'Ejecuciones programadas y en tiempo real'],
    eta: 'Q2 2026',
  },
  webhook: {
    Logo: AppLogos.webhook, name: 'Webhooks', gradient: 'bg-gradient-to-br from-sb-primary to-sb-dark',
    description: 'Configura webhooks para recibir y enviar eventos a cualquier servicio externo en tiempo real.',
    features: ['URL de webhook personalizable', 'Filtros avanzados por tipo de evento', 'Reintento automático en caso de fallo', 'Logs de peticiones en tiempo real'],
    eta: 'Q2 2026',
  },
}

// ─── Integration Card ──────────────────────────────────────────────────────────
function IntegrationCard({ logo, name, description, connected, comingSoon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-2xl border p-5 flex flex-col items-center gap-3 transition-all duration-200 text-center w-full group relative overflow-hidden ${
        connected
          ? 'border-[#25D366]/30 shadow-md shadow-[#25D366]/5 hover:shadow-lg hover:shadow-[#25D366]/10'
          : comingSoon
          ? 'border-gray-100 opacity-70 hover:opacity-100 hover:shadow-md'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
    >
      {connected && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#25D366]/0 via-[#25D366] to-[#25D366]/0"/>
      )}
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm bg-gray-50 group-hover:scale-105 transition-transform duration-200">
          {logo}
        </div>
        {connected && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <IcoCheck className="w-2.5 h-2.5 text-white"/>
          </span>
        )}
        {comingSoon && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-white">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01"/>
            </svg>
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-800 leading-tight">{name}</p>
        {description && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{description}</p>}
      </div>
      <span className={`text-[10px] font-semibold px-3 py-1 rounded-full transition-colors ${
        connected
          ? 'bg-green-100 text-green-700'
          : comingSoon
          ? 'bg-gray-100 text-gray-400'
          : 'bg-gray-100 text-gray-500 group-hover:bg-sb-primary/10 group-hover:text-sb-primary'
      }`}>
        {connected ? '● Conectado' : comingSoon ? 'Próximamente' : 'Conectar'}
      </span>
    </button>
  )
}

// ─── Section Header ────────────────────────────────────────────────────────────
const SECTION_ICONS = {
  chat: (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
    </svg>
  ),
  zap: (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
    </svg>
  ),
  cart: (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  ),
  gear: (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  ),
}

function SectionHeader({ title, subtitle, iconKey }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
        {SECTION_ICONS[iconKey]}
      </div>
      <div>
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-widest">{title}</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function IntegrationsPage({ tenantId: tenantIdProp } = {}) {
  const { user } = useAuthStore()
  const tenantId = tenantIdProp ?? user?.tenantId

  const { data: gStatus }   = useGoogleStatus(tenantId)
  const { data: waStatus }  = useWhatsAppStatus(tenantId)
  const { data: channels = [] } = useChannels(tenantId)

  const isGoogleConnected = gStatus?.connected === true
  const isWaConnected     = waStatus?.status === 'open'

  const channelMap = channels.reduce((acc, ch) => { acc[ch.platform] = ch; return acc }, {})
  const isFbConnected  = !!channelMap.facebook?.isActive
  const isIgConnected  = !!channelMap.instagram?.isActive
  const isTgConnected  = !!channelMap.telegram?.isActive
  const isTtConnected  = !!channelMap.tiktok?.isActive

  const [modal, setModal] = useState(null)
  const isMetaConnected = isFbConnected || isIgConnected
  const connectedCount = [isGoogleConnected, isWaConnected, isMetaConnected, isTgConnected, isTtConnected].filter(Boolean).length

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Integraciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">Conecta tus herramientas favoritas para potenciar SharkByte</p>
        </div>
        {connectedCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-green-50 border border-green-200 rounded-2xl">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
            <span className="text-xs text-green-700 font-semibold">
              {connectedCount} {connectedCount === 1 ? 'integración activa' : 'integraciones activas'}
            </span>
          </div>
        )}
      </div>

      {/* Comunicación */}
      <section>
        <SectionHeader title="Comunicación" subtitle="Canales de mensajería y redes sociales" iconKey="chat"/>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <IntegrationCard
            logo={<LogoWhatsApp size={40}/>}
            name="WhatsApp Business"
            description="Mensajería con IA"
            connected={isWaConnected}
            onClick={() => setModal('whatsapp')}
          />
          <IntegrationCard
            logo={<AppLogos.meta size={40}/>}
            name="Meta"
            description="Facebook + Instagram"
            connected={isFbConnected || isIgConnected}
            onClick={() => setModal('meta')}
          />
          <IntegrationCard
            logo={<AppLogos.telegram size={40}/>}
            name="Telegram"
            description="Bot con IA"
            connected={isTgConnected}
            onClick={() => setModal('telegram')}
          />
          <IntegrationCard
            logo={<AppLogos.tiktok size={40}/>}
            name="TikTok Messages"
            description="DMs de TikTok"
            connected={isTtConnected}
            onClick={() => setModal('tiktok')}
          />
        </div>
      </section>

      {/* Productividad */}
      <section>
        <SectionHeader title="Productividad" subtitle="Agenda, datos y herramientas Google" iconKey="zap"/>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <IntegrationCard
            logo={<LogoGoogle size={40}/>}
            name="Google"
            description="Workspace completo"
            connected={isGoogleConnected}
            onClick={() => setModal('google')}
          />
          <IntegrationCard
            logo={<LogoGCalendar size={40}/>}
            name="Google Calendar"
            description="Citas automáticas"
            connected={isGoogleConnected}
            onClick={() => setModal('google')}
          />
          <IntegrationCard
            logo={<LogoGSheets size={40}/>}
            name="Google Sheets"
            description="Registro de datos"
            connected={isGoogleConnected}
            onClick={() => setModal('google')}
          />
        </div>
      </section>

      {/* Ecommerce */}
      <section>
        <SectionHeader title="Ecommerce" subtitle="Plataformas de tiendas en línea" iconKey="cart"/>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <IntegrationCard logo={<AppLogos.shopify size={40}/>} name="Shopify" description="Pedidos y envíos" comingSoon onClick={() => setModal('shopify')}/>
          <IntegrationCard logo={<AppLogos.woocommerce size={40}/>} name="WooCommerce" description="Tienda WordPress" comingSoon onClick={() => setModal('woocommerce')}/>
        </div>
      </section>

      {/* Automatización */}
      <section>
        <SectionHeader title="Automatización" subtitle="Flujos personalizados y webhooks" iconKey="gear"/>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <IntegrationCard logo={<AppLogos.n8n size={40}/>} name="n8n Workflows" description="Automatización visual" comingSoon onClick={() => setModal('n8n')}/>
          <IntegrationCard logo={<AppLogos.webhook size={40}/>} name="Webhooks" description="APIs personalizadas" comingSoon onClick={() => setModal('webhook')}/>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-sb-primary/8 via-sb-primary/5 to-transparent border border-sb-primary/15 rounded-3xl p-5 flex items-center gap-4">
        <div className="w-11 h-11 bg-sb-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-sb-dark">¿Necesitas una integración específica?</p>
          <p className="text-xs text-sb-primary/80 mt-0.5">Shopify, WooCommerce y más estarán disponibles próximamente.</p>
        </div>
      </div>

      {/* Modals */}
      <WhatsAppModal tenantId={tenantId} open={modal === 'whatsapp'} onClose={() => setModal(null)}/>
      <GoogleModal   tenantId={tenantId} open={modal === 'google'}   onClose={() => setModal(null)}/>
      <MetaSetupModal
        tenantId={tenantId}
        fbData={channelMap.facebook || null}
        igData={channelMap.instagram || null}
        open={modal === 'meta'}
        onClose={() => setModal(null)}
      />
      <SimpleChannelModal platformId="telegram" tenantId={tenantId} channelData={channelMap.telegram || null} open={modal === 'telegram'} onClose={() => setModal(null)}/>
      <SimpleChannelModal platformId="tiktok"   tenantId={tenantId} channelData={channelMap.tiktok   || null} open={modal === 'tiktok'}   onClose={() => setModal(null)}/>
      {['shopify', 'woocommerce', 'n8n', 'webhook'].map((key) => (
        <ComingSoonModal key={key} open={modal === key} onClose={() => setModal(null)} config={COMING_SOON[key]}/>
      ))}
    </div>
  )
}
