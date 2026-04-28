import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../modules/auth/hooks'
import { getNavSections } from './nav.config'
import { useSidebarStore } from '../store/sidebarStore'

function SidebarContent({ onLinkClick }) {
  const { user } = useAuth()
  const navSections = getNavSections(user?.role)
  const isOwner = user?.role === 'owner' || user?.role === 'viewer'

  const isAllowed = (roles) => {
    if (!roles) return true
    return roles.includes(user?.role)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="relative px-5 py-5 overflow-hidden">
        {/* Radial glow top-left */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_0%_0%,#1a5a9e28_0%,transparent_100%)] pointer-events-none" />
        {/* Separator line */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-black/30 ring-1 ring-white/15">
            <img src="/Logo.png" className="w-[30px] h-[30px] object-contain" alt="SharkByte" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-[15px] tracking-wide leading-tight">SharkByte</span>
            <span className="text-[#6ab4f0] text-[10px] font-medium tracking-[0.14em] uppercase leading-tight mt-0.5">
              {isOwner ? 'CRM' : 'Admin Panel'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navSections.map((section, si) => {
          const visibleItems = section.items.filter((item) => isAllowed(item.roles))
          if (visibleItems.length === 0) return null

          return (
            <div key={si}>
              {section.label && (
                <p className="px-3 mb-2 text-xs font-medium text-sb-neutral/60 uppercase tracking-wider">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) =>
                  item.comingSoon ? (
                    <li key={item.to}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sb-neutral/50 cursor-not-allowed select-none">
                        {item.icon}
                        <span>{item.label}</span>
                        <span className="ml-auto text-[10px] font-semibold bg-sb-primary/20 text-sb-neutral px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </div>
                    </li>
                  ) : (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onLinkClick}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-sb-primary text-white font-medium'
                              : 'text-sb-neutral hover:bg-sb-primary/30 hover:text-white'
                          }`
                        }
                      >
                        {item.icon}
                        {item.label}
                      </NavLink>
                    </li>
                  )
                )}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sb-primary/30">
        <p className="text-sb-neutral/70 text-xs truncate">{user?.email}</p>
        <p className="text-sb-neutral/40 text-xs mt-0.5">v1.0.0</p>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { isOpen, close } = useSidebarStore()
  const { pathname } = useLocation()

  // Close drawer on route change
  useEffect(() => {
    close()
  }, [pathname, close])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex w-56 bg-sb-dark min-h-screen flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-sb-dark/60 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sb-dark flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menú de navegación"
      >
        <div className="flex items-center justify-end px-4 pt-4">
          <button
            onClick={close}
            className="p-2 rounded-lg text-sb-neutral hover:text-white hover:bg-sb-primary/30 transition-colors"
            aria-label="Cerrar menú"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SidebarContent onLinkClick={close} />
      </aside>
    </>
  )
}
