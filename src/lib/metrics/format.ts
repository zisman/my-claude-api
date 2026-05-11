/**
 * Formatting utilities for metric display.
 * All functions are pure and locale-aware (en-US default).
 */

import type { UnifiedMetric } from './types'

// ─── Currency ─────────────────────────────────────────────────────────────────

const CURRENCY_FORMATTERS = new Map<string, Intl.NumberFormat>()

function getCurrencyFormatter(currency: string, decimals = 0): Intl.NumberFormat {
  const key = `${currency}-${decimals}`
  if (!CURRENCY_FORMATTERS.has(key)) {
    CURRENCY_FORMATTERS.set(key, new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }))
  }
  return CURRENCY_FORMATTERS.get(key)!
}

/**
 * Format a spend/cost value.
 * $1,234 for whole numbers; $1,234.56 for values < $1
 */
export function fmtCurrency(amount: number, currency = 'USD'): string {
  if (Math.abs(amount) < 1) return getCurrencyFormatter(currency, 2).format(amount)
  return getCurrencyFormatter(currency, 0).format(amount)
}

export function fmtCurrencyExact(amount: number, currency = 'USD'): string {
  return getCurrencyFormatter(currency, 2).format(amount)
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

/** Compact number: 1,234,567 → 1.2M, 12,345 → 12.3K */
export function fmtNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

/** Full precision number with thousands separator */
export function fmtNumberFull(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

// ─── Percentages ──────────────────────────────────────────────────────────────

export function fmtPercent(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`
}

export function fmtPercent1(n: number): string { return fmtPercent(n, 1) }
export function fmtPercent2(n: number): string { return fmtPercent(n, 2) }

// ─── Ratios ───────────────────────────────────────────────────────────────────

export function fmtROAS(roas: number | null): string {
  if (roas == null) return '—'
  return `${roas.toFixed(2)}x`
}

export function fmtMultiplier(n: number): string {
  return `${n.toFixed(2)}x`
}

// ─── Delta formatting ─────────────────────────────────────────────────────────

/**
 * Format a relative change (e.g. +12.3% or −4.5%).
 * Returns '—' when previous was 0 (undefined change).
 */
export function fmtDelta(relative: number | null, decimals = 1): string {
  if (relative == null) return '—'
  const sign = relative >= 0 ? '+' : ''
  return `${sign}${relative.toFixed(decimals)}%`
}

/**
 * Returns 'positive', 'negative', or 'neutral' CSS-class hint
 * based on whether the change is favorable.
 */
export function deltaColor(improved: boolean | null): 'positive' | 'negative' | 'neutral' {
  if (improved === null) return 'neutral'
  return improved ? 'positive' : 'negative'
}

// ─── Unified dispatch ─────────────────────────────────────────────────────────

/** Format any UnifiedMetric field by key name. */
export function fmtMetric(key: keyof UnifiedMetric | string, value: number | null, currency = 'USD'): string {
  if (value == null) return '—'
  switch (key) {
    // Currency
    case 'spend':
    case 'revenue':    return fmtCurrency(value, currency)
    case 'cpc':
    case 'cpm':
    case 'cost_per_lead': return fmtCurrencyExact(value, currency)

    // Percentages
    case 'ctr':
    case 'conversion_rate':
    case 'video_view_rate':
    case 'video_completion_rate':
    case 'impression_share': return fmtPercent(value)

    // Ratio
    case 'roas':      return fmtROAS(value)
    case 'frequency': return value.toFixed(2)

    // Integer counts
    case 'impressions':
    case 'clicks':
    case 'conversions':
    case 'leads':
    case 'video_views':
    case 'video_completions':
    case 'reach':     return fmtNumber(value)

    // Scores
    case 'quality_score': return value.toFixed(1)

    default: return fmtNumber(value, 2)
  }
}

// ─── Metric labels ────────────────────────────────────────────────────────────

export const METRIC_LABELS: Record<string, string> = {
  impressions:          'Impressions',
  clicks:               'Clicks',
  reach:                'Reach',
  spend:                'Spend',
  ctr:                  'CTR',
  cpc:                  'CPC',
  cpm:                  'CPM',
  conversions:          'Conversions',
  conversion_rate:      'Conv. Rate',
  revenue:              'Revenue',
  roas:                 'ROAS',
  leads:                'Leads',
  cost_per_lead:        'Cost / Lead',
  video_views:          'Video Views',
  video_view_rate:      'View Rate',
  video_completions:    'Completions',
  video_completion_rate:'Completion Rate',
  frequency:            'Frequency',
  quality_score:        'Quality Score',
  impression_share:     'Impr. Share',
}

export function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Platform labels ──────────────────────────────────────────────────────────

export const PLATFORM_LABELS: Record<string, string> = {
  google_ads:   'Google Ads',
  meta_ads:     'Meta Ads',
  linkedin_ads: 'LinkedIn Ads',
  ga4:          'Google Analytics 4',
}

export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform
}

// ─── Backward-compat aliases (imported as 'normalize' by existing pages) ──────

export { fmtCurrency as formatCurrency }
export { fmtNumber   as formatNumber   }
export { fmtPercent  as formatPercent  }
export { fmtROAS     as formatROAS     }
