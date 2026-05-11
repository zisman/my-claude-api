import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useCampaigns } from '@/hooks/useCampaigns'
import { formatCurrency } from '@/lib/metrics/normalize'
import type { PlatformType, CampaignStatus } from '@/types'

export function CampaignsPage() {
  const [search, setSearch] = useState('')
  const { data: campaigns = [], isLoading } = useCampaigns()

  const filtered = campaigns.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.client as { name?: string })?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <Header title="Campaigns" subtitle={`${campaigns.length} campaigns across all clients`} />

      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search campaigns..."
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading campaigns…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">
                {search ? 'No campaigns match your search.' : 'No campaigns yet. Connect a platform to sync campaigns.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Campaign</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Daily Budget</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(campaign => (
                      <tr key={campaign.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                        <td className="px-6 py-3">
                          <div className="font-medium text-slate-800 text-sm">{campaign.name}</div>
                          {campaign.objective && (
                            <div className="text-xs text-slate-400">{campaign.objective}</div>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {campaign.client ? (
                            <Link
                              to={`/clients/${campaign.client_id}`}
                              className="text-sm text-slate-600 hover:text-blue-600"
                            >
                              {(campaign.client as { name: string }).name}
                            </Link>
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                        <td className="px-6 py-3">
                          <PlatformBadge platform={campaign.platform as PlatformType} />
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge status={campaign.status as CampaignStatus} showDot />
                        </td>
                        <td className="px-6 py-3 text-sm tabular-nums text-slate-600">
                          {campaign.daily_budget
                            ? formatCurrency(campaign.daily_budget, campaign.currency)
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-500">
                          {campaign.start_date ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <Link
                            to={`/campaigns/${campaign.id}`}
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
