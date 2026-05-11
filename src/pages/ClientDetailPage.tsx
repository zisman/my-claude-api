import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Building2, Globe, DollarSign } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MetricCard } from '@/components/shared/MetricCard'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useClient } from '@/hooks/useClients'
import { useDailyPerformance, useCampaigns } from '@/hooks/useCampaigns'
import { formatCurrency, formatNumber } from '@/lib/metrics/normalize'
import type { PlatformType } from '@/types'

export function ClientDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data: client, isLoading } = useClient(id)
  const { data: campaigns = [] } = useCampaigns({ client_id: id })
  const { data: performance = [] } = useDailyPerformance(id, 30)

  if (isLoading) {
    return (
      <div className="p-8 text-sm text-slate-400">Loading client…</div>
    )
  }

  if (!client) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-500">Client not found.</p>
        <Link to="/clients" className="text-sm text-blue-600 mt-2 inline-block">← Back to clients</Link>
      </div>
    )
  }

  const totalSpend = performance.reduce((s, p) => s + Number(p.spend), 0)
  const totalClicks = performance.reduce((s, p) => s + Number(p.clicks), 0)
  const totalImpressions = performance.reduce((s, p) => s + Number(p.impressions), 0)
  const totalConversions = performance.reduce((s, p) => s + Number(p.conversions), 0)

  return (
    <div>
      <Header
        title={client.name}
        subtitle={client.industry ?? undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/clients"><ArrowLeft className="w-4 h-4" /> All Clients</Link>
          </Button>
        }
      />

      <div className="p-8 space-y-8">
        {/* Client info */}
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            {client.logo_url
              ? <img src={client.logo_url} alt={client.name} className="w-full h-full rounded-xl object-cover" />
              : <Building2 className="w-7 h-7 text-slate-400" />
            }
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{client.name}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600">
                  <Globe className="w-3.5 h-3.5" /> {client.website}
                </a>
              )}
              {client.monthly_budget && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  {formatCurrency(client.monthly_budget, client.currency)} / month
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Spend (30d)" value={formatCurrency(totalSpend)} icon={<DollarSign className="w-5 h-5" />} />
          <MetricCard title="Clicks (30d)" value={formatNumber(totalClicks)} />
          <MetricCard title="Impressions (30d)" value={formatNumber(totalImpressions)} />
          <MetricCard title="Conversions (30d)" value={formatNumber(totalConversions)} />
        </div>

        {/* Performance chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Performance (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {performance.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-slate-400">
                No performance data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${formatNumber(v)}`} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Spend']}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                  />
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="spend" stroke="#3b82f6" fill="url(#cg)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaigns ({campaigns.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No campaigns synced yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Daily Budget</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                      <td className="px-6 py-3 text-sm font-medium text-slate-800">{c.name}</td>
                      <td className="px-6 py-3"><PlatformBadge platform={c.platform as PlatformType} /></td>
                      <td className="px-6 py-3"><StatusBadge status={c.status} showDot /></td>
                      <td className="px-6 py-3 text-sm tabular-nums text-slate-600">
                        {c.daily_budget ? formatCurrency(c.daily_budget, c.currency) : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link to={`/campaigns/${c.id}`} className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
