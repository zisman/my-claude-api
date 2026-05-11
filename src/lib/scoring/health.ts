import type { CampaignMetrics, BudgetTracking, HealthScore } from '@/types'

export interface HealthComponents {
  budget_pacing: number
  ctr_benchmark: number
  conversion_rate: number
  quality_score: number
  spend_efficiency: number
}

// Industry benchmarks (configurable per client in production)
const BENCHMARKS = {
  ctr: { poor: 0.5, average: 2.0, good: 5.0 },
  conversion_rate: { poor: 1.0, average: 3.0, good: 7.0 },
  pacing: { underpace: 0.7, overpace: 1.3 },
}

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v))
}

function scoreMetric(value: number, poor: number, good: number): number {
  if (value >= good) return 100
  if (value <= poor) return 0
  return clamp(((value - poor) / (good - poor)) * 100)
}

export function calculateHealthScore(
  metrics: CampaignMetrics[],
  budget?: BudgetTracking
): Omit<HealthScore, 'id' | 'campaign_id' | 'calculated_at'> {
  if (!metrics.length) {
    return { score: 0, components: { budget_pacing: 0, ctr_benchmark: 0, conversion_rate: 0, quality_score: 0, spend_efficiency: 0 }, trend: 'stable' }
  }

  const latest = metrics[metrics.length - 1]
  const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0)
  const totalConversions = metrics.reduce((s, m) => s + Number(m.conversions), 0)
  const totalClicks = metrics.reduce((s, m) => s + Number(m.clicks), 0)
  const totalImpressions = metrics.reduce((s, m) => s + Number(m.impressions), 0)

  const overallCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

  const components: HealthComponents = {
    budget_pacing: budget ? scorePacing(budget.pacing_rate) : 50,
    ctr_benchmark: scoreMetric(overallCtr, BENCHMARKS.ctr.poor, BENCHMARKS.ctr.good),
    conversion_rate: scoreMetric(conversionRate, BENCHMARKS.conversion_rate.poor, BENCHMARKS.conversion_rate.good),
    quality_score: latest.quality_score ? clamp(latest.quality_score * 10) : 50,
    spend_efficiency: latest.roas ? clamp(Math.min(latest.roas / 4, 1) * 100) : 50,
  }

  const weights = { budget_pacing: 0.2, ctr_benchmark: 0.25, conversion_rate: 0.3, quality_score: 0.15, spend_efficiency: 0.1 }
  const score = Object.entries(components).reduce(
    (sum, [key, val]) => sum + val * weights[key as keyof HealthComponents],
    0
  )

  const trend = calculateTrend(metrics)

  return { score: Math.round(score * 10) / 10, components, trend }
}

function scorePacing(pacingRate: number): number {
  // 1.0 = perfect pacing. Penalize both underpacing and overpacing.
  if (pacingRate >= 0.9 && pacingRate <= 1.1) return 100
  if (pacingRate < BENCHMARKS.pacing.underpace || pacingRate > BENCHMARKS.pacing.overpace) return 0
  if (pacingRate < 0.9) return clamp(((pacingRate - 0.7) / 0.2) * 100)
  return clamp(((1.3 - pacingRate) / 0.2) * 100)
}

function calculateTrend(metrics: CampaignMetrics[]): HealthScore['trend'] {
  if (metrics.length < 7) return 'stable'
  const half = Math.floor(metrics.length / 2)
  const firstHalfRoas = metrics.slice(0, half).reduce((s, m) => s + (m.roas ?? 0), 0) / half
  const secondHalfRoas = metrics.slice(half).reduce((s, m) => s + (m.roas ?? 0), 0) / (metrics.length - half)
  const change = secondHalfRoas - firstHalfRoas
  if (change > 0.1) return 'improving'
  if (change < -0.1) return 'declining'
  return 'stable'
}
