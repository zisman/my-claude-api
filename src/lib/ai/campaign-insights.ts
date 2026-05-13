import { runAnalysis } from './analysis-service'
import type { CampaignSummary } from '@/lib/api/metrics'
import type { AggregatedMetric } from '@/lib/metrics/types'
import type { CampaignInsight, InsightResult } from './types'

export interface CampaignMetricsInput {
  current: AggregatedMetric
  previous: AggregatedMetric
  byDay: Array<{ date: string; spend: number; clicks: number; impressions: number; conversions: number }>
}

export async function generateCampaignInsight(
  campaign: CampaignSummary,
  metrics: CampaignMetricsInput,
  periodDays = 30
): Promise<CampaignInsight> {
  const result = await runAnalysis<InsightResult>({
    type: 'campaign_insight',
    campaign,
    metrics,
    period_days: periodDays,
  })

  return {
    ...result,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    platform: campaign.platform,
    period_days: periodDays,
    generated_at: new Date().toISOString(),
  }
}
