import { z } from 'zod'

// ─── Platform ─────────────────────────────────────────────────────────────────

export const PlatformSchema = z.enum(['google_ads', 'meta_ads', 'linkedin_ads', 'ga4'])
export type Platform = z.infer<typeof PlatformSchema>

// ─── Core metric schema ────────────────────────────────────────────────────────

/**
 * UnifiedMetricSchema represents a single day of metrics for one campaign
 * on one platform, normalized to a common structure regardless of source.
 *
 * All rate/ratio fields are stored as percentages (0–100) unless noted.
 * All monetary fields are in the campaign's native currency.
 */
export const UnifiedMetricSchema = z.object({
  // Identity
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  platform:      PlatformSchema,
  account_id:    z.string().nullable(),
  campaign_id:   z.string().min(1),
  campaign_name: z.string(),
  currency:      z.string().length(3).default('USD'),

  // Volume
  impressions: z.number().int().nonnegative(),
  clicks:      z.number().int().nonnegative(),
  reach:       z.number().int().nonnegative().default(0),

  // Cost
  spend: z.number().nonnegative(),
  cpc:   z.number().nonnegative(),       // cost per click (currency)
  cpm:   z.number().nonnegative(),       // cost per 1000 impressions (currency)

  // Engagement
  ctr:       z.number().nonnegative(), // click-through rate (percentage 0–100)
  frequency: z.number().nonnegative().nullable().default(null),

  // Conversions
  conversions:      z.number().nonnegative(),
  conversion_rate:  z.number().nonnegative().nullable(), // conversions / clicks × 100
  revenue:          z.number().nonnegative(),            // conversion value / revenue
  roas:             z.number().nonnegative().nullable(), // revenue / spend

  // Leads (distinct from purchase conversions)
  leads:         z.number().nonnegative().default(0),
  cost_per_lead: z.number().nonnegative().nullable().default(null), // spend / leads

  // Video
  video_views:           z.number().int().nonnegative().default(0),
  video_view_rate:       z.number().nonnegative().default(0),  // percentage
  video_completions:     z.number().int().nonnegative().default(0),
  video_completion_rate: z.number().nonnegative().default(0),  // percentage

  // Search (Google Ads only)
  quality_score:    z.number().min(1).max(10).nullable().default(null),
  impression_share: z.number().nonnegative().nullable().default(null), // percentage

  // Raw platform response preserved for debugging / future fields
  platform_data: z.record(z.string(), z.unknown()).default({}),
})

export type UnifiedMetric = z.infer<typeof UnifiedMetricSchema>

// ─── Aggregated metric (sum across days or campaigns) ─────────────────────────

/**
 * AggregatedMetric is a UnifiedMetric where additive fields are summed and
 * rate/ratio fields are re-derived from the sums (not averaged).
 * `date` becomes the start date of the period, `campaign_id` may be
 * 'all' when aggregating across multiple campaigns.
 */
export const AggregatedMetricSchema = UnifiedMetricSchema.extend({
  date_end:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  campaign_count: z.number().int().nonnegative().optional(),
})
export type AggregatedMetric = z.infer<typeof AggregatedMetricSchema>

// ─── Period comparison ────────────────────────────────────────────────────────

export interface MetricDelta {
  current:    number
  previous:   number
  /** Absolute change: current − previous */
  absolute:   number
  /** Relative change as percentage: (current − previous) / previous × 100. null when previous = 0 */
  relative:   number | null
  /** Whether the change is favorable given the metric's polarity */
  improved:   boolean | null
}

export interface MetricComparison {
  period:      { start: string; end: string }
  previous:    { start: string; end: string }
  spend:            MetricDelta
  impressions:      MetricDelta
  clicks:           MetricDelta
  ctr:              MetricDelta
  cpc:              MetricDelta
  cpm:              MetricDelta
  conversions:      MetricDelta
  conversion_rate:  MetricDelta
  leads:            MetricDelta
  cost_per_lead:    MetricDelta
  revenue:          MetricDelta
  roas:             MetricDelta
}

// ─── Metric polarity (higher = better?) ──────────────────────────────────────

/** true = higher is better, false = lower is better */
export const METRIC_POLARITY: Record<string, boolean> = {
  impressions:     true,
  clicks:          true,
  reach:           true,
  spend:           false, // neutral in isolation; context-dependent
  cpc:             false,
  cpm:             false,
  ctr:             true,
  conversions:     true,
  conversion_rate: true,
  revenue:         true,
  roas:            true,
  leads:           true,
  cost_per_lead:   false,
  quality_score:   true,
  impression_share: true,
  video_views:     true,
  video_view_rate: true,
  video_completion_rate: true,
}

// ─── Validation result ────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}
