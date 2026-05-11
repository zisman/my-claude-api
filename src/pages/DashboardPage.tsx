import { DollarSign, MousePointerClick, Eye, TrendingUp, Bell, CheckSquare, Users, Megaphone } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/shared/MetricCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDashboardMetrics, usePerformanceTrend, useSpendByPlatform } from '@/hooks/useDashboard'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/metrics/normalize'

const PLATFORM_COLORS: Record<string, string> = {
  google_ads: '#4285F4',
  meta_ads: '#1877F2',
  linkedin_ads: '#0A66C2',
  ga4: '#E37400',
}

const PLATFORM_LABELS: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  linkedin_ads: 'LinkedIn',
  ga4: 'GA4',
}

export function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics()
  const { data: trend = [] } = usePerformanceTrend(30)
  const { data: platformSpend = [] } = useSpendByPlatform()

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of all active campaigns and performance" />

      <div className="p-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Clients"
            value={metricsLoading ? '—' : String(metrics?.total_clients ?? 0)}
            icon={<Users className="w-5 h-5" />}
            loading={metricsLoading}
          />
          <MetricCard
            title="Active Campaigns"
            value={metricsLoading ? '—' : String(metrics?.active_campaigns ?? 0)}
            icon={<Megaphone className="w-5 h-5" />}
            loading={metricsLoading}
          />
          <MetricCard
            title="Spend MTD"
            value={metricsLoading ? '—' : formatCurrency(metrics?.total_spend_mtd ?? 0)}
            change={metrics?.spend_change_pct}
            icon={<DollarSign className="w-5 h-5" />}
            loading={metricsLoading}
          />
          <MetricCard
            title="Conversions MTD"
            value={metricsLoading ? '—' : formatNumber(metrics?.total_conversions_mtd ?? 0)}
            change={metrics?.conversions_change_pct}
            icon={<TrendingUp className="w-5 h-5" />}
            loading={metricsLoading}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Impressions MTD"
            value={metricsLoading ? '—' : formatNumber(metrics?.total_impressions_mtd ?? 0)}
            icon={<Eye className="w-5 h-5" />}
            loading={metricsLoading}
          />
          <MetricCard
            title="Clicks MTD"
            value={metricsLoading ? '—' : formatNumber(metrics?.total_clicks_mtd ?? 0)}
            change={metrics?.clicks_change_pct}
            icon={<MousePointerClick className="w-5 h-5" />}
            loading={metricsLoading}
          />
          <MetricCard
            title="Open Alerts"
            value={metricsLoading ? '—' : String(metrics?.open_alerts ?? 0)}
            icon={<Bell className="w-5 h-5" />}
            description={metrics?.open_alerts ? `${metrics.open_alerts} need attention` : undefined}
            loading={metricsLoading}
          />
          <MetricCard
            title="Pending Tasks"
            value={metricsLoading ? '—' : String(metrics?.pending_tasks ?? 0)}
            icon={<CheckSquare className="w-5 h-5" />}
            loading={metricsLoading}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Performance Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {trend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                  No performance data yet. Connect a platform to start syncing.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${formatNumber(v)}`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'spend' ? formatCurrency(value) : formatNumber(value),
                        name === 'spend' ? 'Spend' : name.charAt(0).toUpperCase() + name.slice(1)
                      ]}
                      labelStyle={{ fontSize: 12, color: '#475569' }}
                      contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
                    <Area type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} fill="url(#clicksGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Spend by platform */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              {platformSpend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                  No spend data yet.
                </div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={platformSpend} dataKey="spend" nameKey="platform" cx="50%" cy="50%" outerRadius={60} strokeWidth={2}>
                        {platformSpend.map((entry) => (
                          <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {platformSpend.map(item => (
                      <div key={item.platform} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[item.platform] ?? '#94a3b8' }} />
                          <span className="text-slate-600">{PLATFORM_LABELS[item.platform] ?? item.platform}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-900">{formatCurrency(item.spend)}</span>
                          <span className="text-slate-400 ml-1.5">{formatPercent(item.percentage, 1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance summary */}
        {metrics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Month-to-Date Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-6 text-center">
                {[
                  { label: 'Avg. CTR', value: formatPercent(metrics.avg_ctr) },
                  { label: 'Avg. CPC', value: formatCurrency(metrics.avg_cpc) },
                  { label: 'Total Spend', value: formatCurrency(metrics.total_spend_mtd) },
                  { label: 'Clicks', value: formatNumber(metrics.total_clicks_mtd) },
                  { label: 'Impressions', value: formatNumber(metrics.total_impressions_mtd) },
                  { label: 'Conversions', value: formatNumber(metrics.total_conversions_mtd) },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">{stat.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
