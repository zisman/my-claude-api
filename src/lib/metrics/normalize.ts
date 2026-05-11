/**
 * Platform-specific normalizers that convert raw API responses to UnifiedMetric.
 *
 * Each normalizer:
 *  1. Accepts the raw platform shape (typed with Zod)
 *  2. Converts units (micros → dollars, decimal → percent, etc.)
 *  3. Derives all rate metrics via calculate.ts functions
 *  4. Returns a fully-typed UnifiedMetric
 *
 * Also exports fromDailyMetricRow() to convert DB rows to UnifiedMetric,
 * plus backward-compatible format helpers for existing page imports.
 */

import { z } from 'zod'
import {
  calcCTR, calcCPC, calcCPM, calcConversionRate, calcROAS,
  calcCostPerLead, calcVideoViewRate, calcVideoCompletionRate,
} from './calculate'
import type { UnifiedMetric } from './types'
import { UnifiedMetricSchema } from './types'
import {
  GoogleAdsMetricsRowSchema,
  MetaInsightsRowSchema,
  LinkedInAnalyticsRowSchema,
  GA4ReportSchema,
  DailyMetricRowSchema,
  metaActionValue,
  ga4MetricValue,
  ga4DimensionValue,
} from './platform-types'
import type {
  GoogleAdsMetricsRow,
  MetaInsightsRow,
  LinkedInAnalyticsRow,
  GA4Report,
  DailyMetricRow,
} from './platform-types'

// ─── Validation result ────────────────────────────────────────────────────────

export interface NormalizeResult {
  metric:   UnifiedMetric
  warnings: string[]
}

// ─── Google Ads ───────────────────────────────────────────────────────────────

/**
 * Normalize a single GAQL metrics row.
 *
 * Unit conversions:
 *  - cost_micros / 1_000_000 → spend (USD)
 *  - average_cpc micros / 1_000_000 → CPC
 *  - average_cpm micros / 1_000_000 → CPM
 *  - ctr is a decimal (0.023) → multiply by 100 for percentage
 */
export function normalizeGoogleAdsRow(
  row: GoogleAdsMetricsRow,
  campaignName?: string
): NormalizeResult {
  const warnings: string[] = []
  const parsed = GoogleAdsMetricsRowSchema.safeParse(row)
  if (!parsed.success) {
    warnings.push(`Google Ads row parse error: ${parsed.error.issues[0]?.message}`)
  }

  const m = row.metrics
  const spend = (m.cost_micros ?? 0) / 1_000_000

  // Google's ctr is a decimal (0.0234), not percentage
  const ctr = calcCTR(m.clicks ?? 0, m.impressions ?? 0)

  // average_cpc and average_cpm come in micros from v14+; 0 if not available
  const cpc = m.average_cpc
    ? (m.average_cpc / 1_000_000)
    : calcCPC(spend, m.clicks ?? 0)

  const cpm = m.average_cpm
    ? (m.average_cpm / 1_000_000)
    : calcCPM(spend, m.impressions ?? 0)

  const conversions = m.conversions ?? 0
  const revenue     = m.conversions_value ?? 0
  const videoViews  = m.video_views ?? 0

  const metric: UnifiedMetric = {
    date:          row.segments.date,
    platform:      'google_ads',
    account_id:    null,
    campaign_id:   row.campaign.id,
    campaign_name: campaignName ?? row.campaign.name ?? row.campaign.id,
    currency:      'USD',
    impressions:   Math.round(m.impressions ?? 0),
    clicks:        Math.round(m.clicks ?? 0),
    reach:         0,
    spend,
    ctr,
    cpc,
    cpm,
    frequency:     null,
    conversions,
    conversion_rate: calcConversionRate(conversions, Math.round(m.clicks ?? 0)),
    revenue,
    roas:            calcROAS(revenue, spend),
    leads:           0,          // Google Ads doesn't distinguish lead type in standard metrics
    cost_per_lead:   null,
    video_views:     Math.round(videoViews),
    video_view_rate: calcVideoViewRate(videoViews, m.impressions ?? 0),
    video_completions: 0,
    video_completion_rate: 0,
    quality_score:   null,
    impression_share: m.search_impression_share != null
      ? m.search_impression_share * 100
      : null,
    platform_data: row as Record<string, unknown>,
  }

  if (ctr > 30) warnings.push(`Unusually high CTR (${ctr.toFixed(1)}%) for ${row.campaign.id}`)
  if (spend < 0) warnings.push(`Negative spend for campaign ${row.campaign.id}`)

  return { metric, warnings }
}

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

/**
 * Normalize a Meta Ads Insights row.
 *
 * Unit conversions:
 *  - spend is already in USD (string → number)
 *  - ctr is already a percentage (2.34%)
 *  - cpc/cpm are already in USD
 *  - actions array has purchase, lead, other conversion types
 */
export function normalizeMetaRow(row: MetaInsightsRow): NormalizeResult {
  const warnings: string[] = []
  const parsed = MetaInsightsRowSchema.safeParse(row)
  if (!parsed.success) {
    warnings.push(`Meta row parse error: ${parsed.error.issues[0]?.message}`)
  }

  const toNum = (v: string | number | undefined) =>
    v != null ? (typeof v === 'number' ? v : parseFloat(v) || 0) : 0

  const impressions = Math.round(toNum(row.impressions))
  const clicks      = Math.round(toNum(row.clicks))
  const spend       = toNum(row.spend)
  const reach       = Math.round(toNum(row.reach))

  // Meta returns CTR as a percentage already
  const ctr = row.ctr != null ? toNum(row.ctr) : calcCTR(clicks, impressions)
  const cpc = row.cpc != null ? toNum(row.cpc) : calcCPC(spend, clicks)
  const cpm = row.cpm != null ? toNum(row.cpm) : calcCPM(spend, impressions)

  // Conversions: purchase action
  const conversions = metaActionValue(row.actions, 'purchase')
    || metaActionValue(row.actions, 'offsite_conversion.fb_pixel_purchase')
    || metaActionValue(row.actions, 'onsite_conversion.purchase')

  // Leads: lead_generation action
  const leads = metaActionValue(row.actions, 'lead')
    || metaActionValue(row.actions, 'offsite_conversion.lead')
    || metaActionValue(row.actions, 'leadgen.other')

  // Revenue from action_values
  const revenue = metaActionValue(row.action_values, 'purchase')
    || metaActionValue(row.action_values, 'offsite_conversion.fb_pixel_purchase')

  const frequency = row.frequency != null ? toNum(row.frequency) : null

  // Video completions: p100 watched
  const videoCompletions = metaActionValue(row.video_p100_watched_actions, 'video_view')
  const videoViews = metaActionValue(row.video_play_actions, 'video_view')
    || Math.round(toNum(
        (row as Record<string, unknown>).video_play_actions
          ? (row as Record<string, unknown>).video_p25_watched_actions as number
          : 0
      ))

  const metric: UnifiedMetric = {
    date:          row.date_start,
    platform:      'meta_ads',
    account_id:    null,
    campaign_id:   row.campaign_id,
    campaign_name: row.campaign_name,
    currency:      'USD',
    impressions,
    clicks,
    reach,
    spend,
    ctr,
    cpc,
    cpm,
    frequency,
    conversions,
    conversion_rate: calcConversionRate(conversions, clicks),
    revenue,
    roas:            calcROAS(revenue, spend),
    leads,
    cost_per_lead:   calcCostPerLead(spend, leads),
    video_views:     Math.round(videoViews),
    video_view_rate: calcVideoViewRate(videoViews, impressions),
    video_completions: Math.round(videoCompletions),
    video_completion_rate: calcVideoCompletionRate(videoCompletions, videoViews),
    quality_score:   null,
    impression_share: null,
    platform_data: row as Record<string, unknown>,
  }

  return { metric, warnings }
}

// ─── LinkedIn Ads ─────────────────────────────────────────────────────────────

/**
 * Normalize a LinkedIn adAnalyticsV2 row.
 *
 * Unit conversions:
 *  - costInUsd is already in USD (string or number)
 *  - No CTR/CPC/CPM returned by API — derive from sums
 *  - leadGenerationFormFills → leads
 */
export function normalizeLinkedInRow(
  row: LinkedInAnalyticsRow,
  campaignName: string = ''
): NormalizeResult {
  const warnings: string[] = []
  const parsed = LinkedInAnalyticsRowSchema.safeParse(row)
  if (!parsed.success) {
    warnings.push(`LinkedIn row parse error: ${parsed.error.issues[0]?.message}`)
  }

  const toNum = (v: string | number) =>
    typeof v === 'number' ? v : parseFloat(v.toString()) || 0

  // Extract campaign ID from pivot URN: 'urn:li:sponsoredCampaign:123' → '123'
  const campaignUrn = row.pivotValues?.[0] ?? ''
  const campaignId  = campaignUrn.split(':').pop() ?? campaignUrn

  const { start } = row.dateRange
  const date = `${start.year}-${String(start.month).padStart(2, '0')}-${String(start.day).padStart(2, '0')}`

  const impressions = Math.round(row.impressions ?? 0)
  const clicks      = Math.round(row.clicks ?? 0)
  const spend       = toNum(row.costInUsd ?? 0)
  const conversions = row.externalWebsiteConversions ?? 0
  const leads       = row.leadGenerationFormFills ?? 0
  const videoViews  = row.videoViews ?? 0
  const videoCompletions = row.videoCompletions ?? 0

  const metric: UnifiedMetric = {
    date,
    platform:      'linkedin_ads',
    account_id:    null,
    campaign_id:   campaignId,
    campaign_name: campaignName,
    currency:      'USD',
    impressions,
    clicks,
    reach:   0,
    spend,
    ctr:     calcCTR(clicks, impressions),
    cpc:     calcCPC(spend, clicks),
    cpm:     calcCPM(spend, impressions),
    frequency: null,
    conversions,
    conversion_rate: calcConversionRate(conversions, clicks),
    revenue:         0,
    roas:            null,
    leads,
    cost_per_lead:   calcCostPerLead(spend, leads),
    video_views:     Math.round(videoViews),
    video_view_rate: calcVideoViewRate(videoViews, impressions),
    video_completions: Math.round(videoCompletions),
    video_completion_rate: calcVideoCompletionRate(videoCompletions, videoViews),
    quality_score:   null,
    impression_share: null,
    platform_data: row as Record<string, unknown>,
  }

  return { metric, warnings }
}

// ─── GA4 ──────────────────────────────────────────────────────────────────────

/**
 * Normalize a GA4 Data API runReport response.
 * Expects dimensions: date, sessionCampaignName, sessionSource
 * Expects metrics: sessions, totalUsers, screenPageViews, conversions, purchaseRevenue
 *
 * Returns one UnifiedMetric per report row.
 */
export function normalizeGA4Report(report: GA4Report): NormalizeResult[] {
  const parsed = GA4ReportSchema.safeParse(report)
  if (!parsed.success) return []

  const dimHeaders = report.dimensionHeaders
  const metHeaders = report.metricHeaders

  return (report.rows ?? []).map(row => {
    const date         = ga4DimensionValue(dimHeaders, row, 'date').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
    const campaignName = ga4DimensionValue(dimHeaders, row, 'sessionCampaignName') || '(not set)'
    const campaignId   = ga4DimensionValue(dimHeaders, row, 'sessionCampaignName') || 'ga4_direct'

    const sessions       = ga4MetricValue(metHeaders, row, 'sessions')
    const conversions    = ga4MetricValue(metHeaders, row, 'conversions')
    const revenue        = ga4MetricValue(metHeaders, row, 'purchaseRevenue')
    const spend          = 0 // GA4 doesn't have spend data

    const metric: UnifiedMetric = {
      date,
      platform:      'ga4',
      account_id:    null,
      campaign_id:   campaignId,
      campaign_name: campaignName,
      currency:      'USD',
      impressions:   Math.round(sessions),
      clicks:        Math.round(ga4MetricValue(metHeaders, row, 'screenPageViews')),
      reach:         Math.round(ga4MetricValue(metHeaders, row, 'totalUsers')),
      spend,
      ctr:           0,
      cpc:           0,
      cpm:           0,
      frequency:     null,
      conversions,
      conversion_rate: calcConversionRate(conversions, sessions),
      revenue,
      roas:           null,
      leads:          0,
      cost_per_lead:  null,
      video_views:    0,
      video_view_rate: 0,
      video_completions: 0,
      video_completion_rate: 0,
      quality_score:  null,
      impression_share: null,
      platform_data: row as Record<string, unknown>,
    }

    return { metric, warnings: [] }
  })
}

// ─── DB row → UnifiedMetric ───────────────────────────────────────────────────

/**
 * Convert a daily_metrics DB row to a UnifiedMetric.
 * Used when displaying data already persisted in Supabase.
 */
export function fromDailyMetricRow(
  row: DailyMetricRow,
  campaignName: string = ''
): UnifiedMetric {
  const impressions = Math.round(row.impressions)
  const clicks      = Math.round(row.clicks)
  const spend       = row.spend
  const conversions = row.conversions
  const revenue     = row.conversion_value
  const leads       = 0 // not in DailyMetric; would require joining conversion_events

  return {
    date:          row.date,
    platform:      row.platform as UnifiedMetric['platform'],
    account_id:    row.platform_account_id,
    campaign_id:   row.campaign_id,
    campaign_name: campaignName,
    currency:      'USD',
    impressions,
    clicks,
    reach:         Math.round(row.reach ?? 0),
    spend,
    ctr:           row.ctr,
    cpc:           row.cpc,
    cpm:           row.cpm,
    frequency:     row.frequency ?? null,
    conversions,
    conversion_rate: calcConversionRate(conversions, clicks),
    revenue,
    roas:           row.roas,
    leads,
    cost_per_lead:  null,
    video_views:    Math.round(row.video_views ?? 0),
    video_view_rate: row.video_view_rate ?? 0,
    video_completions: Math.round(row.video_completions ?? 0),
    video_completion_rate: row.video_completion_rate ?? 0,
    quality_score:  row.quality_score,
    impression_share: row.impression_share,
    platform_data:  row.platform_data ?? {},
  }
}

// ─── Validate a UnifiedMetric ─────────────────────────────────────────────────

export function validateUnifiedMetric(metric: unknown): { valid: boolean; errors: string[]; warnings: string[] } {
  const result = UnifiedMetricSchema.safeParse(metric)
  const warnings: string[] = []

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      warnings,
    }
  }

  const m = result.data

  // Sanity checks that Zod can't express
  if (m.clicks > m.impressions && m.impressions > 0) {
    warnings.push('clicks > impressions — possible data issue')
  }
  if (m.ctr > 30) {
    warnings.push(`Very high CTR (${m.ctr.toFixed(1)}%) — verify platform data`)
  }
  if (m.conversions > m.clicks && m.clicks > 0) {
    warnings.push('conversions > clicks — check if conversion window spans multiple days')
  }
  if (m.spend > 0 && m.impressions === 0) {
    warnings.push('Spend > 0 but impressions = 0 — possible sync delay')
  }

  return { valid: true, errors: [], warnings }
}

// ─── Backward-compatible format helpers ──────────────────────────────────────
// Pages import these from '@/lib/metrics/normalize' — keep them here.

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyExact(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

export function formatPercent(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`
}

export function formatROAS(roas: number | null): string {
  if (roas == null) return '—'
  return `${roas.toFixed(2)}x`
}

export function formatMetricValue(key: string, value: number | null): string {
  if (value == null) return '—'
  switch (key) {
    case 'spend':
    case 'cpc':
    case 'cpm':
    case 'cost_per_lead':
    case 'revenue':    return formatCurrency(value)
    case 'ctr':
    case 'conversion_rate':
    case 'video_view_rate':
    case 'video_completion_rate':
    case 'impression_share': return formatPercent(value)
    case 'roas':       return formatROAS(value)
    case 'impressions':
    case 'clicks':
    case 'conversions':
    case 'leads':
    case 'video_views':
    case 'reach':      return formatNumber(value)
    default:           return value.toFixed(2)
  }
}

// ─── Legacy helper (kept for compat with existing hooks/pages) ─────────────────

export type { UnifiedMetric as NormalizedMetric }
