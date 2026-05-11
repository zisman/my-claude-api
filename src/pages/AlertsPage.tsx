import { useState } from 'react'
import { Bell, Check, EyeOff } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, acknowledgeAlert, resolveAlert } from '@/lib/api/alerts'
import { useAuth } from '@/hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import type { AlertSeverity, AlertStatus } from '@/types'

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

export function AlertsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [activeStatus, setActiveStatus] = useState<AlertStatus | 'all'>('open')

  const orgId = user?.organization_id

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', orgId, activeStatus],
    queryFn: () => getAlerts({
      organizationId: orgId,
      ...(activeStatus !== 'all' && { status: [activeStatus] }),
    }),
    enabled: !!orgId,
  })

  const ackMutation = useMutation({
    mutationFn: (id: string) => acknowledgeAlert(id, user?.id ?? ''),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })
  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  const sorted = [...alerts].sort((a, b) => SEVERITY_ORDER[a.severity as AlertSeverity] - SEVERITY_ORDER[b.severity as AlertSeverity])

  const tabs: { id: AlertStatus | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'acknowledged', label: 'Acknowledged' },
    { id: 'resolved', label: 'Resolved' },
  ]

  return (
    <div>
      <Header
        title="Alerts"
        subtitle={`${alerts.filter(a => a.status === 'open').length} open alert(s)`}
      />

      <div className="p-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveStatus(t.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeStatus === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-400">Loading alerts…</div>
            ) : sorted.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No alerts. Your campaigns are healthy!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sorted.map(alert => (
                  <div key={alert.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={alert.severity as AlertSeverity} />
                        <StatusBadge status={alert.status as AlertStatus} />
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 text-sm mt-1.5">{alert.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
                      {(alert as { client?: { name: string } }).client && (
                        <p className="text-xs text-slate-400 mt-1">
                          Client: {(alert as { client?: { name: string } }).client?.name}
                        </p>
                      )}
                    </div>
                    {alert.status === 'open' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => ackMutation.mutate(alert.id)}
                          disabled={ackMutation.isPending}
                        >
                          <Check className="w-3 h-3" /> Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-slate-500"
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={resolveMutation.isPending}
                        >
                          <EyeOff className="w-3 h-3" /> Resolve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
