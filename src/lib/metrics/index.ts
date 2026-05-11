/**
 * Unified metrics system — public API.
 *
 * Usage:
 *   import { normalizeGoogleAdsRow, aggregate, fmtCurrency } from '@/lib/metrics'
 *
 * Or targeted imports:
 *   import type { UnifiedMetric } from '@/lib/metrics/types'
 *   import { calcROAS, BENCHMARKS }  from '@/lib/metrics/calculate'
 */

// Types + Zod schemas
export type {
  UnifiedMetric,
  AggregatedMetric,
  MetricDelta,
  MetricComparison,
  Platform,
  ValidationResult,
} from './types'
export {
  UnifiedMetricSchema,
  AggregatedMetricSchema,
  PlatformSchema,
  METRIC_POLARITY,
} from './types'

// Platform raw types + helpers
export type {
  GoogleAdsMetricsRow,
  GoogleAdsCampaign,
  MetaInsightsRow,
  LinkedInAnalyticsRow,
  GA4Report,
  GA4ReportRow,
  DailyMetricRow,
} from './platform-types'
export {
  GoogleAdsMetricsRowSchema,
  MetaInsightsRowSchema,
  LinkedInAnalyticsRowSchema,
  GA4ReportSchema,
  DailyMetricRowSchema,
  metaActionValue,
  ga4MetricValue,
  ga4DimensionValue,
} from './platform-types'

// Calculation helpers
export {
  // Primitives
  clamp, round,
  // Rate metrics
  calcCTR, calcCPC, calcCPM,
  calcConversionRate, calcROAS, calcCPA, calcCostPerLead,
  calcVideoViewRate, calcVideoCompletionRate, calcFrequency,
  // Aggregation helpers
  deriveRates,
  // Period delta
  calcDelta,
  // Budget
  calcPacingRate, projectSpend,
  // Benchmarks
  BENCHMARKS, scoreBenchmark,
} from './calculate'

// Normalizers
export {
  normalizeGoogleAdsRow,
  normalizeMetaRow,
  normalizeLinkedInRow,
  normalizeGA4Report,
  fromDailyMetricRow,
  validateUnifiedMetric,
  // Format helpers (kept in normalize.ts for backward compat)
  formatCurrency,
  formatCurrencyExact,
  formatNumber,
  formatPercent,
  formatROAS,
  formatMetricValue,
} from './normalize'
export type { NormalizeResult } from './normalize'

// Aggregation
export {
  aggregate,
  groupByDate,
  groupByPlatform,
  groupByCampaign,
  aggregateByDay,
  aggregateByPlatform,
  aggregateByCampaign,
  comparePeriods,
  filterByDateRange,
  filterByPlatform,
  filterByCampaign,
  previousPeriod,
  spendShareByPlatform,
  spendShareByCampaign,
} from './aggregate'
export type { DateRange, SpendShare } from './aggregate'

// Formatting
export {
  fmtCurrency,
  fmtCurrencyExact,
  fmtNumber,
  fmtNumberFull,
  fmtPercent, fmtPercent1, fmtPercent2,
  fmtROAS,
  fmtMultiplier,
  fmtDelta,
  deltaColor,
  fmtMetric,
  metricLabel,
  platformLabel,
  METRIC_LABELS,
  PLATFORM_LABELS,
} from './format'
