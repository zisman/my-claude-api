import { supabase } from '@/lib/supabase/client'
import type { DashboardMetrics, PerformanceTrend, SpendByPlatform } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
  const [clientsRes, campaignsRes, alertsRes, tasksRes] = await Promise.all([
    db.from('clients').select('id', { count: 'exact' }).eq('organization_id', organizationId).eq('is_active', true),
    db.from('campaigns').select('id, status', { count: 'exact' }).eq('organization_id', organizationId).eq('status', 'active'),
    db.from('alerts').select('id', { count: 'exact' }).eq('organization_id', organizationId).eq('status', 'open'),
    db.from('tasks').select('id', { count: 'exact' }).eq('organization_id', organizationId).in('status', ['todo', 'in_progress']),
  ])

  const monthStart = new Date()
  monthStart.setDate(1)
  const clientIds = ((clientsRes.data ?? []) as { id: string }[]).map(c => c.id)

  const { data: spendData } = await db
    .from('daily_performance')
    .select('spend, clicks, impressions, conversions')
    .gte('date', monthStart.toISOString().split('T')[0])
    .in('client_id', clientIds)

  const totals = ((spendData ?? []) as { spend: number; clicks: number; impressions: number; conversions: number }[]).reduce(
    (acc, row) => ({
      spend: acc.spend + Number(row.spend),
      clicks: acc.clicks + Number(row.clicks),
      impressions: acc.impressions + Number(row.impressions),
      conversions: acc.conversions + Number(row.conversions),
    }),
    { spend: 0, clicks: 0, impressions: 0, conversions: 0 }
  )

  return {
    total_clients: clientsRes.count ?? 0,
    active_campaigns: campaignsRes.count ?? 0,
    total_spend_mtd: totals.spend,
    total_impressions_mtd: totals.impressions,
    total_clicks_mtd: totals.clicks,
    avg_ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avg_cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    total_conversions_mtd: totals.conversions,
    open_alerts: alertsRes.count ?? 0,
    pending_tasks: tasksRes.count ?? 0,
    spend_change_pct: 0,
    clicks_change_pct: 0,
    conversions_change_pct: 0,
  }
}

export async function getPerformanceTrend(organizationId: string, days = 30): Promise<PerformanceTrend[]> {
  const from = new Date()
  from.setDate(from.getDate() - days)

  const { data: clients } = await db.from('clients').select('id').eq('organization_id', organizationId)
  if (!clients?.length) return []

  const { data, error } = await db
    .from('daily_performance')
    .select('date, spend, clicks, impressions, conversions')
    .in('client_id', (clients as { id: string }[]).map(c => c.id))
    .gte('date', from.toISOString().split('T')[0])
    .order('date')

  if (error) throw error

  const byDate = new Map<string, PerformanceTrend>()
  for (const row of (data ?? []) as { date: string; spend: number; clicks: number; impressions: number; conversions: number }[]) {
    const existing = byDate.get(row.date) ?? { date: row.date, spend: 0, clicks: 0, impressions: 0, conversions: 0 }
    existing.spend += Number(row.spend)
    existing.clicks += Number(row.clicks)
    existing.impressions += Number(row.impressions)
    existing.conversions += Number(row.conversions)
    byDate.set(row.date, existing)
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getSpendByPlatform(organizationId: string): Promise<SpendByPlatform[]> {
  const { data: clients } = await db.from('clients').select('id').eq('organization_id', organizationId)
  if (!clients?.length) return []

  const { data, error } = await db
    .from('campaigns')
    .select(`platform, campaign_metrics(spend, date)`)
    .in('client_id', (clients as { id: string }[]).map(c => c.id))

  if (error) throw error

  const platformSpend = new Map<string, number>()
  let total = 0

  for (const campaign of (data ?? []) as { platform: string; campaign_metrics: { spend: number }[] }[]) {
    const spend = (campaign.campaign_metrics ?? []).reduce((sum, m) => sum + Number(m.spend), 0)
    platformSpend.set(campaign.platform, (platformSpend.get(campaign.platform) ?? 0) + spend)
    total += spend
  }

  return Array.from(platformSpend.entries()).map(([platform, spend]) => ({
    platform: platform as SpendByPlatform['platform'],
    spend,
    percentage: total > 0 ? (spend / total) * 100 : 0,
  }))
}
