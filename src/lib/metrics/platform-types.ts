import { z } from 'zod'

// ─── Google Ads ───────────────────────────────────────────────────────────────

/**
 * Shape of a single row returned by the Google Ads GAQL API
 * (searchStream or search endpoint).
 */
export const GoogleAdsMetricsRowSchema = z.object({
  campaign: z.object({
    id:   z.string(),
    name: z.string(),
    resourceName: z.string().optional(),
  }),
  segments: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  metrics: z.object({
    impressions:              z.number().default(0),
    clicks:                   z.number().default(0),
    cost_micros:              z.number().default(0),
    conversions:              z.number().default(0),
    conversions_value:        z.number().default(0),
    ctr:                      z.number().default(0), // decimal 0–1
    average_cpc:              z.number().default(0), // micros
    average_cpm:              z.number().default(0), // micros
    search_impression_share:  z.number().optional(),
    video_views:              z.number().default(0),
    video_view_rate:          z.number().default(0),
    all_conversions:          z.number().default(0),
  }),
  adGroup: z.object({ id: z.string() }).optional(),
})

export type GoogleAdsMetricsRow = z.infer<typeof GoogleAdsMetricsRowSchema>

export const GoogleAdsCampaignSchema = z.object({
  campaign: z.object({
    id:                      z.string(),
    name:                    z.string(),
    status:                  z.enum(['ENABLED', 'PAUSED', 'REMOVED', 'UNKNOWN']),
    advertisingChannelType:  z.string().optional(),
    startDate:               z.string().optional(),
    endDate:                 z.string().optional(),
  }),
  campaignBudget: z.object({
    amountMicros: z.string().or(z.number()),
  }).optional(),
})

export type GoogleAdsCampaign = z.infer<typeof GoogleAdsCampaignSchema>

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

/**
 * Single element from the Meta Insights API response.
 * Returned by GET /act_{ad_account_id}/insights with level=campaign&time_increment=1
 */

const MetaActionSchema = z.object({
  action_type: z.string(),
  value:       z.string().or(z.number()),
})

export const MetaInsightsRowSchema = z.object({
  campaign_id:   z.string(),
  campaign_name: z.string(),
  date_start:    z.string(),
  date_stop:     z.string(),
  impressions:   z.string().or(z.number()),
  clicks:        z.string().or(z.number()),       // link clicks
  inline_link_clicks: z.string().or(z.number()).optional(),
  reach:         z.string().or(z.number()).optional(),
  spend:         z.string().or(z.number()),       // USD
  frequency:     z.string().or(z.number()).optional(),
  ctr:           z.string().or(z.number()).optional(), // percentage 0–100
  cpc:           z.string().or(z.number()).optional(),
  cpm:           z.string().or(z.number()).optional(),
  actions:       z.array(MetaActionSchema).optional(),
  action_values: z.array(MetaActionSchema).optional(),
  video_p100_watched_actions: z.array(MetaActionSchema).optional(),
  video_play_actions:         z.array(MetaActionSchema).optional(),
})

export type MetaInsightsRow = z.infer<typeof MetaInsightsRowSchema>

/** Extract a numeric value from Meta's actions array by action_type */
export function metaActionValue(
  actions: z.infer<typeof MetaActionSchema>[] | undefined,
  type: string
): number {
  const match = actions?.find(a => a.action_type === type)
  if (!match) return 0
  return typeof match.value === 'number' ? match.value : parseFloat(match.value) || 0
}

// ─── LinkedIn Ads ─────────────────────────────────────────────────────────────

/**
 * Element from LinkedIn adAnalyticsV2 API (pivot=CAMPAIGN, timeGranularity=DAILY)
 */
export const LinkedInAnalyticsRowSchema = z.object({
  dateRange: z.object({
    start: z.object({ year: z.number(), month: z.number(), day: z.number() }),
    end:   z.object({ year: z.number(), month: z.number(), day: z.number() }),
  }),
  pivotValues: z.array(z.string()),  // e.g. ['urn:li:sponsoredCampaign:123']
  impressions:                 z.number().default(0),
  clicks:                      z.number().default(0),
  costInUsd:                   z.string().or(z.number()).default(0),
  externalWebsiteConversions:  z.number().default(0),
  leadGenerationFormFills:     z.number().default(0),
  videoCompletions:            z.number().default(0),
  videoViews:                  z.number().default(0),
  videoStarts:                 z.number().default(0),
  totalEngagements:            z.number().optional(),
})

export type LinkedInAnalyticsRow = z.infer<typeof LinkedInAnalyticsRowSchema>

// ─── GA4 ──────────────────────────────────────────────────────────────────────

/**
 * Row from the GA4 Data API runReport response.
 * Dimensions: date, sessionCampaignName, sessionSource
 * Metrics: sessions, totalUsers, screenPageViews, conversions, purchaseRevenue
 */
export const GA4ReportRowSchema = z.object({
  dimensionValues: z.array(z.object({ value: z.string() })),
  metricValues:    z.array(z.object({ value: z.string() })),
})

export const GA4ReportSchema = z.object({
  dimensionHeaders: z.array(z.object({ name: z.string() })),
  metricHeaders:    z.array(z.object({ name: z.string(), type: z.string() })),
  rows:             z.array(GA4ReportRowSchema).optional(),
  rowCount:         z.number().optional(),
})

export type GA4Report = z.infer<typeof GA4ReportSchema>
export type GA4ReportRow = z.infer<typeof GA4ReportRowSchema>

/** Extract metric values from a GA4 report row by name */
export function ga4MetricValue(
  headers: { name: string }[],
  row: GA4ReportRow,
  name: string
): number {
  const idx = headers.findIndex(h => h.name === name)
  if (idx === -1) return 0
  return parseFloat(row.metricValues[idx]?.value ?? '0') || 0
}

export function ga4DimensionValue(
  headers: { name: string }[],
  row: GA4ReportRow,
  name: string
): string {
  const idx = headers.findIndex(h => h.name === name)
  if (idx === -1) return ''
  return row.dimensionValues[idx]?.value ?? ''
}

// ─── Database row (from daily_metrics table) ─────────────────────────────────

/**
 * Shape of a row returned by SELECT * FROM daily_metrics
 * Used when reading already-synced metrics from Supabase.
 */
export const DailyMetricRowSchema = z.object({
  id:                     z.string(),
  organization_id:        z.string(),
  client_id:              z.string(),
  platform_account_id:    z.string().nullable(),
  campaign_id:            z.string(),
  ad_group_id:            z.string().nullable(),
  ad_id:                  z.string().nullable(),
  platform:               z.string(),
  date:                   z.string(),
  impressions:            z.number(),
  clicks:                 z.number(),
  spend:                  z.number(),
  conversions:            z.number(),
  conversion_value:       z.number(),
  video_views:            z.number().default(0),
  video_view_rate:        z.number().default(0),
  video_completions:      z.number().default(0),
  video_completion_rate:  z.number().default(0),
  reach:                  z.number().default(0),
  frequency:              z.number().default(0),
  ctr:                    z.number(),
  cpc:                    z.number(),
  cpm:                    z.number(),
  cpa:                    z.number().nullable(),
  roas:                   z.number().nullable(),
  quality_score:          z.number().nullable(),
  impression_share:       z.number().nullable(),
  platform_data:          z.record(z.unknown()).default({}),
  created_at:             z.string(),
  updated_at:             z.string(),
})

export type DailyMetricRow = z.infer<typeof DailyMetricRowSchema>
