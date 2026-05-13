import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Building2, ExternalLink } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useClients } from '@/hooks/useClients'
import { formatCurrency } from '@/lib/metrics/normalize'
import type { ClientWithStats } from '@/types'

function ClientRow({ client }: { client: ClientWithStats }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {client.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>
          )}
          <div>
            <div className="font-medium text-slate-900">{client.name}</div>
            {client.industry && <div className="text-xs text-slate-400">{client.industry}</div>}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{client.platform_count} platforms</td>
      <td className="px-6 py-4 text-sm text-slate-600">{client.campaign_count} campaigns</td>
      <td className="px-6 py-4 text-sm tabular-nums">
        {client.monthly_budget ? formatCurrency(client.monthly_budget, client.currency) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-6 py-4">
        {client.open_alert_count > 0 ? (
          <Badge variant="destructive">{client.open_alert_count} alerts</Badge>
        ) : (
          <Badge variant="success">No alerts</Badge>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          to={`/clients/${client.id}`}
          className="inline-flex items-center gap-1 text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          View <ExternalLink className="w-3 h-3" />
        </Link>
      </td>
    </tr>
  )
}

export function ClientsPage() {
  const { data: clients = [], isLoading } = useClients()
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <Header
        title="Clients"
        subtitle={`${clients.length} active client${clients.length !== 1 ? 's' : ''}`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        }
      />

      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search clients..."
              className="pl-8"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading clients…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {search ? 'No clients match your search.' : 'No clients yet. Add your first client to get started.'}
                </p>
                {!search && (
                  <Button size="sm" className="mt-4">
                    <Plus className="w-4 h-4" /> Add Client
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platforms</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Campaigns</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Monthly Budget</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Alerts</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(client => <ClientRow key={client.id} client={client} />)}
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
