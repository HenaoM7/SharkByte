import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, useLogout } from '../../modules/auth/hooks'
import { useTenant } from '../../modules/tenants/hooks'
import { useSidebarStore } from '../store/sidebarStore'
import ChangePasswordModal from '../../modules/auth/components/ChangePasswordModal'

// ── Clean route labels — users never see technical paths ──────────────────────
const ROUTE_LABELS = {
  '/admin/dashboard':   'Dashboard',
  '/admin/tenants':     'Clientes',
  '/admin/planes':      'Planes',
  '/admin/users':       'Usuarios',
  '/admin/billing':     'Facturación',
  '/admin/analytics':   'Analytics',
  '/admin/automation':  'Automatización',
  '/app/dashboard':     'Dashboard',
  '/app/conversations': 'Conversaciones',
  '/app/crm':           'Contactos',
  '/app/pipeline':      'Pipeline',
  '/app/sales':         'Ventas',
  '/app/agenda':        'Agenda',
  '/app/integrations':  'Integraciones',
  '/app/billing':       'Facturación',
  '/app/settings':      'Mi Negocio',
}

const TAB_LABELS = {
  conversations: 'Conversaciones',
  crm:           'CRM',
  pipeline:      'Pipeline',
  sales:         'Ventas',
  agenda:        'Agenda',
  integrations:  'Integraciones',
  config:        'Configuración',
}

const ROLE_LABELS = {
  super_admin: 'Super Administrador',
  admin:       'Administrador',
  owner:       'Propietario',
  viewer:      'Observador',
  agent:       'Agente',
}

function useBreadcrumb() {
  const { pathname } = useLocation()

  // Admin tenant sub-routes: /admin/tenants/:id[/tab[/...]]
  const tenantMatch = pathname.match(/^\/admin\/tenants\/[^/]+(\/([^/]+))?/)
  if (tenantMatch) {
    const tab = tenantMatch[2]
    const crumbs = [{ label: 'Clientes', to: '/admin/tenants' }]
    if (tab && TAB_LABELS[tab]) crumbs.push({ label: TAB_LABELS[tab], to: null })
    return crumbs
  }

  // CRM contact detail
  if (pathname.match(/^\/app\/crm\/.+/)) {
    return [
      { label: 'Contactos', to: '/app/crm' },
      { label: 'Detalle', to: null },
    ]
  }

  const label = ROUTE_LABELS[pathname]
  return [{ label: label ?? 'SharkByte', to: null }]
}

// ── Profile Panel (right-side drawer) ─────────────────────────────────────────
function ProfilePanel({ user, tenant, onClose, onChangePassword, onLogout }) {
  const initials = (user?.email?.[0] ?? 'U').toUpperCase()
  const roleLabel = ROLE_LABELS[user?.role] ?? (user?.role ?? 'Usuario')
  const businessName = tenant?.name
  const isOwner = user?.role === 'owner' || user?.role === 'viewer'
  const planId = typeof tenant?.plan === 'object' ? tenant?.plan?.name : tenant?.plan
  const planLabel = planId
    ? { free: 'Plan Gratuito', pro: 'Plan Pro', enterprise: 'Plan Enterprise' }[planId] ?? planId
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Mi Perfil</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Identity banner */}
        <div className="px-5 py-5 bg-sb-dark text-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-sb-primary/30 border border-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.email}</p>
              <p className="text-white/60 text-xs mt-0.5">{roleLabel}</p>
              {businessName && (
                <p className="text-white/50 text-xs mt-0.5 truncate">{businessName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Account info */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Información de cuenta
            </p>
            <div className="space-y-3">
              <InfoRow label="Correo" value={user?.email} />
              <InfoRow label="Rol" value={roleLabel} />
              {user?.tenantId && (
                <InfoRow label="ID de cuenta" value={user.tenantId} mono />
              )}
            </div>
          </div>

          {/* Business info — owners only */}
          {isOwner && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Tu negocio
              </p>
              <div className="space-y-3">
                <InfoRow
                  label="Nombre"
                  value={businessName ?? '—'}
                />
                {planLabel && <InfoRow label="Plan activo" value={planLabel} />}
                {tenant?.status && (
                  <InfoRow
                    label="Estado"
                    value={{ active: 'Activo', trial: 'Trial', inactive: 'Inactivo' }[tenant.status] ?? tenant.status}
                  />
                )}
              </div>
            </div>
          )}

          {/* Access level */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Nivel de acceso
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-sb-primary/10 rounded-xl flex items-center justify-center">
                <svg className="w-4 h-4 text-sb-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{roleLabel}</p>
                <p className="text-xs text-gray-400">
                  {user?.role === 'super_admin' && 'Acceso total al sistema'}
                  {user?.role === 'admin' && 'Administración de tenants'}
                  {user?.role === 'owner' && 'Gestión completa del negocio'}
                  {user?.role === 'viewer' && 'Solo lectura'}
                  {user?.role === 'agent' && 'Atención al cliente'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Configuración
            </p>
            <button
              onClick={onChangePassword}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Cambiar contraseña
            </button>
          </div>
        </div>

        {/* Sticky footer — logout */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
          <p className="text-center text-[10px] text-gray-300 mt-3">SharkByte CRM v1.0.0</p>
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-xs text-gray-700 text-right truncate ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Avatar button ─────────────────────────────────────────────────────────────
function UserButton({ user, onClick }) {
  const initials = (user?.email?.[0] ?? 'U').toUpperCase()
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sb-bg transition-colors"
      title="Mi perfil"
    >
      <div className="w-7 h-7 bg-sb-primary/10 rounded-full flex items-center justify-center">
        <span className="text-xs font-semibold text-sb-primary">{initials}</span>
      </div>
      <svg className="w-3.5 h-3.5 text-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────
export default function Header() {
  const breadcrumb = useBreadcrumb()
  const { user } = useAuth()
  const logout = useLogout()
  const toggle = useSidebarStore((s) => s.toggle)
  const [panelOpen, setPanelOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  // Fetch tenant info for owner/viewer to show business name in profile panel
  const isOwner = user?.role === 'owner' || user?.role === 'viewer'
  const { data: tenant } = useTenant(isOwner ? user?.tenantId : null)

  const handleLogout = async () => {
    setPanelOpen(false)
    await logout()
  }

  const handleChangePassword = () => {
    setPanelOpen(false)
    setShowChangePassword(true)
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100 shadow-sm px-4 md:px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={toggle}
            className="md:hidden p-2 rounded-lg text-sb-neutral hover:text-sb-primary hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-300">/</span>}
                <span className={crumb.to ? 'text-gray-400' : 'font-semibold text-sb-dark'}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Right — role badge + user avatar */}
        <div className="flex items-center gap-2">
          {user?.role && (
            <span className="hidden sm:inline-block text-xs font-medium bg-sb-bg text-sb-neutral px-2 py-0.5 rounded-md capitalize">
              {ROLE_LABELS[user.role] ?? user.role.replace('_', ' ')}
            </span>
          )}
          <UserButton user={user} onClick={() => setPanelOpen(true)} />
        </div>
      </header>

      {/* Profile panel */}
      {panelOpen && (
        <ProfilePanel
          user={user}
          tenant={tenant}
          onClose={() => setPanelOpen(false)}
          onChangePassword={handleChangePassword}
          onLogout={handleLogout}
        />
      )}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  )
}
