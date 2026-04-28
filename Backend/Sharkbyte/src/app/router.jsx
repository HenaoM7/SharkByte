import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useParams } from 'react-router-dom'
import Spinner from '../shared/ui/Spinner'
import MainLayout from '../shared/layout/MainLayout'
import ErrorBoundary from '../shared/ui/ErrorBoundary'
import { useAuthStore } from '../modules/auth/store'

// Public pages — load instantly
import Login from '../modules/auth/pages/Login'
import RegisterPage from '../modules/auth/pages/RegisterPage'
import ForgotPasswordPage from '../modules/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '../modules/auth/pages/ResetPasswordPage'
import LandingPage from '../modules/landing/pages/LandingPage'

// ── Admin pages ─────────────────────────────────────────────────────────────
const DashboardPage      = lazy(() => import('../modules/dashboard/pages/DashboardPage'))
const TenantsListPage    = lazy(() => import('../modules/tenants/pages/TenantsListPage'))
const TenantDetailPage   = lazy(() => import('../modules/tenants/pages/TenantDetailPage'))
const BusinessConfigPage = lazy(() => import('../modules/tenants/pages/BusinessConfigPage'))
const PlansPage          = lazy(() => import('../modules/plans/pages/PlansPage'))
const UsersListPage      = lazy(() => import('../modules/users/pages/UsersListPage'))
const BillingPage        = lazy(() => import('../modules/billing/pages/BillingPage'))
const AnalyticsPage      = lazy(() => import('../modules/analytics/pages/AnalyticsPage'))
const AutomationPage     = lazy(() => import('../modules/automation/pages/AutomationPage'))

// ── Tenant admin shell + tab components ──────────────────────────────────────
import TenantAdminShell, {
  TenantConversationsTab,
  TenantCRMTab,
  TenantContactDetailTab,
  TenantPipelineTab,
  TenantSalesTab,
  TenantAgendaTab,
  TenantIntegrationsTab,
} from '../modules/tenants/pages/TenantAdminShell'

// ── Owner / CRM pages ────────────────────────────────────────────────────────
const OwnerDashboardPage  = lazy(() => import('../modules/owner-dashboard/pages/OwnerDashboardPage'))
const OwnerSettingsPage   = lazy(() => import('../modules/owner-settings/pages/OwnerSettingsPage'))
const ConversationsPage   = lazy(() => import('../modules/conversations/pages/ConversationsPage'))
const ContactsPage        = lazy(() => import('../modules/contacts/pages/ContactsPage'))
const ContactDetailPage   = lazy(() => import('../modules/contacts/pages/ContactDetailPage'))
const PipelinePage        = lazy(() => import('../modules/pipeline/pages/PipelinePage'))
const OwnerSalesPage      = lazy(() => import('../modules/owner-sales/pages/OwnerSalesPage'))
const AgendaPage          = lazy(() => import('../modules/agenda/pages/AgendaPage'))
const IntegrationsPage    = lazy(() => import('../modules/integrations/pages/IntegrationsPage'))
const OwnerBillingPage    = lazy(() => import('../modules/owner-billing/pages/OwnerBillingPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Spinner />
    </div>
  )
}

// Redirect /dashboard based on role
function DashboardRedirect() {
  const { user } = useAuthStore()
  if (user?.role === 'owner' || user?.role === 'viewer') {
    return <Navigate to="/app/dashboard" replace />
  }
  return <Navigate to="/admin/dashboard" replace />
}

// Dynamic tenant redirect — preserves the actual tenantId param
function TenantDetailRedirect() {
  const { tenantId } = useParams()
  return <Navigate to={`/admin/tenants/${tenantId}`} replace />
}
function TenantConfigRedirect() {
  const { tenantId } = useParams()
  return <Navigate to={`/admin/tenants/${tenantId}/config`} replace />
}

// Route guard with role support
function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuthStore()
  const hydrated = useAuthStore.persist.hasHydrated()
  if (!hydrated) return <Spinner fullPage />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

const router = createBrowserRouter([
  // ── Public routes ──────────────────────────────────────────────────────────
  { path: '/',                element: <LandingPage /> },
  { path: '/login',           element: <Login /> },
  { path: '/register',        element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password',  element: <ResetPasswordPage /> },

  // ── Root redirect: role-aware ───────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <DashboardRedirect /> },

      // ── Legacy redirects (bookmarks / old links) ──────────────────────────
      { path: '/tenants',                        element: <Navigate to="/admin/tenants" replace /> },
      { path: '/tenants/:tenantId',              element: <TenantDetailRedirect /> },
      { path: '/tenants/:tenantId/config',       element: <TenantConfigRedirect /> },
      { path: '/planes',                element: <Navigate to="/admin/planes" replace /> },
      { path: '/users',                 element: <Navigate to="/admin/users" replace /> },
      { path: '/billing',               element: <Navigate to="/admin/billing" replace /> },
      { path: '/analytics',             element: <Navigate to="/admin/analytics" replace /> },
      { path: '/automation',            element: <Navigate to="/admin/automation" replace /> },
    ],
  },

  // ── Admin routes (/admin/*) ─────────────────────────────────────────────────
  {
    element: <ProtectedRoute roles={['super_admin', 'admin']} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/admin/dashboard',  element: <DashboardPage /> },
          { path: '/admin/tenants',    element: <TenantsListPage /> },
          // Tenant detail — nested tabs (all share the TenantAdminShell header + tab nav)
          {
            path: '/admin/tenants/:tenantId',
            element: <TenantAdminShell />,
            children: [
              { index: true,                element: <TenantDetailPage /> },
              { path: 'conversations',      element: <TenantConversationsTab /> },
              { path: 'crm',               element: <TenantCRMTab /> },
              { path: 'crm/:contactId',    element: <TenantContactDetailTab /> },
              { path: 'pipeline',           element: <TenantPipelineTab /> },
              { path: 'sales',              element: <TenantSalesTab /> },
              { path: 'agenda',             element: <TenantAgendaTab /> },
              { path: 'integrations',       element: <TenantIntegrationsTab /> },
              { path: 'config',             element: <BusinessConfigPage /> },
            ],
          },
          { path: '/admin/planes',     element: <PlansPage /> },
          { path: '/admin/users',                      element: <UsersListPage /> },
          { path: '/admin/billing',                    element: <BillingPage /> },
          { path: '/admin/analytics',                  element: <AnalyticsPage /> },
          { path: '/admin/automation',                 element: <AutomationPage /> },
        ],
      },
    ],
  },

  // ── Owner / CRM routes (/app/*) ─────────────────────────────────────────────
  {
    element: <ProtectedRoute roles={['owner', 'viewer']} />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/app/dashboard',          element: <OwnerDashboardPage /> },
          { path: '/app/conversations',      element: <ConversationsPage /> },
          { path: '/app/crm',                element: <ContactsPage /> },
          { path: '/app/crm/:contactId',     element: <ContactDetailPage /> },
          { path: '/app/pipeline',           element: <PipelinePage /> },
          { path: '/app/sales',              element: <OwnerSalesPage /> },
          { path: '/app/agenda',             element: <AgendaPage /> },
          { path: '/app/integrations',       element: <IntegrationsPage /> },
          { path: '/app/billing',            element: <OwnerBillingPage /> },
          { path: '/app/settings',           element: <OwnerSettingsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])

export default function AppRouter() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
