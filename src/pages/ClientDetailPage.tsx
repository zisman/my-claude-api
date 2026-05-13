import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Building2, Globe, DollarSign } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/shared/MetricCard'
import { DeltaBadge } from '@/components/shared/DeltaBadge'
import { PerformanceTrendChart } from '@/components/shared/PerformanceTrendChart'
import { ChannelBreakdown } from '@/components/shared/ChannelBreakdown'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useClient } from '@/hooks/useClients'
import { useCampaignSummaries, useClientMetrics } from '@/hooks/useMetrics'
import { fmtCurrency, fmtNumber, fmtPercent, fmtROAS } from '@/lib/metrics/format'
import { calcDelta } from '@/lib/metrics/calculate'
import type { PlatformType, CampaignStatus } from '@/types'

export function ClientDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [days, setDays] = useState(30)

  const { data: client, isLoading } = useClient(id)
  const { data: campaignSummaries = [] } = useCampaignSummaries({ clientId: id })
  const { data: metrics, isLoading: metricsLoading } = useClientMetrics(id, days)

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-400">Loading client…</div>
  }

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">Client not found.</p>
        <Link to="/clients" className="text-sm text-blue-600 mt-2 inline-block">← Back to clients</Link>
      </div>
    )
  }

  const cur  = metrics?.current
  const prev = metrics?.previous

  const spendDelta = cur && prev ? calcDelta(cur.spend, prev.spend, 'spend') : null
  const convDelta  = cur && prev ? calcDelta(cur.conversions, prev.conversions, 'conversions') : null
  const ctrDelta   = cur && prev ? calcDelta(cur.ctr, prev.ctr, 'ctr') : null
  const roasDelta  = cur && prev && cur.roas != null && prev.roas != null
    ? calcDelta(cur.roas, prev.roas, 'roas')
    : null

  const trendData = (metrics?.byDay ?? []).map(d => ({
    date: d.date,
    spend: d.spend,
    clicks: d.clicks,
    impressions: d.impressions,
    conversions: d.conversions,
  }))

  return (
    <div>
      <Header
        title={client.name}
        subtitle={client.industry ?? undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/clients"><ArrowLeft className="w-4 h-4" /> All Clients</Link>
          </Button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Client info */}
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            {client.logo_url
              ? <img src={client.logo_url} alt={client.name} className="w-full h-full rounded-xl object-cover" />
              : <Building2 className="w-7 h-7 text-slate-400" />
            }
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{client.name}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600">
                  <Globe className="w-3.5 h-3.5" /> {client.website}
                </a>
              )}
              {client.monthly_budget && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {fmtCurrency(client.monthly_budget, client.currency)} / month
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{campaignSummaries.length} campaigns</p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={`Spend (${days}d)`}
            value={metricsLoading ? '—' : fmtCurrency(cur?.spend ?? 0, client.currency)}
            icon={<DollarSign className="w-5 h-5" />}
            change={spendDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title={`Conversions (${days}d)`}
            value={metricsLoading ? '—' : fmtNumber(cur?.conversions ?? 0)}
            change={convDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title="Avg. CTR"
            value={metricsLoading ? '—' : fmtPercent(cur?.ctr ?? 0, 2)}
            change={ctrDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title="ROAS"
            value={metricsLoading ? '—' : fmtROAS(cur?.roas ?? null)}
            change={roasDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
        </div>

        {/* Period summary */}
        {cur && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Performance Summary</CardTitle>
                <p className="text-xs text-slate-400">vs. prior {days}-day period</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-6 text-center">
                {[
                  { label: 'Spend',       val: fmtCurrency(cur.spend, client.currency), delta: spendDelta },
                  { label: 'Impressions', val: fmtNumber(cur.impressions),              delta: cur && prev ? calcDelta(cur.impressions, prev.impressions, 'impressions') : null },
                  { label: 'Clicks',      val: fmtNumber(cur.clicks),                  delta: cur && prev ? calcDelta(cur.clicks, prev.clicks, 'clicks') : null },
                  { label: 'CTR',         val: fmtPercent(cur.ctr, 2),                 delta: ctrDelta },
                  { label: 'CPC',         val: fmtCurrency(cur.cpc, client.currency),  delta: cur && prev ? calcDelta(cur.cpc, prev.cpc, 'cpc') : null },
                  { label: 'ROAS',        val: fmtROAS(cur.roas),                      delta: roasDelta },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">{stat.val}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
                    {stat.delta && <DeltaBadge delta={stat.delta} className="mt-1" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trend chart */}
        <PerformanceTrendChart
          data={trendData}
          loading={metricsLoading}
          title="Daily Performance"
          days={days}
          onDaysChange={setDays}
        />

        {/* Channel breakdown */}
        {metrics?.byPlatform && metrics.byPlatform.length > 0 && (
          <ChannelBreakdown
            platforms={metrics.byPlatform as Parameters<typeof ChannelBreakdown>[0]['platforms']}
            currency={client.currency}
          />
        )}

        {/* Campaigns table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaigns ({campaignSummaries.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {campaignSummaries.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No campaigns synced yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Campaign</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Spend 30d</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">CTR</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">ROAS</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {campaignSummaries.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="px-6 py-3 text-sm font-medium text-slate-800 max-w-[220px] truncate">{c.name}</td>
                        <td className="px-4 py-3"><PlatformBadge platform={c.platform as PlatformType} /></td>
                        <td className="px-4 py-3"><StatusBadge status={c.status as CampaignStatus} showDot /></td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtCurrency(c.spend_30d, c.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtPercent(c.ctr_30d, 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtROAS(c.roas_30d)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link to={`/campaigns/${c.id}`} className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
