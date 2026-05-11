/**
 * Aggregation, grouping, and period-comparison functions for UnifiedMetric arrays.
 *
 * Core rule: never average rates — always re-derive them from summed additive
 * fields using deriveRates(). This matches how ad platforms compute blended
 * performance numbers.
 */

import { deriveRates } from './calculate'
import { calcDelta } from './calculate'
import type { UnifiedMetric, AggregatedMetric, MetricComparison } from './types'
import type { Platform } from './types'

// ─── Additive field keys ──────────────────────────────────────────────────────

const ADDITIVE_KEYS = [
  'impressions', 'clicks', 'spend', 'conversions', 'revenue',
  'leads', 'reach', 'video_views', 'video_completions',
] as const

type AdditiveKey = typeof ADDITIVE_KEYS[number]

function sumAdditive(metrics: UnifiedMetric[]): Record<AdditiveKey, number> {
  const acc = Object.fromEntries(ADDITIVE_KEYS.map(k => [k, 0])) as Record<AdditiveKey, number>
  for (const m of metrics) {
    for (const k of ADDITIVE_KEYS) {
      acc[k] += (m[k] as number) ?? 0
    }
  }
  return acc
}

// ─── Single-metric aggregation ────────────────────────────────────────────────

/**
 * Aggregate an array of UnifiedMetrics into one AggregatedMetric.
 * All additive fields are summed; all rate fields are re-derived.
 * The resulting date is the earliest date in the set; date_end is the latest.
 */
export function aggregate(
  metrics: UnifiedMetric[],
  opts?: { campaignId?: string; campaignName?: string }
): AggregatedMetric | null {
  if (!metrics.length) return null

  const sums  = sumAdditive(metrics)
  const rates = deriveRates(sums)
  const dates = metrics.map(m => m.date).sort()

  // Pick a representative metric for non-aggregatable fields
  const first = metrics[0]

  // Quality score: average of non-null values
  const qs = metrics.filter(m => m.quality_score != null)
  const quality_score = qs.length
    ? Math.round(qs.reduce((s, m) => s + m.quality_score!, 0) / qs.length * 10) / 10
    : null

  // Impression share: average of non-null values
  const is_ = metrics.filter(m => m.impression_share != null)
  const impression_share = is_.length
    ? Math.round(is_.reduce((s, m) => s + m.impression_share!, 0) / is_.length * 100) / 100
    : null

  return {
    date:          dates[0],
    date_end:      dates[dates.length - 1],
    campaign_count: new Set(metrics.map(m => m.campaign_id)).size,
    platform:      first.platform,
    account_id:    first.account_id,
    campaign_id:   opts?.campaignId ?? (metrics.every(m => m.campaign_id === first.campaign_id) ? first.campaign_id : 'aggregated'),
    campaign_name: opts?.campaignName ?? first.campaign_name,
    currency:      first.currency,

    ...sums,
    ...rates,

    frequency:     rates.frequency,
    quality_score,
    impression_share,
    platform_data: {},
  }
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/** Group metrics by date (YYYY-MM-DD). Preserves sort order. */
export function groupByDate(metrics: UnifiedMetric[]): Map<string, UnifiedMetric[]> {
  const map = new Map<string, UnifiedMetric[]>()
  for (const m of metrics) {
    const arr = map.get(m.date) ?? []
    arr.push(m)
    map.set(m.date, arr)
  }
  return map
}

/** Group metrics by platform. */
export function groupByPlatform(metrics: UnifiedMetric[]): Map<Platform, UnifiedMetric[]> {
  const map = new Map<Platform, UnifiedMetric[]>()
  for (const m of metrics) {
    const arr = map.get(m.platform) ?? []
    arr.push(m)
    map.set(m.platform, arr)
  }
  return map
}

/** Group metrics by campaign_id. */
export function groupByCampaign(metrics: UnifiedMetric[]): Map<string, UnifiedMetric[]> {
  const map = new Map<string, UnifiedMetric[]>()
  for (const m of metrics) {
    const arr = map.get(m.campaign_id) ?? []
    arr.push(m)
    map.set(m.campaign_id, arr)
  }
  return map
}

// ─── Daily aggregation (one row per day, all campaigns/platforms summed) ─────

/**
 * Produce one AggregatedMetric per unique date, summing across all campaigns/platforms.
 * Returns an array sorted by date ascending, suitable for time-series charts.
 */
export function aggregateByDay(metrics: UnifiedMetric[]): AggregatedMetric[] {
  const byDate = groupByDate(metrics)
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => aggregate(rows, { campaignId: 'all', campaignName: 'All Campaigns' })!)
    .filter(Boolean)
}

/**
 * Produce one AggregatedMetric per unique platform, summing across all dates/campaigns.
 * Sorted by spend descending.
 */
export function aggregateByPlatform(metrics: UnifiedMetric[]): (AggregatedMetric & { platform: Platform })[] {
  const byPlatform = groupByPlatform(metrics)
  return Array.from(byPlatform.entries())
    .map(([platform, rows]) => ({ ...aggregate(rows, { campaignId: 'all', campaignName: platform })!, platform }))
    .sort((a, b) => b.spend - a.spend)
}

/**
 * Produce one AggregatedMetric per unique campaign, summing across all dates.
 * Sorted by spend descending.
 */
export function aggregateByCampaign(metrics: UnifiedMetric[]): AggregatedMetric[] {
  const byCampaign = groupByCampaign(metrics)
  return Array.from(byCampaign.entries())
    .map(([id, rows]) => aggregate(rows, { campaignId: id, campaignName: rows[0].campaign_name })!)
    .sort((a, b) => b.spend - a.spend)
}

// ─── Period comparison ────────────────────────────────────────────────────────

/**
 * Compare metrics between a current period and a previous period.
 * Both arrays may span multiple campaigns/platforms — they are fully aggregated first.
 */
export function comparePeriods(
  current: UnifiedMetric[],
  previous: UnifiedMetric[],
  periodDates:  { start: string; end: string },
  previousDates: { start: string; end: string }
): MetricComparison {
  const cur = aggregate(current)
  const pre = aggregate(previous)

  const delta = (key: string, c: number | null, p: number | null) =>
    calcDelta(c, p, key)

  return {
    period:   periodDates,
    previous: previousDates,
    spend:           delta('spend',           cur?.spend           ?? 0, pre?.spend           ?? 0),
    impressions:     delta('impressions',     cur?.impressions     ?? 0, pre?.impressions     ?? 0),
    clicks:          delta('clicks',          cur?.clicks          ?? 0, pre?.clicks          ?? 0),
    ctr:             delta('ctr',             cur?.ctr             ?? 0, pre?.ctr             ?? 0),
    cpc:             delta('cpc',             cur?.cpc             ?? 0, pre?.cpc             ?? 0),
    cpm:             delta('cpm',             cur?.cpm             ?? 0, pre?.cpm             ?? 0),
    conversions:     delta('conversions',     cur?.conversions     ?? 0, pre?.conversions     ?? 0),
    conversion_rate: delta('conversion_rate', cur?.conversion_rate ?? 0, pre?.conversion_rate ?? 0),
    leads:           delta('leads',           cur?.leads           ?? 0, pre?.leads           ?? 0),
    cost_per_lead:   delta('cost_per_lead',   cur?.cost_per_lead   ?? 0, pre?.cost_per_lead   ?? 0),
    revenue:         delta('revenue',         cur?.revenue         ?? 0, pre?.revenue         ?? 0),
    roas:            delta('roas',            cur?.roas            ?? 0, pre?.roas            ?? 0),
  }
}

// ─── Date range helpers ───────────────────────────────────────────────────────

export interface DateRange {
  start: string  // YYYY-MM-DD
  end:   string  // YYYY-MM-DD
}

/** Filter metrics to those within [start, end] inclusive. */
export function filterByDateRange(metrics: UnifiedMetric[], range: DateRange): UnifiedMetric[] {
  return metrics.filter(m => m.date >= range.start && m.date <= range.end)
}

/** Filter metrics to a specific platform. */
export function filterByPlatform(metrics: UnifiedMetric[], platform: Platform): UnifiedMetric[] {
  return metrics.filter(m => m.platform === platform)
}

/** Filter metrics to a specific campaign. */
export function filterByCampaign(metrics: UnifiedMetric[], campaignId: string): UnifiedMetric[] {
  return metrics.filter(m => m.campaign_id === campaignId)
}

/**
 * Return the previous period with equal length, ending the day before the current start.
 * e.g. 30-day current → previous 30-day period
 */
export function previousPeriod(range: DateRange): DateRange {
  const start = new Date(range.start)
  const end   = new Date(range.end)
  const days  = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1

  const prevEnd   = new Date(start.getTime() - 86_400_000)
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(prevStart), end: fmt(prevEnd) }
}

// ─── Spend share ─────────────────────────────────────────────────────────────

export interface SpendShare {
  label:        string
  spend:        number
  percentage:   number
  impressions:  number
  conversions:  number
}

/** Compute spend share by platform, sorted descending. */
export function spendShareByPlatform(metrics: UnifiedMetric[]): SpendShare[] {
  const byPlatform = aggregateByPlatform(metrics)
  const total      = byPlatform.reduce((s, p) => s + p.spend, 0)
  if (total === 0) return []
  return byPlatform.map(p => ({
    label:       p.platform,
    spend:       p.spend,
    percentage:  Math.round((p.spend / total) * 1000) / 10,
    impressions: p.impressions,
    conversions: p.conversions,
  }))
}

/** Compute spend share by campaign, top N sorted descending. */
export function spendShareByCampaign(metrics: UnifiedMetric[], topN = 10): SpendShare[] {
  const byCampaign = aggregateByCampaign(metrics)
  const total      = byCampaign.reduce((s, c) => s + c.spend, 0)
  if (total === 0) return []
  return byCampaign.slice(0, topN).map(c => ({
    label:       c.campaign_name,
    spend:       c.spend,
    percentage:  Math.round((c.spend / total) * 1000) / 10,
    impressions: c.impressions,
    conversions: c.conversions,
  }))
}
