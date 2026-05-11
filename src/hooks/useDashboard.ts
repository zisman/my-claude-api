import { useQuery } from '@tanstack/react-query'
import { getDashboardMetrics, getPerformanceTrend, getSpendByPlatform } from '@/lib/api/dashboard'
import { useAuth } from './useAuth'

export function useDashboardMetrics() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dashboard-metrics', user?.organization_id],
    queryFn: () => getDashboardMetrics(user!.organization_id),
    enabled: !!user?.organization_id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePerformanceTrend(days = 30) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['performance-trend', user?.organization_id, days],
    queryFn: () => getPerformanceTrend(user!.organization_id, days),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function useSpendByPlatform() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['spend-by-platform', user?.organization_id],
    queryFn: () => getSpendByPlatform(user!.organization_id),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}
