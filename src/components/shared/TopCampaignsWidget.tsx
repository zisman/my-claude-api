import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { fmtCurrency, fmtNumber, fmtROAS } from '@/lib/metrics/format'
import { cn } from '@/lib/utils'
import type { CampaignSummary } from '@/lib/api/metrics'
import type { PlatformType, CampaignStatus } from '@/types'

interface TopCampaignsWidgetProps {
  campaigns: CampaignSummary[]
  loading?: boolean
  topN?: number
  metric?: 'spend' | 'conversions' | 'roas'
}

export function TopCampaignsWidget({ campaigns, loading, topN = 5, metric = 'spend' }: TopCampaignsWidgetProps) {
  const sorted = [...campaigns]
    .sort((a, b) => {
      if (metric === 'roas') return (b.roas_30d ?? 0) - (a.roas_30d ?? 0)
      if (metric === 'conversions') return b.conversions_30d - a.conversions_30d
      return b.spend_30d - a.spend_30d
    })
    .slice(0, topN)

  const maxValue = sorted[0]
    ? (metric === 'roas' ? sorted[0].roas_30d ?? 0 : metric === 'conversions' ? sorted[0].conversions_30d : sorted[0].spend_30d)
    : 1

  function fmtValue(c: CampaignSummary) {
    if (metric === 'roas') return fmtROAS(c.roas_30d)
    if (metric === 'conversions') return fmtNumber(c.conversions_30d)
    return fmtCurrency(c.spend_30d)
  }

  function getValue(c: CampaignSummary) {
    if (metric === 'roas') return c.roas_30d ?? 0
    if (metric === 'conversions') return c.conversions_30d
    return c.spend_30d
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Top Campaigns (30d)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-50 rounded animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No campaign data yet.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((c, i) => {
              const pct = maxValue > 0 ? (getValue(c) / maxValue) * 100 : 0
              return (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="block rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-slate-800 truncate">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <PlatformBadge platform={c.platform as PlatformType} size="xs" />
                      <span className="text-sm font-semibold text-slate-900 tabular-nums">{fmtValue(c)}</span>
                    </div>
                  </div>
                  <div className="ml-6">
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          c.status === 'active' ? 'bg-blue-400' : 'bg-slate-300',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
