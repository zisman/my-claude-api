import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { BudgetPacingWidget } from '@/components/shared/BudgetPacingWidget'
import { HealthScoreRing } from '@/components/shared/HealthScoreRing'
import { useCampaignSummaries } from '@/hooks/useMetrics'
import { fmtCurrency, fmtNumber, fmtPercent, fmtROAS } from '@/lib/metrics/format'
import { cn } from '@/lib/utils'
import type { PlatformType, CampaignStatus } from '@/types'
import type { CampaignSummary } from '@/lib/api/metrics'

const PLATFORMS = ['google_ads', 'meta_ads', 'linkedin_ads', 'ga4']
const STATUSES  = ['active', 'paused', 'ended', 'draft', 'error']

type SortKey = 'name' | 'spend_30d' | 'clicks_30d' | 'ctr_30d' | 'roas_30d' | 'health_score'

function getValue(c: CampaignSummary, key: SortKey): number | string {
  if (key === 'name') return c.name
  if (key === 'roas_30d') return c.roas_30d ?? -1
  if (key === 'health_score') return c.health_score ?? -1
  return c[key] ?? 0
}

export function CampaignsPage() {
  const [search, setSearch]           = useState('')
  const [platforms, setPlatforms]     = useState<string[]>([])
  const [statuses, setStatuses]       = useState<string[]>([])
  const [sortKey, setSortKey]         = useState<SortKey>('spend_30d')
  const [sortAsc, setSortAsc]         = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const { data: campaigns = [], isLoading } = useCampaignSummaries({
    search: search || undefined,
    platform: platforms.length ? platforms : undefined,
    status: statuses.length ? statuses : undefined,
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  function toggleFilter(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const sorted = [...campaigns].sort((a, b) => {
    const av = getValue(a, sortKey)
    const bv = getValue(b, sortKey)
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return sortAsc ? cmp : -cmp
  })

  function SortHeader({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col
    return (
      <th
        className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:text-slate-600"
        onClick={() => toggleSort(col)}
      >
        <span className="inline-flex items-center justify-end gap-1">
          {label}
          {active
            ? sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3 opacity-20" />}
        </span>
      </th>
    )
  }

  return (
    <div>
      <Header title="Campaigns" subtitle={`${campaigns.length} campaign${campaigns.length !== 1 ? 's' : ''} across all clients`} />

      <div className="p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search campaigns…"
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter className="w-4 h-4" /> Filters
            {(platforms.length + statuses.length) > 0 && (
              <span className="ml-1 text-xs">({platforms.length + statuses.length})</span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Platform</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => toggleFilter(platforms, setPlatforms, p)}
                    className={cn(
                      'text-xs px-3 py-1 rounded-full border transition-colors',
                      platforms.includes(p)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
                    )}
                  >
                    {p.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleFilter(statuses, setStatuses, s)}
                    className={cn(
                      'text-xs px-3 py-1 rounded-full border transition-colors capitalize',
                      statuses.includes(s)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {(platforms.length + statuses.length) > 0 && (
              <button
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => { setPlatforms([]); setStatuses([]) }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading campaigns…</div>
            ) : sorted.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                {search || platforms.length || statuses.length
                  ? 'No campaigns match your filters.'
                  : 'No campaigns yet. Connect a platform to sync campaigns.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Campaign</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <SortHeader label="Spend 30d"  col="spend_30d" />
                      <SortHeader label="Clicks 30d" col="clicks_30d" />
                      <SortHeader label="CTR"        col="ctr_30d" />
                      <SortHeader label="ROAS"       col="roas_30d" />
                      <SortHeader label="Health"     col="health_score" />
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider min-w-[140px]">Pacing (30d)</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(c => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="px-6 py-3">
                          <div className="font-medium text-slate-800 text-sm max-w-[200px] truncate">{c.name}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[200px]">{c.client_name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <PlatformBadge platform={c.platform as PlatformType} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status as CampaignStatus} showDot />
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtCurrency(c.spend_30d, c.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtNumber(c.clicks_30d)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtPercent(c.ctr_30d, 2)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-700">
                          {fmtROAS(c.roas_30d)}
                        </td>
                        <td className="px-4 py-3">
                          {c.health_score != null ? (
                            <div className="flex justify-end">
                              <HealthScoreRing score={c.health_score} size="sm" />
                            </div>
                          ) : <span className="text-slate-300 text-sm block text-right">—</span>}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          {c.daily_budget && c.spend_30d > 0 ? (
                            <BudgetPacingWidget
                              spend={c.spend_30d}
                              budget={c.daily_budget * 30}
                              currency={c.currency}
                              compact
                            />
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/campaigns/${c.id}`}
                            className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
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
