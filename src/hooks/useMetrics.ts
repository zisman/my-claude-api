import { useQuery } from '@tanstack/react-query'
import {
  getDashboardSummary,
  getOrgDailyTotals,
  getPlatformSpend,
  getClientMetrics,
  getCampaignMetricsSummary,
  getCampaignSummaries,
  getClientOverviews,
  getCampaignsRequiringAttention,
} from '@/lib/api/metrics'
import { useAuth } from './useAuth'

export function useDashboardSummary() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dashboard-summary', user?.organization_id],
    queryFn: () => getDashboardSummary(user!.organization_id),
    enabled: !!user?.organization_id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useOrgDailyTotals(days = 30) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['org-daily-totals', user?.organization_id, days],
    queryFn: () => getOrgDailyTotals(user!.organization_id, days),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function usePlatformSpend(days = 30) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['platform-spend', user?.organization_id, days],
    queryFn: () => getPlatformSpend(user!.organization_id, days),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function useClientOverviews() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['client-overviews', user?.organization_id],
    queryFn: () => getClientOverviews(user!.organization_id),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function useCampaignSummaries(opts: {
  clientId?: string
  status?: string[]
  platform?: string[]
  search?: string
} = {}) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['campaign-summaries', user?.organization_id, opts],
    queryFn: () => getCampaignSummaries({ organizationId: user!.organization_id, ...opts }),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function useClientMetrics(clientId: string, days = 30) {
  return useQuery({
    queryKey: ['client-metrics', clientId, days],
    queryFn: () => getClientMetrics(clientId, days),
    enabled: !!clientId,
    staleTime: 60_000,
  })
}

export function useCampaignMetrics(campaignId: string, days = 30) {
  return useQuery({
    queryKey: ['campaign-metrics-summary', campaignId, days],
    queryFn: () => getCampaignMetricsSummary(campaignId, days),
    enabled: !!campaignId,
    staleTime: 60_000,
  })
}

export function useAttentionCampaigns() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['attention-campaigns', user?.organization_id],
    queryFn: () => getCampaignsRequiringAttention(user!.organization_id),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}
