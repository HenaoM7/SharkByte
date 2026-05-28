import { useTenants, useTenant, useTenantUsage } from '../tenants/hooks'
export { useTenants }
import { useWhatsAppStatus } from '../whatsapp/hooks'
import { useSubscription } from '../billing/hooks'
import { useAnalyticsOverview } from '../analytics/hooks'

export const PLAN_LABELS = { pro: 'Plan Mensual', enterprise: 'Plan Anual', free: 'Free' }

const PLAN_COLORS = { pro: '#2563eb', enterprise: '#153959', free: '#d1d5db' }

// Owner dashboard: stats for their own single tenant
export const useOwnerDashboard = (tenantId) => {
  const { data: tenant, isLoading: loadingTenant } = useTenant(tenantId)
  const { data: usage, isLoading: loadingUsage } = useTenantUsage(tenantId)
  const { data: waStatus } = useWhatsAppStatus(tenantId)
  const { data: sub } = useSubscription(tenantId)

  const isLoading = loadingTenant || loadingUsage
  const assignedPlan = tenant?.plan ?? {}
  const usedMsg = usage?.messagesUsed ?? 0
  const usedTok = usage?.tokensUsed ?? 0
  const waConnected = waStatus?.status === 'open'
  const isActive = tenant?.isActive ?? false

  // La fuente de verdad del plan:
  // - Si sub está authorized → planName de la suscripción
  // - Sino → plan asignado al tenant (puede ser enterprise por admin sin sub formal)
  const subStatus = sub?.status  // authorized | pending | paused | cancelled | free
  const activePlanName = subStatus === 'authorized' ? sub.planName : assignedPlan.name
  const isPaidPlan = activePlanName === 'pro' || activePlanName === 'enterprise'

  // planLabel: si hay plan pagado (incluso asignado por admin), mostrar el label del plan
  const planLabel =
    subStatus === 'authorized' || isPaidPlan
      ? (PLAN_LABELS[activePlanName] ?? activePlanName)
      : subStatus === 'pending'
        ? 'Pago en proceso'
        : subStatus === 'paused'
          ? 'Suscripción pausada'
          : (PLAN_LABELS[activePlanName] ?? 'Sin plan activo')

  // Límites: usar el plan activo (subscription authorized) o el asignado
  const limitPlan = subStatus === 'authorized'
    ? { maxMessages: -1, maxTokens: -1 }   // pro/enterprise siempre ilimitado
    : assignedPlan
  const maxMsg = limitPlan.maxMessages ?? 100
  const maxTok = limitPlan.maxTokens ?? 50000
  const msgPct = maxMsg === -1 ? 100 : Math.min(Math.round((usedMsg / maxMsg) * 100), 100)
  const tokPct = maxTok === -1 ? 100 : Math.min(Math.round((usedTok / maxTok) * 100), 100)

  return {
    isLoading,
    tenant,
    usage: { usedMsg, usedTok, maxMsg, maxTok, msgPct, tokPct },
    waConnected,
    sub,
    subStatus,
    planLabel,
    activePlanName,
    isPaidPlan,
    isActive,
  }
}

// Admin dashboard: platform-wide aggregate stats
export const useDashboardStats = () => {
  // Aggregate KPIs via dedicated analytics endpoint (MongoDB aggregations — accurate regardless of tenant count)
  const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview()
  // Recent tenants list + usage chart (small fetch, newest first)
  const { data: response, isLoading: loadingTenants } = useTenants({ limit: 8, sortBy: 'createdAt', sortOrder: 'desc' })

  const isLoading = loadingOverview || loadingTenants
  const tenants = response?.data ?? []

  // KPIs — from analytics/overview (authoritative DB counts)
  const total = overview?.totalTenants ?? 0
  const active = overview?.activeTenants ?? 0
  const estimatedRevenue = overview?.estimatedRevenue ?? 0

  const planDist = overview?.planDistribution ?? []
  const paid = planDist
    .filter((p) => p._id && p._id !== 'free')
    .reduce((sum, p) => sum + (p.count ?? 0), 0)

  // Plan distribution chart — built from server aggregation
  const planChartData = planDist
    .filter((p) => p._id != null && (p.count ?? 0) > 0)
    .map((p) => ({
      name: PLAN_LABELS[p._id] ?? p._id,
      value: p.count,
      color: PLAN_COLORS[p._id] ?? '#9ca3af',
    }))

  // Usage chart — active tenants from the recent batch (tenant.messagesUsed is current-month usage on schema)
  const usageChartData = tenants
    .filter((t) => t.isActive || t.status === 'active')
    .map((t) => ({
      name: t.name.length > 12 ? t.name.slice(0, 12) + '…' : t.name,
      usado: t.messagesUsed ?? 0,
      limite: t.plan?.maxMessages === -1 ? (t.messagesUsed ?? 0) + 500 : (t.plan?.maxMessages ?? 100),
    }))

  return {
    isLoading,
    stats: { total, active, paid, estimatedRevenue, recent: tenants.slice(0, 5), planChartData, usageChartData },
  }
}
