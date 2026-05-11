import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { fmtCurrency, fmtNumber, fmtPercent, fmtROAS } from '@/lib/metrics/format'
import type { AggregatedMetric } from '@/lib/metrics/types'
import type { PlatformType } from '@/types'

interface ChannelBreakdownProps {
  platforms: (AggregatedMetric & { platform: PlatformType })[]
  loading?: boolean
  currency?: string
}

interface Column {
  key: keyof AggregatedMetric
  label: string
  fmt: (v: number | null, currency: string) => string
}

const COLUMNS: Column[] = [
  { key: 'spend',       label: 'Spend',       fmt: (v, c) => v != null ? fmtCurrency(v, c) : '—' },
  { key: 'impressions', label: 'Impressions',  fmt: v => v != null ? fmtNumber(v) : '—' },
  { key: 'clicks',      label: 'Clicks',       fmt: v => v != null ? fmtNumber(v) : '—' },
  { key: 'ctr',         label: 'CTR',          fmt: v => v != null ? fmtPercent(v, 2) : '—' },
  { key: 'cpc',         label: 'CPC',          fmt: (v, c) => v != null ? fmtCurrency(v, c) : '—' },
  { key: 'conversions', label: 'Conversions',  fmt: v => v != null ? fmtNumber(v) : '—' },
  { key: 'roas',        label: 'ROAS',         fmt: v => fmtROAS(v) },
]

export function ChannelBreakdown({ platforms, loading, currency = 'USD' }: ChannelBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Channel Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />)}
          </div>
        ) : platforms.length === 0 ? (
          <div className="p-6 text-sm text-center text-slate-400">No channel data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</th>
                  {COLUMNS.map(col => (
                    <th key={col.key} className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platforms.map(row => (
                  <tr key={row.platform} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <PlatformBadge platform={row.platform as PlatformType} />
                    </td>
                    {COLUMNS.map(col => (
                      <td key={col.key} className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                        {col.fmt(row[col.key] as number | null, currency)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
