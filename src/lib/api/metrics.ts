/**
 * Metrics API — queries daily_metrics, v_campaign_summary, v_org_daily_totals,
 * v_spend_by_platform and converts rows to UnifiedMetric via the metrics module.
 */
import { supabase } from '@/lib/supabase/client'
import { fromDailyMetricRow } from '@/lib/metrics/normalize'
import { aggregate, aggregateByDay, aggregateByPlatform, previousPeriod } from '@/lib/metrics/aggregate'
import type { UnifiedMetric, AggregatedMetric } from '@/lib/metrics/types'
import type { DailyMetricRow } from '@/lib/metrics/platform-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function monthStart(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().slice(0, 10)
}

// ─── Campaign summary view ─────────────────────────────────────────────────────

export interface CampaignSummary {
  id: string
  organization_id: string
  client_id: string
  client_name: string
  platform: string
  name: string
  status: string
  objective: string | null
  campaign_type: string | null
  daily_budget: number | null
  total_budget: number | null
  currency: string
  start_date: string | null
  end_date: string | null
  bidding_strategy: string | null
  target_cpa: number | null
  target_roas: number | null
  health_score: number | null
  health_trend: 'improving' | 'stable' | 'declining' | null
  health_components: Record<string, number> | null
  // 30d aggregates
  impressions_30d: number
  clicks_30d: number
  spend_30d: number
  conversions_30d: number
  conversion_value_30d: number
  ctr_30d: number
  cpc_30d: number
  roas_30d: number | null
  created_at: string
  updated_at: string
}

export async function getCampaignSummaries(opts: {
  organizationId: string
  clientId?: string
  status?: string[]
  platform?: string[]
  search?: string
}): Promise<CampaignSummary[]> {
  let q = db.from('v_campaign_summary').select('*').eq('organization_id', opts.organizationId)
  if (opts.clientId)    q = q.eq('client_id', opts.clientId)
  if (opts.status?.length) q = q.in('status', opts.status)
  if (opts.platform?.length) q = q.in('platform', opts.platform)
  if (opts.search) q = q.ilike('name', `%${opts.search}%`)
  q = q.order('spend_30d', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as CampaignSummary[]
}

// ─── Client overview view ─────────────────────────────────────────────────────

export interface ClientOverview {
  id: string
  organization_id: string
  name: string
  industry: string | null
  status: string
  monthly_budget: number | null
  currency: string
  account_manager_id: string | null
  account_manager_name: string | null
  platform_count: number
  connected_platform_count: number
  campaign_count: number
  active_campaign_count: number
  open_alert_count: number
  open_task_count: number
  spend_mtd: number
  avg_health_score: number | null
  created_at: string
  updated_at: string
}

export async function getClientOverviews(organizationId: string): Promise<ClientOverview[]> {
  const { data, error } = await db
    .from('v_client_overview')
    .select('*')
    .eq('organization_id', organizationId)
    .order('spend_mtd', { ascending: false })
  if (error) throw error
  return (data ?? []) as ClientOverview[]
}

// ─── Org daily totals (trend charts) ─────────────────────────────────────────

export interface OrgDailyTotal {
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
  conversion_value: number
  ctr: number
  cpc: number
  roas: number | null
}

export async function getOrgDailyTotals(organizationId: string, days = 30): Promise<OrgDailyTotal[]> {
  const { data, error } = await db
    .from('v_org_daily_totals')
    .select('date,impressions,clicks,spend,conversions,conversion_value,ctr,cpc,roas')
    .eq('organization_id', organizationId)
    .gte('date', daysAgo(days))
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []) as OrgDailyTotal[]
}

// ─── Platform spend ───────────────────────────────────────────────────────────

export interface PlatformSpend {
  platform: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
  percentage: number
}

export async function getPlatformSpend(organizationId: string, days = 30): Promise<PlatformSpend[]> {
  const from = daysAgo(days)
  const { data, error } = await db
    .from('daily_metrics')
    .select('platform, spend, clicks, impressions, conversions')
    .eq('organization_id', organizationId)
    .is('ad_group_id', null)
    .is('ad_id', null)
    .gte('date', from)

  if (error) throw error

  const map = new Map<string, Omit<PlatformSpend, 'percentage'>>()
  for (const row of (data ?? []) as { platform: string; spend: number; clicks: number; impressions: number; conversions: number }[]) {
    const existing = map.get(row.platform) ?? { platform: row.platform, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    existing.spend += Number(row.spend)
    existing.clicks += Number(row.clicks)
    existing.impressions += Number(row.impressions)
    existing.conversions += Number(row.conversions)
    map.set(row.platform, existing)
  }

  const results = Array.from(map.values()).sort((a, b) => b.spend - a.spend)
  const total = results.reduce((s, p) => s + p.spend, 0)
  return results.map(p => ({ ...p, percentage: total > 0 ? Math.round((p.spend / total) * 1000) / 10 : 0 }))
}

// ─── Raw daily_metrics → UnifiedMetric ────────────────────────────────────────

async function fetchDailyMetricRows(opts: {
  organizationId?: string
  clientId?: string
  campaignId?: string
  from: string
  to?: string
}): Promise<UnifiedMetric[]> {
  // Build a campaign_id → name map
  const campaignFilter: Record<string, string> = {}
  if (opts.campaignId) campaignFilter.id = opts.campaignId

  let campQ = db.from('campaigns').select('id, name')
  if (opts.organizationId) campQ = campQ.eq('organization_id', opts.organizationId)
  if (opts.clientId)       campQ = campQ.eq('client_id', opts.clientId)
  if (opts.campaignId)     campQ = campQ.eq('id', opts.campaignId)
  const { data: campaigns } = await campQ
  const nameMap = new Map<string, string>((campaigns ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))

  let q = db
    .from('daily_metrics')
    .select('*')
    .is('ad_group_id', null)
    .is('ad_id', null)
    .gte('date', opts.from)
    .order('date', { ascending: true })

  if (opts.organizationId) q = q.eq('organization_id', opts.organizationId)
  if (opts.clientId)       q = q.eq('client_id', opts.clientId)
  if (opts.campaignId)     q = q.eq('campaign_id', opts.campaignId)
  if (opts.to)             q = q.lte('date', opts.to)

  const { data, error } = await q
  if (error) throw error

  return (data ?? []).map((row: DailyMetricRow) =>
    fromDailyMetricRow(row, nameMap.get(row.campaign_id) ?? '')
  )
}

// ─── Org-level metrics ────────────────────────────────────────────────────────

export interface OrgMetricsSummary {
  current:  AggregatedMetric | null
  previous: AggregatedMetric | null
  trend:    OrgDailyTotal[]
}

export async function getOrgMetrics(organizationId: string, days = 30): Promise<OrgMetricsSummary> {
  const currentStart = daysAgo(days)
  const prev = previousPeriod({ start: currentStart, end: new Date().toISOString().slice(0, 10) })

  const [trend, currentRows, previousRows] = await Promise.all([
    getOrgDailyTotals(organizationId, days),
    fetchDailyMetricRows({ organizationId, from: currentStart }),
    fetchDailyMetricRows({ organizationId, from: prev.start, to: prev.end }),
  ])

  return {
    current:  aggregate(currentRows),
    previous: aggregate(previousRows),
    trend,
  }
}

// ─── Client metrics ───────────────────────────────────────────────────────────

export interface ClientMetricsSummary {
  current:      AggregatedMetric | null
  previous:     AggregatedMetric | null
  byDay:        ReturnType<typeof aggregateByDay>
  byPlatform:   ReturnType<typeof aggregateByPlatform>
  allRows:      UnifiedMetric[]
}

export async function getClientMetrics(clientId: string, days = 30): Promise<ClientMetricsSummary> {
  const currentStart = daysAgo(days)
  const prev = previousPeriod({ start: currentStart, end: new Date().toISOString().slice(0, 10) })

  const [currentRows, previousRows] = await Promise.all([
    fetchDailyMetricRows({ clientId, from: currentStart }),
    fetchDailyMetricRows({ clientId, from: prev.start, to: prev.end }),
  ])

  return {
    current:    aggregate(currentRows),
    previous:   aggregate(previousRows),
    byDay:      aggregateByDay(currentRows),
    byPlatform: aggregateByPlatform(currentRows),
    allRows:    currentRows,
  }
}

// ─── Campaign metrics ─────────────────────────────────────────────────────────

export interface CampaignMetricsSummary {
  current:  AggregatedMetric | null
  previous: AggregatedMetric | null
  byDay:    ReturnType<typeof aggregateByDay>
  allRows:  UnifiedMetric[]
}

export async function getCampaignMetricsSummary(campaignId: string, days = 30): Promise<CampaignMetricsSummary> {
  const currentStart = daysAgo(days)
  const prev = previousPeriod({ start: currentStart, end: new Date().toISOString().slice(0, 10) })

  const [currentRows, previousRows] = await Promise.all([
    fetchDailyMetricRows({ campaignId, from: currentStart }),
    fetchDailyMetricRows({ campaignId, from: prev.start, to: prev.end }),
  ])

  return {
    current:  aggregate(currentRows),
    previous: aggregate(previousRows),
    byDay:    aggregateByDay(currentRows),
    allRows:  currentRows,
  }
}

// ─── MTD summary (for dashboard KPIs) ────────────────────────────────────────

export interface DashboardSummary {
  totalClients: number
  activeCampaigns: number
  openAlerts: number
  pendingTasks: number
  mtd: AggregatedMetric | null
  prevMtd: AggregatedMetric | null
}

export async function getDashboardSummary(organizationId: string): Promise<DashboardSummary> {
  const [clientsRes, campaignsRes, alertsRes, tasksRes] = await Promise.all([
    db.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
    db.from('campaigns').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    db.from('alerts').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'open'),
    db.from('tasks').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['todo', 'in_progress']),
  ])

  const ms = monthStart()
  const lastMonthStart = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10)
  })()
  const lastMonthEnd = (() => {
    const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10)
  })()

  const [mtdRows, prevRows] = await Promise.all([
    fetchDailyMetricRows({ organizationId, from: ms }),
    fetchDailyMetricRows({ organizationId, from: lastMonthStart, to: lastMonthEnd }),
  ])

  return {
    totalClients:    clientsRes.count ?? 0,
    activeCampaigns: campaignsRes.count ?? 0,
    openAlerts:      alertsRes.count ?? 0,
    pendingTasks:    tasksRes.count ?? 0,
    mtd:             aggregate(mtdRows),
    prevMtd:         aggregate(prevRows),
  }
}

// ─── Campaigns requiring attention ───────────────────────────────────────────

export interface AttentionCampaign {
  id: string
  name: string
  client_name: string
  platform: string
  status: string
  reason: string
  severity: 'critical' | 'warning' | 'info'
  spend_30d: number
  health_score: number | null
  daily_budget: number | null
  roas_30d: number | null
}

export async function getCampaignsRequiringAttention(organizationId: string): Promise<AttentionCampaign[]> {
  const summaries = await getCampaignSummaries({ organizationId })

  const attention: AttentionCampaign[] = []

  for (const c of summaries) {
    const reasons: { reason: string; severity: 'critical' | 'warning' | 'info' }[] = []

    if (c.status === 'error') {
      reasons.push({ reason: 'Campaign in error state', severity: 'critical' })
    }

    if (c.health_score != null && c.health_score < 40) {
      reasons.push({ reason: `Low health score (${Math.round(c.health_score)})`, severity: 'critical' })
    } else if (c.health_score != null && c.health_score < 60) {
      reasons.push({ reason: `Poor health score (${Math.round(c.health_score)})`, severity: 'warning' })
    }

    // Budget overpacing: spend > budget × days in month so far
    if (c.daily_budget && c.spend_30d > 0) {
      const daysMtd = new Date().getDate()
      const expectedSpend = c.daily_budget * 30
      const pacingRate = c.spend_30d / expectedSpend
      if (pacingRate > 1.25) {
        reasons.push({ reason: `Overpacing budget (${Math.round(pacingRate * 100)}%)`, severity: 'warning' })
      } else if (pacingRate < 0.6 && c.status === 'active') {
        reasons.push({ reason: `Severely underpacing budget (${Math.round(pacingRate * 100)}%)`, severity: 'warning' })
      }
    }

    if (c.roas_30d != null && c.roas_30d < 1 && c.spend_30d > 100) {
      reasons.push({ reason: `ROAS below 1x (${c.roas_30d.toFixed(2)}x)`, severity: 'warning' })
    }

    if (c.status === 'paused' && c.spend_30d > 0) {
      reasons.push({ reason: 'Paused with recent spend', severity: 'info' })
    }

    if (reasons.length > 0) {
      const top = reasons.sort((a, b) =>
        ['critical', 'warning', 'info'].indexOf(a.severity) - ['critical', 'warning', 'info'].indexOf(b.severity)
      )[0]
      attention.push({
        id: c.id,
        name: c.name,
        client_name: c.client_name,
        platform: c.platform,
        status: c.status,
        reason: top.reason,
        severity: top.severity,
        spend_30d: c.spend_30d,
        health_score: c.health_score,
        daily_budget: c.daily_budget,
        roas_30d: c.roas_30d,
      })
    }
  }

  return attention.slice(0, 10)
}
