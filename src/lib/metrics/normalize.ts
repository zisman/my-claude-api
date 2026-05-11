import type { CampaignMetrics, PlatformType } from '@/types'

// Unified metric format for cross-platform comparison
export interface NormalizedMetric {
  date: string
  platform: PlatformType
  campaign_id: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  ctr: number
  cpc: number
  cpm: number
  roas: number | null
}

export function normalizeMetrics(
  raw: CampaignMetrics[],
  platform: PlatformType,
  campaignId: string
): NormalizedMetric[] {
  return raw.map(m => ({
    date: m.date,
    platform,
    campaign_id: campaignId,
    impressions: Number(m.impressions),
    clicks: Number(m.clicks),
    spend: Number(m.spend),
    conversions: Number(m.conversions),
    conversion_value: Number(m.conversion_value),
    ctr: Number(m.ctr),
    cpc: Number(m.cpc),
    cpm: Number(m.cpm),
    roas: m.roas != null ? Number(m.roas) : null,
  }))
}

export function aggregateMetrics(metrics: NormalizedMetric[]) {
  return metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      spend: acc.spend + m.spend,
      conversions: acc.conversions + m.conversions,
      conversion_value: acc.conversion_value + m.conversion_value,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      roas: null,
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversion_value: 0, ctr: 0, cpc: 0, cpm: 0, roas: null as number | null }
  )
}

export function computeDerivedMetrics(agg: ReturnType<typeof aggregateMetrics>) {
  const ctr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0
  const cpc = agg.clicks > 0 ? agg.spend / agg.clicks : 0
  const cpm = agg.impressions > 0 ? (agg.spend / agg.impressions) * 1000 : 0
  const roas = agg.spend > 0 && agg.conversion_value > 0 ? agg.conversion_value / agg.spend : null
  return { ...agg, ctr, cpc, cpm, roas }
}

export function groupByDate(metrics: NormalizedMetric[]) {
  const byDate = new Map<string, NormalizedMetric[]>()
  for (const m of metrics) {
    const existing = byDate.get(m.date) ?? []
    existing.push(m)
    byDate.set(m.date, existing)
  }
  return byDate
}

export function groupByPlatform(metrics: NormalizedMetric[]) {
  const byPlatform = new Map<PlatformType, NormalizedMetric[]>()
  for (const m of metrics) {
    const existing = byPlatform.get(m.platform) ?? []
    existing.push(m)
    byPlatform.set(m.platform, existing)
  }
  return byPlatform
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function formatNumber(n: number, decimals = 0): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

export function formatPercent(n: number, decimals = 2): string {
  return `${n.toFixed(decimals)}%`
}

export function formatROAS(roas: number | null): string {
  if (roas == null) return '—'
  return `${roas.toFixed(2)}x`
}
