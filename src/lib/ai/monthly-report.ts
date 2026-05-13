import { runAnalysis } from './analysis-service'
import type { CampaignSummary } from '@/lib/api/metrics'
import type { MonthlyReport, InsightResult, PlatformHighlight } from './types'

interface PlatformSpendEntry {
  platform: string
  spend: number
  percentage: number
}

export async function generateMonthlyReport(
  organizationId: string,
  organizationName: string,
  campaigns: CampaignSummary[],
  platformSpend: PlatformSpendEntry[],
  periodDays = 30
): Promise<MonthlyReport> {
  const now = new Date()
  const period = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`

  const result = await runAnalysis<InsightResult>({
    type: 'monthly_report',
    organization_name: organizationName,
    period,
    campaigns,
    platform_spend: platformSpend,
    period_days: periodDays,
  })

  const totalSpend = campaigns.reduce((s, c) => s + c.spend_30d, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions_30d, 0)
  const blendedRoas = totalSpend > 0 && campaigns.some(c => c.roas_30d != null)
    ? campaigns.reduce((s, c) => s + (c.roas_30d ?? 0) * c.spend_30d, 0) / totalSpend
    : null

  const platformHighlights: PlatformHighlight[] = platformSpend.map(p => {
    const platformCampaigns = campaigns.filter(c => c.platform === p.platform)
    const avgHealth = platformCampaigns.length > 0
      ? platformCampaigns.reduce((s, c) => s + (c.health_score ?? 50), 0) / platformCampaigns.length
      : null

    return {
      platform: p.platform,
      summary: `${p.percentage}% of total spend (${platformCampaigns.length} campaigns)`,
      top_metric: avgHealth != null ? `Avg health: ${avgHealth.toFixed(0)}/100` : 'N/A',
      concern: result.problems.find(pr => pr.metric_affected.toLowerCase().includes(p.platform))?.title ?? null,
    }
  })

  const keyWins = result.opportunities.slice(0, 3).map(o => o.title)
  const keyChallenges = result.problems.slice(0, 3).map(p => p.title)
  const topCampaigns = campaigns.slice(0, 5).map(c => c.name)
  const priorities = result.next_actions
    .filter(a => a.urgency === 'this_month')
    .map(a => a.action)

  return {
    organization_id: organizationId,
    report_month: period,
    generated_at: new Date().toISOString(),
    headline_metrics: {
      total_spend: totalSpend,
      total_conversions: totalConversions,
      blended_roas: blendedRoas,
      yoy_spend_change: null,
      mom_spend_change: null,
    },
    executive_summary: result.summary,
    platform_highlights: platformHighlights,
    top_campaigns: topCampaigns,
    key_wins: keyWins,
    key_challenges: keyChallenges,
    month_ahead_priorities: priorities,
    client_friendly_summary: result.client_friendly_summary,
  }
}
