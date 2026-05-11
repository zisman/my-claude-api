import type { CampaignSummary, ClientOverview } from '@/lib/api/metrics'
import type { AggregatedMetric } from '@/lib/metrics/types'

// ─── System prompt (stable — qualifies for prompt caching) ───────────────────

export const SYSTEM_PROMPT = `You are an expert digital advertising analyst and strategic advisor. You analyze advertising campaign performance data for a SaaS ad management platform and produce structured, actionable insights for account managers and their clients.

Your analysis should be:
- Data-driven: ground every claim in the numbers provided
- Actionable: every insight should lead to a concrete action
- Prioritized: rank recommendations by expected impact × urgency
- Honest: flag problems clearly; do not sugarcoat underperformance
- Client-aware: distinguish what's appropriate for client-facing vs. internal communication

You always respond with valid JSON matching the schema provided. Do not include markdown fences or explanatory text outside the JSON.`

// ─── JSON schema for structured output ────────────────────────────────────────

export const INSIGHT_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Concise 2-3 sentence performance summary' },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          metric_affected: { type: 'string' },
          current_value: { type: 'string' },
          benchmark_value: { type: 'string' },
        },
        required: ['title', 'description', 'severity', 'metric_affected', 'current_value'],
      },
    },
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          potential_uplift: { type: 'string' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          confidence: { type: 'number' },
        },
        required: ['title', 'description', 'potential_uplift', 'effort', 'confidence'],
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          category: { type: 'string', enum: ['budget', 'targeting', 'creative', 'bidding', 'structure', 'reporting', 'strategy'] },
          title: { type: 'string' },
          description: { type: 'string' },
          expected_impact: { type: 'string' },
          implementation_steps: { type: 'array', items: { type: 'string' } },
          estimated_lift: { type: ['number', 'null'] },
          effort_level: { type: 'string', enum: ['low', 'medium', 'high'] },
          time_to_implement: { type: 'string' },
        },
        required: ['id', 'priority', 'category', 'title', 'description', 'expected_impact', 'implementation_steps', 'effort_level', 'time_to_implement'],
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          probability: { type: 'string', enum: ['high', 'medium', 'low'] },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          mitigation: { type: 'string' },
        },
        required: ['title', 'description', 'probability', 'impact', 'mitigation'],
      },
    },
    next_actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          owner: { type: 'string', enum: ['account_manager', 'client', 'platform'] },
          urgency: { type: 'string', enum: ['immediate', 'this_week', 'this_month'] },
          context: { type: 'string' },
        },
        required: ['action', 'owner', 'urgency', 'context'],
      },
    },
    client_friendly_summary: { type: 'string', description: 'A 3-4 sentence summary suitable for sharing directly with the client, avoiding jargon' },
    internal_notes: { type: 'string', description: 'Internal observations for account managers only — strategic context, relationship notes, what to watch' },
  },
  required: ['summary', 'problems', 'opportunities', 'recommendations', 'risks', 'next_actions', 'client_friendly_summary', 'internal_notes'],
}

// ─── Data serializers ─────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function fmtCcy(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function pct(n: number) { return `${(n * 100).toFixed(2)}%` }
function roas(n: number | null) { return n != null ? `${n.toFixed(2)}x` : 'N/A' }

export function serializeCampaign(c: CampaignSummary, days: number): string {
  return `
CAMPAIGN: ${c.name}
Platform: ${c.platform} | Status: ${c.status} | Objective: ${c.objective ?? 'N/A'}
Daily Budget: ${c.daily_budget ? fmtCcy(c.daily_budget, c.currency) : 'N/A'} | Target CPA: ${c.target_cpa ? fmtCcy(c.target_cpa, c.currency) : 'N/A'} | Target ROAS: ${roas(c.target_roas)}
Health Score: ${c.health_score != null ? `${c.health_score}/100 (${c.health_trend ?? 'stable'})` : 'N/A'}

${days}d Performance:
  Impressions: ${fmt(c.impressions_30d)}
  Clicks:      ${fmt(c.clicks_30d)}
  Spend:       ${fmtCcy(c.spend_30d, c.currency)}
  Conversions: ${fmt(c.conversions_30d)}
  CTR:         ${pct(c.ctr_30d)}
  CPC:         ${fmtCcy(c.cpc_30d, c.currency)}
  ROAS:        ${roas(c.roas_30d)}
`.trim()
}

export function serializeAggregatedMetric(m: AggregatedMetric, label: string, currency = 'USD'): string {
  return `
${label}:
  Impressions: ${fmt(m.impressions)}
  Clicks:      ${fmt(m.clicks)}
  Spend:       ${fmtCcy(m.spend, currency)}
  Conversions: ${fmt(m.conversions)}
  CTR:         ${pct(m.ctr)}
  CPC:         ${fmtCcy(m.cpc, currency)}
  CPM:         ${fmtCcy(m.cpm, currency)}
  ROAS:        ${roas(m.roas)}
`.trim()
}

export function serializeClient(c: ClientOverview): string {
  return `
CLIENT: ${c.name}
Industry: ${c.industry ?? 'N/A'} | Status: ${c.status}
Monthly Budget: ${c.monthly_budget ? fmtCcy(c.monthly_budget, c.currency) : 'N/A'}
Campaigns: ${c.active_campaign_count} active / ${c.campaign_count} total
Open Alerts: ${c.open_alert_count} | Open Tasks: ${c.open_task_count}
Avg. Health Score: ${c.avg_health_score != null ? `${c.avg_health_score.toFixed(0)}/100` : 'N/A'}
Spend MTD: ${fmtCcy(c.spend_mtd, c.currency)}
`.trim()
}

export function serializeDailyTrend(
  byDay: Array<{ date: string; spend: number; clicks: number; impressions: number; conversions: number }>
): string {
  if (byDay.length === 0) return 'No daily data available.'
  const last7 = byDay.slice(-7)
  const lines = last7.map(d =>
    `  ${d.date}: spend=${fmtCcy(d.spend)}, clicks=${fmt(d.clicks)}, impr=${fmt(d.impressions)}, conv=${fmt(d.conversions)}`
  )
  return `Recent daily trend (last ${last7.length} days):\n${lines.join('\n')}`
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

export function buildCampaignInsightPrompt(
  campaign: CampaignSummary,
  current: AggregatedMetric,
  previous: AggregatedMetric,
  byDay: Array<{ date: string; spend: number; clicks: number; impressions: number; conversions: number }>,
  periodDays: number
): string {
  const deltaSpend = previous.spend > 0 ? ((current.spend - previous.spend) / previous.spend * 100).toFixed(1) : 'N/A'
  const deltaConv = previous.conversions > 0 ? ((current.conversions - previous.conversions) / previous.conversions * 100).toFixed(1) : 'N/A'
  const deltaRoas = previous.roas && previous.roas > 0 && current.roas != null
    ? ((current.roas - previous.roas) / previous.roas * 100).toFixed(1) : 'N/A'

  return `Analyze this advertising campaign and generate structured insights.

${serializeCampaign(campaign, periodDays)}

${serializeAggregatedMetric(current, `Current Period (${periodDays}d)`, campaign.currency)}

${serializeAggregatedMetric(previous, `Prior Period (${periodDays}d)`, campaign.currency)}

Period-over-Period Changes:
  Spend:       ${deltaSpend !== 'N/A' ? `${deltaSpend}%` : 'N/A'}
  Conversions: ${deltaConv !== 'N/A' ? `${deltaConv}%` : 'N/A'}
  ROAS:        ${deltaRoas !== 'N/A' ? `${deltaRoas}%` : 'N/A'}

${serializeDailyTrend(byDay)}

Provide 1-3 problems, 1-3 opportunities, 2-4 recommendations, 0-2 risks, and 2-4 next actions. Assign a unique short id to each recommendation (e.g. "rec_01").`
}

export function buildClientSummaryPrompt(
  client: ClientOverview,
  campaigns: CampaignSummary[],
  periodDays: number
): string {
  const campaignBlocks = campaigns.slice(0, 10).map(c => serializeCampaign(c, periodDays)).join('\n\n')
  const totalSpend = campaigns.reduce((s, c) => s + c.spend_30d, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions_30d, 0)
  const blendedRoas = totalSpend > 0 && campaigns.some(c => c.roas_30d != null)
    ? campaigns.reduce((s, c) => s + (c.roas_30d ?? 0) * c.spend_30d, 0) / totalSpend : null

  return `Generate a comprehensive client performance summary.

${serializeClient(client)}

Portfolio Summary (${periodDays}d):
  Total Spend:          ${fmtCcy(totalSpend, client.currency)}
  Total Conversions:    ${fmt(totalConversions)}
  Blended ROAS:         ${roas(blendedRoas)}
  Active Campaigns:     ${campaigns.filter(c => c.status === 'active').length}

Individual Campaigns:
${campaignBlocks}

Provide: summary, problems (portfolio-level), opportunities (portfolio-level), recommendations (strategic, 2-4), risks, next_actions, client_friendly_summary, internal_notes.`
}

export function buildMonthlyReportPrompt(
  organizationName: string,
  period: string,
  campaigns: CampaignSummary[],
  platformSpend: Array<{ platform: string; spend: number; percentage: number }>,
  periodDays: number
): string {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend_30d, 0)
  const topCampaigns = campaigns.slice(0, 5).map(c => serializeCampaign(c, periodDays)).join('\n\n')
  const platformLines = platformSpend
    .map(p => `  ${p.platform}: ${fmtCcy(p.spend)} (${p.percentage}%)`)
    .join('\n')

  return `Generate a monthly performance report narrative for this advertising portfolio.

Organization: ${organizationName}
Report Period: ${period}

Platform Spend Breakdown:
${platformLines}

Portfolio Total Spend: ${fmtCcy(totalSpend)}
Total Active Campaigns: ${campaigns.filter(c => c.status === 'active').length}
Total Campaigns: ${campaigns.length}

Top ${Math.min(5, campaigns.length)} Campaigns by Spend:
${topCampaigns}

Provide: summary (month overview), problems, opportunities, recommendations (3-5 strategic), risks, next_actions, client_friendly_summary (month-end exec summary), internal_notes.`
}

export function buildRecommendationsPrompt(
  context: string,
  entityName: string,
  current: AggregatedMetric,
  previous: AggregatedMetric,
  campaigns?: CampaignSummary[]
): string {
  const campaignList = campaigns?.slice(0, 8).map(c => serializeCampaign(c, 30)).join('\n\n') ?? ''

  return `Generate targeted recommendations for this ${context}.

Entity: ${entityName}
Context: ${context}

${serializeAggregatedMetric(current, 'Current Period (30d)')}
${serializeAggregatedMetric(previous, 'Prior Period (30d)')}

${campaigns?.length ? `\nCampaigns:\n${campaignList}` : ''}

Provide 3-6 specific, prioritized recommendations. Focus on the highest-impact actions. Assign a unique short id to each recommendation (e.g. "rec_01").`
}

export function buildTaskGenerationPrompt(recommendations: unknown[], entityName: string): string {
  const recText = JSON.stringify(recommendations, null, 2)
  return `Convert these advertising recommendations into actionable tasks for ${entityName}.

Recommendations:
${recText}

For each recommendation, generate 1-2 tasks. Each task should be concrete, assignable, and have a clear due date. Map the source_recommendation_id to the recommendation's id field.`
}
