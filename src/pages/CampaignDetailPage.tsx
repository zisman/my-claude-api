import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/shared/MetricCard'
import { DeltaBadge } from '@/components/shared/DeltaBadge'
import { PerformanceTrendChart } from '@/components/shared/PerformanceTrendChart'
import { BudgetPacingWidget } from '@/components/shared/BudgetPacingWidget'
import { HealthScoreRing } from '@/components/shared/HealthScoreRing'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCampaign } from '@/hooks/useCampaigns'
import { useCampaignMetrics } from '@/hooks/useMetrics'
import { fmtCurrency, fmtNumber, fmtPercent, fmtROAS } from '@/lib/metrics/format'
import { calcDelta } from '@/lib/metrics/calculate'
import type { PlatformType, CampaignStatus } from '@/types'

export function CampaignDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const [days, setDays] = useState(30)

  const { data: campaign, isLoading } = useCampaign(id)
  const { data: metrics, isLoading: metricsLoading } = useCampaignMetrics(id, days)

  if (isLoading) return <div className="p-8 text-sm text-slate-400">Loading campaign…</div>
  if (!campaign) return (
    <div className="p-8">
      <p className="text-sm text-slate-500">Campaign not found.</p>
      <Link to="/campaigns" className="text-sm text-blue-600 mt-2 inline-block">← Back to campaigns</Link>
    </div>
  )

  const cur  = metrics?.current
  const prev = metrics?.previous

  const spendDelta = cur && prev ? calcDelta(cur.spend, prev.spend, 'spend') : null
  const clickDelta = cur && prev ? calcDelta(cur.clicks, prev.clicks, 'clicks') : null
  const convDelta  = cur && prev ? calcDelta(cur.conversions, prev.conversions, 'conversions') : null
  const roasDelta  = cur?.roas != null && prev?.roas != null ? calcDelta(cur.roas, prev.roas, 'roas') : null
  const ctrDelta   = cur && prev ? calcDelta(cur.ctr, prev.ctr, 'ctr') : null
  const cpcDelta   = cur && prev ? calcDelta(cur.cpc, prev.cpc, 'cpc') : null

  const trendData = (metrics?.byDay ?? []).map(d => ({
    date: d.date,
    spend: d.spend,
    clicks: d.clicks,
    impressions: d.impressions,
    conversions: d.conversions,
  }))

  const currency = campaign.currency as string ?? 'USD'

  return (
    <div>
      <Header
        title={campaign.name}
        subtitle={campaign.objective ?? undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/campaigns"><ArrowLeft className="w-4 h-4" /> All Campaigns</Link>
          </Button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Campaign metadata */}
        <div className="flex items-center gap-3 flex-wrap">
          <PlatformBadge platform={campaign.platform as PlatformType} />
          <StatusBadge status={campaign.status as CampaignStatus} showDot />
          {campaign.daily_budget && (
            <span className="text-sm text-slate-500">
              Daily budget: <span className="font-medium text-slate-800">{fmtCurrency(campaign.daily_budget, currency)}</span>
            </span>
          )}
          {campaign.start_date && (
            <span className="text-sm text-slate-500">
              Started: <span className="font-medium text-slate-800">{campaign.start_date}</span>
            </span>
          )}
          {campaign.health_score != null && (
            <div className="flex items-center gap-2">
              <HealthScoreRing score={campaign.health_score.score} size="sm" />
              <span className="text-xs text-slate-500">health score</span>
            </div>
          )}
        </div>

        {/* Budget pacing */}
        {campaign.daily_budget && cur && cur.spend > 0 && (
          <BudgetPacingWidget
            spend={cur.spend}
            budget={campaign.daily_budget * days}
            currency={currency}
          />
        )}

        {/* KPI cards row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={`Spend (${days}d)`}
            value={metricsLoading ? '—' : fmtCurrency(cur?.spend ?? 0, currency)}
            change={spendDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title={`Clicks (${days}d)`}
            value={metricsLoading ? '—' : fmtNumber(cur?.clicks ?? 0)}
            change={clickDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title={`Impressions (${days}d)`}
            value={metricsLoading ? '—' : fmtNumber(cur?.impressions ?? 0)}
            loading={metricsLoading}
          />
          <MetricCard
            title={`Conversions (${days}d)`}
            value={metricsLoading ? '—' : fmtNumber(cur?.conversions ?? 0)}
            change={convDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
        </div>

        {/* KPI cards row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="CTR"
            value={metricsLoading ? '—' : fmtPercent(cur?.ctr ?? 0, 2)}
            change={ctrDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title="CPC"
            value={metricsLoading ? '—' : fmtCurrency(cur?.cpc ?? 0, currency)}
            change={cpcDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title="CPM"
            value={metricsLoading ? '—' : fmtCurrency(cur?.cpm ?? 0, currency)}
            loading={metricsLoading}
          />
          <MetricCard
            title="ROAS"
            value={metricsLoading ? '—' : fmtROAS(cur?.roas ?? null)}
            change={roasDelta?.relative ?? undefined}
            loading={metricsLoading}
          />
        </div>

        {/* Period comparison strip */}
        {cur && prev && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Period-over-Period</CardTitle>
                <p className="text-xs text-slate-400">Current {days}d vs. prior {days}d</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-6 text-center">
                {[
                  { label: 'Spend',       val: fmtCurrency(cur.spend, currency),   delta: spendDelta },
                  { label: 'Clicks',      val: fmtNumber(cur.clicks),              delta: clickDelta },
                  { label: 'CTR',         val: fmtPercent(cur.ctr, 2),             delta: ctrDelta },
                  { label: 'CPC',         val: fmtCurrency(cur.cpc, currency),     delta: cpcDelta },
                  { label: 'Conversions', val: fmtNumber(cur.conversions),         delta: convDelta },
                  { label: 'ROAS',        val: fmtROAS(cur.roas),                  delta: roasDelta },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-base font-bold text-slate-900 tabular-nums">{stat.val}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
                    {stat.delta && <DeltaBadge delta={stat.delta} className="mt-1" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance trend */}
        <PerformanceTrendChart
          data={trendData}
          loading={metricsLoading}
          title="Daily Performance"
          days={days}
          onDaysChange={setDays}
        />

        {/* Clicks vs Conversions bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Clicks vs. Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-slate-400">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData.map(d => ({ ...d, date: d.date.slice(5) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="clicks"      fill="#3b82f6" radius={[2,2,0,0]} name="Clicks" />
                  <Bar dataKey="conversions" fill="#10b981" radius={[2,2,0,0]} name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
