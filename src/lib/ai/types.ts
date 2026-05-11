import type { CampaignSummary, ClientOverview } from '@/lib/api/metrics'
import type { AggregatedMetric } from '@/lib/metrics/types'

// ─── Core insight output ───────────────────────────────────────────────────────

export interface InsightResult {
  summary: string
  problems: Problem[]
  opportunities: Opportunity[]
  recommendations: Recommendation[]
  risks: Risk[]
  next_actions: NextAction[]
  client_friendly_summary: string
  internal_notes: string
}

export interface Problem {
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  metric_affected: string
  current_value: string
  benchmark_value?: string
}

export interface Opportunity {
  title: string
  description: string
  potential_uplift: string
  effort: 'low' | 'medium' | 'high'
  confidence: number
}

export interface Recommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'budget' | 'targeting' | 'creative' | 'bidding' | 'structure' | 'reporting' | 'strategy'
  title: string
  description: string
  expected_impact: string
  implementation_steps: string[]
  estimated_lift: number | null
  effort_level: 'low' | 'medium' | 'high'
  time_to_implement: string
}

export interface Risk {
  title: string
  description: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation: string
}

export interface NextAction {
  action: string
  owner: 'account_manager' | 'client' | 'platform'
  urgency: 'immediate' | 'this_week' | 'this_month'
  context: string
}

// ─── Specialized report types ─────────────────────────────────────────────────

export interface CampaignInsight extends InsightResult {
  campaign_id: string
  campaign_name: string
  platform: string
  period_days: number
  generated_at: string
}

export interface ClientSummary {
  client_id: string
  client_name: string
  generated_at: string
  executive_summary: string
  performance_narrative: string
  top_performing_campaigns: string[]
  underperforming_campaigns: string[]
  budget_efficiency: string
  channel_mix_assessment: string
  month_over_month_narrative: string
  strategic_recommendations: Recommendation[]
  client_friendly_summary: string
  internal_notes: string
}

export interface MonthlyReport {
  organization_id: string
  report_month: string
  generated_at: string
  headline_metrics: {
    total_spend: number
    total_conversions: number
    blended_roas: number | null
    yoy_spend_change: number | null
    mom_spend_change: number | null
  }
  executive_summary: string
  platform_highlights: PlatformHighlight[]
  top_campaigns: string[]
  key_wins: string[]
  key_challenges: string[]
  month_ahead_priorities: string[]
  client_friendly_summary: string
}

export interface PlatformHighlight {
  platform: string
  summary: string
  top_metric: string
  concern: string | null
}

export interface GeneratedTask {
  title: string
  description: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  category: string
  due_in_days: number
  source_recommendation_id: string
}

// ─── Request payloads ─────────────────────────────────────────────────────────

export interface CampaignInsightRequest {
  type: 'campaign_insight'
  campaign: CampaignSummary
  metrics: {
    current: AggregatedMetric
    previous: AggregatedMetric
    byDay: Array<{ date: string; spend: number; clicks: number; impressions: number; conversions: number }>
  }
  period_days: number
}

export interface ClientSummaryRequest {
  type: 'client_summary'
  client: ClientOverview
  campaigns: CampaignSummary[]
  period_days: number
}

export interface MonthlyReportRequest {
  type: 'monthly_report'
  organization_name: string
  period: string
  campaigns: CampaignSummary[]
  platform_spend: Array<{ platform: string; spend: number; percentage: number }>
  period_days: number
}

export interface RecommendationRequest {
  type: 'recommendations'
  context: 'campaign' | 'client' | 'portfolio'
  entity_name: string
  current_metrics: AggregatedMetric
  previous_metrics: AggregatedMetric
  campaigns?: CampaignSummary[]
}

export interface TaskGenerationRequest {
  type: 'generate_tasks'
  recommendations: Recommendation[]
  entity_name: string
}

export type AIInsightRequest =
  | CampaignInsightRequest
  | ClientSummaryRequest
  | MonthlyReportRequest
  | RecommendationRequest
  | TaskGenerationRequest

export type AIInsightResponse =
  | InsightResult
  | ClientSummary
  | MonthlyReport
  | Recommendation[]
  | GeneratedTask[]
