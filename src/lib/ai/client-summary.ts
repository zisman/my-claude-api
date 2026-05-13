import { runAnalysis } from './analysis-service'
import type { CampaignSummary, ClientOverview } from '@/lib/api/metrics'
import type { ClientSummary, InsightResult, Recommendation } from './types'

export async function generateClientSummary(
  client: ClientOverview,
  campaigns: CampaignSummary[],
  periodDays = 30
): Promise<ClientSummary> {
  const result = await runAnalysis<InsightResult>({
    type: 'client_summary',
    client,
    campaigns,
    period_days: periodDays,
  })

  const topPerforming = campaigns
    .filter(c => c.roas_30d != null)
    .sort((a, b) => (b.roas_30d ?? 0) - (a.roas_30d ?? 0))
    .slice(0, 3)
    .map(c => c.name)

  const underperforming = campaigns
    .filter(c => c.health_score != null && c.health_score < 50 && c.status === 'active')
    .sort((a, b) => (a.health_score ?? 100) - (b.health_score ?? 100))
    .slice(0, 3)
    .map(c => c.name)

  const totalSpend = campaigns.reduce((s, c) => s + c.spend_30d, 0)
  const budget = campaigns.reduce((s, c) => s + (c.daily_budget ?? 0) * periodDays, 0)
  const budgetUtilization = budget > 0 ? ((totalSpend / budget) * 100).toFixed(0) : 'N/A'

  return {
    client_id: client.id,
    client_name: client.name,
    generated_at: new Date().toISOString(),
    executive_summary: result.summary,
    performance_narrative: result.internal_notes,
    top_performing_campaigns: topPerforming,
    underperforming_campaigns: underperforming,
    budget_efficiency: `${budgetUtilization}% budget utilized across ${campaigns.length} campaigns`,
    channel_mix_assessment: result.opportunities.map(o => o.title).join('; ') || 'No channel mix data available',
    month_over_month_narrative: result.summary,
    strategic_recommendations: result.recommendations as Recommendation[],
    client_friendly_summary: result.client_friendly_summary,
    internal_notes: result.internal_notes,
  }
}
