import { runAnalysis } from './analysis-service'
import type { CampaignSummary } from '@/lib/api/metrics'
import type { AggregatedMetric } from '@/lib/metrics/types'
import type { Recommendation, InsightResult } from './types'

export async function generateRecommendations(opts: {
  context: 'campaign' | 'client' | 'portfolio'
  entityName: string
  currentMetrics: AggregatedMetric
  previousMetrics: AggregatedMetric
  campaigns?: CampaignSummary[]
}): Promise<Recommendation[]> {
  const result = await runAnalysis<InsightResult>({
    type: 'recommendations',
    context: opts.context,
    entity_name: opts.entityName,
    current_metrics: opts.currentMetrics,
    previous_metrics: opts.previousMetrics,
    campaigns: opts.campaigns,
  })

  return result.recommendations as Recommendation[]
}
