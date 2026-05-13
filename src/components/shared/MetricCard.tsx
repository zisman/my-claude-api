import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon?: React.ReactNode
  description?: string
  loading?: boolean
}

export function MetricCard({ title, value, change, icon, description, loading }: MetricCardProps) {
  const isPositive = change != null && change > 0
  const isNegative = change != null && change < 0
  const isNeutral = change == null || change === 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-slate-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
            )}
            {change != null && !loading && (
              <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', {
                'text-emerald-600': isPositive,
                'text-red-500': isNegative,
                'text-slate-400': isNeutral,
              })}>
                {isPositive && <TrendingUp className="w-3 h-3" />}
                {isNegative && <TrendingDown className="w-3 h-3" />}
                {isNeutral && <Minus className="w-3 h-3" />}
                <span>{isPositive ? '+' : ''}{change.toFixed(1)}% vs last period</span>
              </div>
            )}
            {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
          </div>
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0 ml-4">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
