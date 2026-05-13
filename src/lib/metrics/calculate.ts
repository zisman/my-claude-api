/**
 * Pure metric calculation helpers.
 * All functions are deterministic and side-effect free.
 * Input values are assumed non-negative unless noted.
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

/** Safe division — returns null when denominator is zero */
function safeDivide(numerator: number, denominator: number): number | null {
  if (denominator === 0 || !isFinite(denominator)) return null
  return numerator / denominator
}

/** Clamp a value to [min, max] */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

/** Round to n decimal places */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

// ─── Rate / ratio metrics ─────────────────────────────────────────────────────

/**
 * Click-through rate as a percentage (0–100).
 * CTR = clicks / impressions × 100
 */
export function calcCTR(clicks: number, impressions: number): number {
  return round(clamp((safeDivide(clicks, impressions) ?? 0) * 100, 0, 100), 4)
}

/**
 * Cost per click.
 * CPC = spend / clicks
 */
export function calcCPC(spend: number, clicks: number): number {
  return round(safeDivide(spend, clicks) ?? 0, 4)
}

/**
 * Cost per thousand impressions.
 * CPM = spend / impressions × 1000
 */
export function calcCPM(spend: number, impressions: number): number {
  return round((safeDivide(spend, impressions) ?? 0) * 1000, 4)
}

/**
 * Conversion rate as a percentage (0–100).
 * CVR = conversions / clicks × 100
 * Returns null when clicks = 0 (prevents misleading 0%).
 */
export function calcConversionRate(conversions: number, clicks: number): number | null {
  if (clicks === 0) return null
  return round(clamp((conversions / clicks) * 100, 0, 100), 4)
}

/**
 * Return on ad spend.
 * ROAS = revenue / spend
 * Returns null when spend = 0.
 */
export function calcROAS(revenue: number, spend: number): number | null {
  return round(safeDivide(revenue, spend) ?? 0, 4) || null
}

/**
 * Cost per acquisition (CPA).
 * CPA = spend / conversions
 * Returns null when conversions = 0.
 */
export function calcCPA(spend: number, conversions: number): number | null {
  if (conversions === 0) return null
  return round(spend / conversions, 4)
}

/**
 * Cost per lead.
 * CPL = spend / leads
 * Returns null when leads = 0.
 */
export function calcCostPerLead(spend: number, leads: number): number | null {
  if (leads === 0) return null
  return round(spend / leads, 4)
}

/**
 * Video view rate as a percentage.
 * VVR = video_views / impressions × 100
 */
export function calcVideoViewRate(videoViews: number, impressions: number): number {
  return round(clamp((safeDivide(videoViews, impressions) ?? 0) * 100), 4)
}

/**
 * Video completion rate as a percentage.
 * VCR = video_completions / video_views × 100
 */
export function calcVideoCompletionRate(completions: number, views: number): number {
  return round(clamp((safeDivide(completions, views) ?? 0) * 100), 4)
}

/**
 * Frequency — average number of times a person saw an ad.
 * Frequency = impressions / reach
 */
export function calcFrequency(impressions: number, reach: number): number | null {
  return round(safeDivide(impressions, reach) ?? 0, 2) || null
}

// ─── Re-derive all rates from aggregated sums ─────────────────────────────────

export interface MetricSums {
  impressions:    number
  clicks:         number
  spend:          number
  conversions:    number
  revenue:        number
  leads:          number
  reach:          number
  video_views:    number
  video_completions: number
}

export interface DerivedRates {
  ctr:              number
  cpc:              number
  cpm:              number
  conversion_rate:  number | null
  roas:             number | null
  cost_per_lead:    number | null
  video_view_rate:  number
  video_completion_rate: number
  frequency:        number | null
}

/**
 * Given raw additive sums, compute all derived rate metrics.
 * Use this after aggregating rows — never average rates directly.
 */
export function deriveRates(sums: MetricSums): DerivedRates {
  return {
    ctr:                   calcCTR(sums.clicks, sums.impressions),
    cpc:                   calcCPC(sums.spend, sums.clicks),
    cpm:                   calcCPM(sums.spend, sums.impressions),
    conversion_rate:       calcConversionRate(sums.conversions, sums.clicks),
    roas:                  calcROAS(sums.revenue, sums.spend),
    cost_per_lead:         calcCostPerLead(sums.spend, sums.leads),
    video_view_rate:       calcVideoViewRate(sums.video_views, sums.impressions),
    video_completion_rate: calcVideoCompletionRate(sums.video_completions, sums.video_views),
    frequency:             calcFrequency(sums.impressions, sums.reach),
  }
}

// ─── Period-over-period delta ─────────────────────────────────────────────────

import type { MetricDelta } from './types'
import { METRIC_POLARITY } from './types'

/**
 * Compute the delta between a current and previous value.
 * `metricKey` is used only to determine whether higher is better (polarity).
 */
export function calcDelta(
  current: number | null,
  previous: number | null,
  metricKey: string
): MetricDelta {
  const c = current  ?? 0
  const p = previous ?? 0
  const absolute = c - p
  const relative = p !== 0 ? ((c - p) / Math.abs(p)) * 100 : null
  const polarity = METRIC_POLARITY[metricKey]
  const improved = polarity === undefined
    ? null
    : polarity
      ? absolute > 0
      : absolute < 0

  return { current: c, previous: p, absolute, relative, improved }
}

// ─── Budget pacing ────────────────────────────────────────────────────────────

/**
 * Budget pacing rate: how close actual spend is to the expected spend
 * at this point in the flight.
 *
 * Returns:
 *  - 1.0 = perfectly on pace
 *  - < 1.0 = underpacing (spending less than expected)
 *  - > 1.0 = overpacing  (spending more than expected)
 */
export function calcPacingRate(opts: {
  actualSpend:    number
  totalBudget:    number
  flightDays:     number   // total days in the flight
  elapsedDays:    number   // days elapsed so far
}): number {
  const { actualSpend, totalBudget, flightDays, elapsedDays } = opts
  if (totalBudget <= 0 || flightDays <= 0) return 1
  const expectedFraction = Math.min(elapsedDays / flightDays, 1)
  const expectedSpend    = totalBudget * expectedFraction
  if (expectedSpend === 0) return actualSpend === 0 ? 1 : Infinity
  return round(actualSpend / expectedSpend, 4)
}

/**
 * Project total spend at current pace.
 */
export function projectSpend(opts: {
  actualSpend:  number
  elapsedDays:  number
  remainingDays: number
}): number {
  const { actualSpend, elapsedDays, remainingDays } = opts
  if (elapsedDays <= 0) return actualSpend
  const dailyRate = actualSpend / elapsedDays
  return round(actualSpend + dailyRate * remainingDays, 2)
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

/**
 * Industry benchmarks by platform.
 * All CTR values are percentages; conversion rates are percentages.
 */
export const BENCHMARKS = {
  google_ads: {
    ctr:             { poor: 1.0,  average: 3.5,  good: 7.0  },
    conversion_rate: { poor: 1.5,  average: 4.0,  good: 8.0  },
    roas:            { poor: 1.5,  average: 3.0,  good: 6.0  },
    cpc:             { poor: 8.0,  average: 3.5,  good: 1.5  }, // lower is better
  },
  meta_ads: {
    ctr:             { poor: 0.5,  average: 1.5,  good: 3.5  },
    conversion_rate: { poor: 1.0,  average: 2.5,  good: 5.0  },
    roas:            { poor: 1.0,  average: 2.5,  good: 5.0  },
    cpc:             { poor: 3.0,  average: 1.5,  good: 0.5  },
  },
  linkedin_ads: {
    ctr:             { poor: 0.2,  average: 0.5,  good: 1.5  },
    conversion_rate: { poor: 0.5,  average: 2.0,  good: 5.0  },
    roas:            { poor: 1.0,  average: 2.0,  good: 4.0  },
    cpc:             { poor: 12.0, average: 7.0,  good: 3.0  },
  },
  ga4: {
    ctr:             { poor: 0.5,  average: 2.0,  good: 5.0  },
    conversion_rate: { poor: 1.0,  average: 3.0,  good: 6.0  },
    roas:            { poor: 1.0,  average: 2.5,  good: 5.0  },
    cpc:             { poor: 5.0,  average: 2.5,  good: 1.0  },
  },
} as const

export type BenchmarkPlatform = keyof typeof BENCHMARKS
export type BenchmarkMetric = keyof (typeof BENCHMARKS)[BenchmarkPlatform]

/**
 * Score a metric value against platform benchmarks.
 * Returns 0–100 where 100 = at or above the "good" threshold.
 */
export function scoreBenchmark(
  value: number,
  platform: BenchmarkPlatform,
  metric: BenchmarkMetric
): number {
  const bench = BENCHMARKS[platform]?.[metric]
  if (!bench) return 50

  const { poor, good } = bench as { poor: number; good: number }

  // For "lower is better" metrics (cpc), good < poor
  if (good < poor) {
    if (value <= good) return 100
    if (value >= poor) return 0
    return clamp(((poor - value) / (poor - good)) * 100)
  }

  // Standard "higher is better"
  if (value >= good) return 100
  if (value <= poor) return 0
  return clamp(((value - poor) / (good - poor)) * 100)
}
