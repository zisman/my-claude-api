import { Link } from 'react-router-dom'
import { AlertTriangle, XCircle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { fmtCurrency } from '@/lib/metrics/format'
import { cn } from '@/lib/utils'
import type { AttentionCampaign } from '@/lib/api/metrics'
import type { PlatformType } from '@/types'

interface CampaignsAttentionWidgetProps {
  campaigns: AttentionCampaign[]
  loading?: boolean
}

const SEVERITY_CONFIG = {
  critical: { icon: XCircle,       color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100',  label: 'Critical' },
  warning:  { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100', label: 'Warning' },
  info:     { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100',  label: 'Info' },
}

export function CampaignsAttentionWidget({ campaigns, loading }: CampaignsAttentionWidgetProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Needs Attention</CardTitle>
          {campaigns.length > 0 && (
            <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
              {campaigns.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">All campaigns look healthy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {campaigns.map(c => {
              const cfg = SEVERITY_CONFIG[c.severity]
              const Icon = cfg.icon
              return (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className={cn(
                    'flex items-start gap-3 rounded-lg px-3 py-2.5 border transition-colors hover:brightness-95',
                    cfg.bg, cfg.border,
                  )}
                >
                  <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', cfg.color)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{c.name}</span>
                      <PlatformBadge platform={c.platform as PlatformType} size="xs" />
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-slate-500">{c.reason}</span>
                      <span className="text-xs text-slate-400 tabular-nums ml-2 flex-shrink-0">
                        {fmtCurrency(c.spend_30d)} 30d
                      </span>
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
