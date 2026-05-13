import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, MousePointerClick, Eye, TrendingUp, Bell, CheckSquare, Users, Megaphone } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Header } from '@/components/layout/Header'
import { MetricCard } from '@/components/shared/MetricCard'
import { PerformanceTrendChart } from '@/components/shared/PerformanceTrendChart'
import { TopCampaignsWidget } from '@/components/shared/TopCampaignsWidget'
import { CampaignsAttentionWidget } from '@/components/shared/CampaignsAttentionWidget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useDashboardSummary,
  useOrgDailyTotals,
  usePlatformSpend,
  useCampaignSummaries,
  useAttentionCampaigns,
} from '@/hooks/useMetrics'
import { fmtCurrency, fmtNumber, fmtPercent, fmtROAS, platformLabel } from '@/lib/metrics/format'
import { calcDelta } from '@/lib/metrics/calculate'

const PLATFORM_COLORS: Record<string, string> = {
  google_ads:   '#4285F4',
  meta_ads:     '#1877F2',
  linkedin_ads: '#0A66C2',
  ga4:          '#E37400',
}

export function DashboardPage() {
  const [trendDays, setTrendDays] = useState(30)

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: trend = [], isLoading: trendLoading } = useOrgDailyTotals(trendDays)
  const { data: platformSpend = [] } = usePlatformSpend(30)
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaignSummaries()
  const { data: attentionCampaigns = [], isLoading: attentionLoading } = useAttentionCampaigns()

  const mtd  = summary?.mtd
  const prev = summary?.prevMtd

  const spendDelta = mtd && prev ? calcDelta(mtd.spend, prev.spend, 'spend') : null
  const convDelta  = mtd && prev ? calcDelta(mtd.conversions, prev.conversions, 'conversions') : null
  const clickDelta = mtd && prev ? calcDelta(mtd.clicks, prev.clicks, 'clicks') : null

  return (
    <div>
      <Header title="Dashboard" subtitle="Overview of all active campaigns and performance" />

      <div className="p-8 space-y-8">
        {/* KPI Cards — row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Clients"
            value={summaryLoading ? '—' : String(summary?.totalClients ?? 0)}
            icon={<Users className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <MetricCard
            title="Active Campaigns"
            value={summaryLoading ? '—' : String(summary?.activeCampaigns ?? 0)}
            icon={<Megaphone className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <MetricCard
            title="Spend MTD"
            value={summaryLoading ? '—' : fmtCurrency(mtd?.spend ?? 0)}
            change={spendDelta?.relative ?? undefined}
            icon={<DollarSign className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <MetricCard
            title="Conversions MTD"
            value={summaryLoading ? '—' : fmtNumber(mtd?.conversions ?? 0)}
            change={convDelta?.relative ?? undefined}
            icon={<TrendingUp className="w-5 h-5" />}
            loading={summaryLoading}
          />
        </div>

        {/* KPI Cards — row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Impressions MTD"
            value={summaryLoading ? '—' : fmtNumber(mtd?.impressions ?? 0)}
            icon={<Eye className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <MetricCard
            title="Clicks MTD"
            value={summaryLoading ? '—' : fmtNumber(mtd?.clicks ?? 0)}
            change={clickDelta?.relative ?? undefined}
            icon={<MousePointerClick className="w-5 h-5" />}
            loading={summaryLoading}
          />
          <MetricCard
            title="Open Alerts"
            value={summaryLoading ? '—' : String(summary?.openAlerts ?? 0)}
            icon={<Bell className="w-5 h-5" />}
            description={summary?.openAlerts ? `${summary.openAlerts} need attention` : undefined}
            loading={summaryLoading}
          />
          <MetricCard
            title="Pending Tasks"
            value={summaryLoading ? '—' : String(summary?.pendingTasks ?? 0)}
            icon={<CheckSquare className="w-5 h-5" />}
            loading={summaryLoading}
          />
        </div>

        {/* Performance trend + platform spend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceTrendChart
              data={trend}
              loading={trendLoading}
              days={trendDays}
              onDaysChange={setTrendDays}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend by Platform (30d)</CardTitle>
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
                        {platformSpend.map(entry => (
                          <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => fmtCurrency(v)}
                        contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {platformSpend.map(item => (
                      <div key={item.platform} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[item.platform] ?? '#94a3b8' }} />
                          <span className="text-slate-600">{platformLabel(item.platform)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-900 tabular-nums">{fmtCurrency(item.spend)}</span>
                          <span className="text-slate-400 ml-1.5 text-xs">{fmtPercent(item.percentage, 1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MTD summary bar */}
        {mtd && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Month-to-Date Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-6 text-center">
                {[
                  { label: 'Avg. CTR',     value: fmtPercent(mtd.ctr, 2) },
                  { label: 'Avg. CPC',     value: fmtCurrency(mtd.cpc) },
                  { label: 'Total Spend',  value: fmtCurrency(mtd.spend) },
                  { label: 'Clicks',       value: fmtNumber(mtd.clicks) },
                  { label: 'Impressions',  value: fmtNumber(mtd.impressions) },
                  { label: 'ROAS',         value: fmtROAS(mtd.roas) },
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

        {/* Widgets row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TopCampaignsWidget campaigns={campaigns} loading={campaignsLoading} topN={8} />
          </div>
          <CampaignsAttentionWidget campaigns={attentionCampaigns} loading={attentionLoading} />
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">Quick links:</span>
          <Link to="/campaigns" className="text-xs text-blue-600 hover:underline">All Campaigns</Link>
          <Link to="/clients" className="text-xs text-blue-600 hover:underline">All Clients</Link>
          <Link to="/channels" className="text-xs text-blue-600 hover:underline">Channel Comparison</Link>
          <Link to="/alerts" className="text-xs text-blue-600 hover:underline">Alerts</Link>
        </div>
      </div>
    </div>
  )
}
