import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { generateCampaignInsight, type CampaignMetricsInput } from '@/lib/ai/campaign-insights'
import { generateClientSummary } from '@/lib/ai/client-summary'
import { generateMonthlyReport } from '@/lib/ai/monthly-report'
import { generateRecommendations } from '@/lib/ai/recommendations'
import { generateTasksFromRecommendations, deriveTasksFromRecommendations } from '@/lib/ai/task-generator'
import type { CampaignSummary, ClientOverview } from '@/lib/api/metrics'
import type { Recommendation } from '@/lib/ai/types'

// ─── Campaign insight ─────────────────────────────────────────────────────────

export function useCampaignInsight(
  campaign: CampaignSummary | undefined,
  metrics: CampaignMetricsInput | undefined,
  periodDays = 30
) {
  return useQuery({
    queryKey: ['ai-insight', 'campaign', campaign?.id, periodDays],
    queryFn: () => generateCampaignInsight(campaign!, metrics!, periodDays),
    enabled: !!campaign && !!metrics,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}

// ─── Mutation version (on-demand) ─────────────────────────────────────────────

export function useCampaignInsightMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      campaign,
      metrics,
      periodDays = 30,
    }: {
      campaign: CampaignSummary
      metrics: CampaignMetricsInput
      periodDays?: number
    }) => generateCampaignInsight(campaign, metrics, periodDays),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(['ai-insight', 'campaign', vars.campaign.id, vars.periodDays ?? 30], data)
    },
  })
}

// ─── Client summary ───────────────────────────────────────────────────────────

export function useClientSummary(
  client: ClientOverview | undefined,
  campaigns: CampaignSummary[],
  periodDays = 30
) {
  return useQuery({
    queryKey: ['ai-insight', 'client', client?.id, periodDays],
    queryFn: () => generateClientSummary(client!, campaigns, periodDays),
    enabled: !!client && campaigns.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}

export function useClientSummaryMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      client,
      campaigns,
      periodDays = 30,
    }: {
      client: ClientOverview
      campaigns: CampaignSummary[]
      periodDays?: number
    }) => generateClientSummary(client, campaigns, periodDays),
    onSuccess: (data, vars) => {
      queryClient.setQueryData(['ai-insight', 'client', vars.client.id, vars.periodDays ?? 30], data)
    },
  })
}

// ─── Monthly report ───────────────────────────────────────────────────────────

export function useMonthlyReportMutation() {
  return useMutation({
    mutationFn: ({
      organizationId,
      organizationName,
      campaigns,
      platformSpend,
      periodDays = 30,
    }: {
      organizationId: string
      organizationName: string
      campaigns: CampaignSummary[]
      platformSpend: Array<{ platform: string; spend: number; percentage: number }>
      periodDays?: number
    }) => generateMonthlyReport(organizationId, organizationName, campaigns, platformSpend, periodDays),
  })
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export function useRecommendationsMutation() {
  return useMutation({
    mutationFn: generateRecommendations,
  })
}

// ─── Task generation ─────────────────────────────────────────────────────────

export function useGenerateTasksMutation() {
  return useMutation({
    mutationFn: ({
      recommendations,
      entityName,
    }: {
      recommendations: Recommendation[]
      entityName: string
    }) => generateTasksFromRecommendations(recommendations, entityName),
  })
}

/** Synchronous — no AI call, derives tasks directly from recommendation fields. */
export function useDeriveTasksFromRecommendations() {
  return (recommendations: Recommendation[], entityName: string) =>
    deriveTasksFromRecommendations(recommendations, entityName)
}
