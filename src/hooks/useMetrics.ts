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
  const orgId = user?.organization_id ?? ''
  return useQuery({
    queryKey: ['dashboard-summary', orgId],
    queryFn: () => getDashboardSummary(orgId),
    enabled: !!user?.organization_id,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useOrgDailyTotals(days = 30) {
  const { user } = useAuth()
  const orgId = user?.organization_id ?? ''
  return useQuery({
    queryKey: ['org-daily-totals', orgId, days],
    queryFn: () => getOrgDailyTotals(orgId, days),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function usePlatformSpend(days = 30) {
  const { user } = useAuth()
  const orgId = user?.organization_id ?? ''
  return useQuery({
    queryKey: ['platform-spend', orgId, days],
    queryFn: () => getPlatformSpend(orgId, days),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}

export function useClientOverviews() {
  const { user } = useAuth()
  const orgId = user?.organization_id ?? ''
  return useQuery({
    queryKey: ['client-overviews', orgId],
    queryFn: () => getClientOverviews(orgId),
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
  const orgId = user?.organization_id ?? ''
  return useQuery({
    queryKey: ['campaign-summaries', orgId, opts],
    queryFn: () => getCampaignSummaries({ organizationId: orgId, ...opts }),
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
  const orgId = user?.organization_id ?? ''
  return useQuery({
    queryKey: ['attention-campaigns', orgId],
    queryFn: () => getCampaignsRequiringAttention(orgId),
    enabled: !!user?.organization_id,
    staleTime: 60_000,
  })
}
