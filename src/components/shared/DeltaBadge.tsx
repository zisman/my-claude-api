import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDelta } from '@/lib/metrics/format'
import type { MetricDelta } from '@/lib/metrics/types'

interface DeltaBadgeProps {
  delta: MetricDelta | null | undefined
  className?: string
  showIcon?: boolean
}

export function DeltaBadge({ delta, className, showIcon = true }: DeltaBadgeProps) {
  if (!delta || delta.relative == null) {
    return <span className={cn('text-xs text-slate-400', className)}>—</span>
  }

  const isPositive = delta.improved === true
  const isNegative = delta.improved === false
  const neutral = delta.improved === null

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
      isPositive && 'text-emerald-600',
      isNegative && 'text-red-500',
      neutral && 'text-slate-400',
      className,
    )}>
      {showIcon && isPositive && <TrendingUp className="w-3 h-3" />}
      {showIcon && isNegative && <TrendingDown className="w-3 h-3" />}
      {showIcon && neutral && <Minus className="w-3 h-3" />}
      {fmtDelta(delta.relative)}
    </span>
  )
}
