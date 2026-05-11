import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChannelBreakdown } from '@/components/shared/ChannelBreakdown'
import { PerformanceTrendChart } from '@/components/shared/PerformanceTrendChart'
import { useOrgDailyTotals, usePlatformSpend, useCampaignSummaries } from '@/hooks/useMetrics'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { getClientMetrics } from '@/lib/api/metrics'
import { aggregateByPlatform } from '@/lib/metrics/aggregate'
import { fmtCurrency, fmtNumber, fmtPercent, platformLabel } from '@/lib/metrics/format'
import type { AggregatedMetric } from '@/lib/metrics/types'
import type { PlatformType } from '@/types'

const PLATFORM_COLORS: Record<string, string> = {
  google_ads:   '#4285F4',
  meta_ads:     '#1877F2',
  linkedin_ads: '#0A66C2',
  ga4:          '#E37400',
}

export function ChannelComparisonPage() {
  const [days, setDays] = useState(30)
  const { user } = useAuth()

  const { data: trend = [], isLoading: trendLoading } = useOrgDailyTotals(days)
  const { data: platformSpend = [] } = usePlatformSpend(days)
  const { data: campaigns = [] } = useCampaignSummaries()

  // Build per-platform aggregated metrics from campaign summaries
  const platformMap = new Map<string, { spend: number; clicks: number; impressions: number; conversions: number; ctr: number; cpc: number; roas_sum: number; roas_count: number }>()
  for (const c of campaigns) {
    const existing = platformMap.get(c.platform) ?? { spend: 0, clicks: 0, impressions: 0, conversions: 0, ctr: 0, cpc: 0, roas_sum: 0, roas_count: 0 }
    existing.spend       += c.spend_30d
    existing.clicks      += c.clicks_30d
    existing.impressions += c.impressions_30d ?? 0
    existing.conversions += c.conversions_30d
    if (c.roas_30d != null) { existing.roas_sum += c.roas_30d; existing.roas_count++ }
    platformMap.set(c.platform, existing)
  }

  const platformRows = Array.from(platformMap.entries())
    .map(([platform, data]) => ({
      platform: platform as PlatformType,
      label: platformLabel(platform),
      spend: data.spend,
      clicks: data.clicks,
      impressions: data.impressions,
      conversions: data.conversions,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      cpc: data.clicks > 0 ? data.spend / data.clicks : 0,
      roas: data.roas_count > 0 ? data.roas_sum / data.roas_count : null,
    }))
    .sort((a, b) => b.spend - a.spend)

  const totalSpend = platformRows.reduce((s, p) => s + p.spend, 0)

  return (
    <div>
      <Header title="Channel Comparison" subtitle="Performance breakdown by advertising platform" />

      <div className="p-8 space-y-8">
        {/* Spend distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spend Distribution (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              {platformSpend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">No data yet.</div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={platformSpend}
                        dataKey="spend"
                        nameKey="platform"
                        cx="50%" cy="50%"
                        outerRadius={60}
                        strokeWidth={2}
                      >
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

          {/* Platform KPI summary */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Platform Performance (30d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformRows.length === 0 ? (
                    <p className="text-sm text-center text-slate-400 py-8">No platform data available.</p>
                  ) : platformRows.map(row => {
                    const pct = totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0
                    return (
                      <div key={row.platform}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[row.platform] ?? '#94a3b8' }} />
                            <span className="text-sm font-medium text-slate-700">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 tabular-nums">
                            <span><span className="font-medium text-slate-700">{fmtCurrency(row.spend)}</span> spend</span>
                            <span><span className="font-medium text-slate-700">{fmtNumber(row.clicks)}</span> clicks</span>
                            <span><span className="font-medium text-slate-700">{fmtPercent(row.ctr, 2)}</span> CTR</span>
                            {row.roas != null && (
                              <span><span className="font-medium text-slate-700">{row.roas.toFixed(2)}x</span> ROAS</span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: PLATFORM_COLORS[row.platform] ?? '#94a3b8',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trend chart */}
        <PerformanceTrendChart
          data={trend}
          loading={trendLoading}
          title="Overall Trend"
          days={days}
          onDaysChange={setDays}
        />

        {/* Detailed breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Metrics by Channel (30d)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {platformRows.length === 0 ? (
              <div className="p-6 text-sm text-center text-slate-400">No channel data available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Spend</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Impr.</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Clicks</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">CTR</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">CPC</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Conversions</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">ROAS</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformRows.map(row => (
                      <tr key={row.platform} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLATFORM_COLORS[row.platform] ?? '#94a3b8' }} />
                            <span className="text-sm font-medium text-slate-700">{row.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmtCurrency(row.spend)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmtNumber(row.impressions)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmtNumber(row.clicks)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmtPercent(row.ctr, 2)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmtCurrency(row.cpc)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">{fmtNumber(row.conversions)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {row.roas != null ? `${row.roas.toFixed(2)}x` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-500">
                          {fmtPercent(totalSpend > 0 ? (row.spend / totalSpend) * 100 : 0, 1)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-50 font-medium">
                      <td className="px-6 py-3 text-sm text-slate-700">Total</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">{fmtCurrency(totalSpend)}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">
                        {fmtNumber(platformRows.reduce((s, r) => s + r.impressions, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">
                        {fmtNumber(platformRows.reduce((s, r) => s + r.clicks, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">
                        {(() => {
                          const totalImpr = platformRows.reduce((s, r) => s + r.impressions, 0)
                          const totalClicks = platformRows.reduce((s, r) => s + r.clicks, 0)
                          return fmtPercent(totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0, 2)
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">
                        {(() => {
                          const totalClicks = platformRows.reduce((s, r) => s + r.clicks, 0)
                          return fmtCurrency(totalClicks > 0 ? totalSpend / totalClicks : 0)
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">
                        {fmtNumber(platformRows.reduce((s, r) => s + r.conversions, 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-500">—</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-900">100%</td>
                    </tr>
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
