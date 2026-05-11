import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/shared/MetricCard'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useCampaign, useCampaignMetrics } from '@/hooks/useCampaigns'
import { formatCurrency, formatNumber, formatPercent, formatROAS } from '@/lib/metrics/normalize'
import type { PlatformType, CampaignStatus } from '@/types'

export function CampaignDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: campaign, isLoading } = useCampaign(id)
  const { data: metrics = [] } = useCampaignMetrics(id, 30)

  if (isLoading) return <div className="p-8 text-sm text-slate-400">Loading campaign…</div>
  if (!campaign) return (
    <div className="p-8">
      <p className="text-sm text-slate-500">Campaign not found.</p>
      <Link to="/campaigns" className="text-sm text-blue-600 mt-2 inline-block">← Back to campaigns</Link>
    </div>
  )

  const totalSpend = metrics.reduce((s, m) => s + Number(m.spend), 0)
  const totalClicks = metrics.reduce((s, m) => s + Number(m.clicks), 0)
  const totalImpressions = metrics.reduce((s, m) => s + Number(m.impressions), 0)
  const totalConversions = metrics.reduce((s, m) => s + Number(m.conversions), 0)
  const avgROAS = metrics.length > 0
    ? metrics.reduce((s, m) => s + (m.roas ?? 0), 0) / metrics.filter(m => m.roas != null).length
    : null

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
        {/* Campaign info */}
        <div className="flex items-center gap-4 flex-wrap">
          <PlatformBadge platform={campaign.platform as PlatformType} />
          <StatusBadge status={campaign.status as CampaignStatus} showDot />
          {campaign.daily_budget && (
            <span className="text-sm text-slate-500">
              Daily budget: <span className="font-medium text-slate-800">{formatCurrency(campaign.daily_budget, campaign.currency)}</span>
            </span>
          )}
          {campaign.start_date && (
            <span className="text-sm text-slate-500">
              Started: <span className="font-medium text-slate-800">{campaign.start_date}</span>
            </span>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Spend (30d)" value={formatCurrency(totalSpend)} />
          <MetricCard title="Clicks (30d)" value={formatNumber(totalClicks)} />
          <MetricCard title="Impressions (30d)" value={formatNumber(totalImpressions)} />
          <MetricCard title="Conversions (30d)" value={formatNumber(totalConversions)} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Avg. CTR"
            value={totalImpressions > 0 ? formatPercent((totalClicks / totalImpressions) * 100) : '—'}
          />
          <MetricCard
            title="Avg. CPC"
            value={totalClicks > 0 ? formatCurrency(totalSpend / totalClicks) : '—'}
          />
          <MetricCard
            title="Avg. CPM"
            value={totalImpressions > 0 ? formatCurrency((totalSpend / totalImpressions) * 1000) : '—'}
          />
          <MetricCard title="ROAS" value={formatROAS(avgROAS)} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Spend</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-slate-400">No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${formatNumber(v)}`} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), 'Spend']}
                      contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="spend" stroke="#3b82f6" fill="url(#sg)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Clicks vs. Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-sm text-slate-400">No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="clicks" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Clicks" />
                    <Bar dataKey="conversions" fill="#10b981" radius={[2, 2, 0, 0]} name="Conversions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
