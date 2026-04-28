import { useAuthStore } from '../../auth/store'
import BusinessConfigPage from '../../tenants/pages/BusinessConfigPage'

export default function OwnerSettingsPage() {
  const { user } = useAuthStore()
  return <BusinessConfigPage tenantIdOverride={user?.tenantId} />
}
