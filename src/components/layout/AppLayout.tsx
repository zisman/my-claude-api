import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { getAlertCounts } from '@/lib/api/alerts'
import { useAuth } from '@/contexts/AuthContext'

export function AppLayout() {
  const { user } = useAuth()

  const { data: alertCounts } = useQuery({
    queryKey: ['alertCounts', user?.organization_id],
    queryFn: () => getAlertCounts(user!.organization_id),
    enabled: !!user?.organization_id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const openAlerts = alertCounts
    ? (alertCounts.critical ?? 0) + (alertCounts.high ?? 0)
    : 0

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar alertCount={openAlerts} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
