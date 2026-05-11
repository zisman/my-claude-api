import { cn } from '@/lib/utils'
import { fmtCurrency, fmtPercent } from '@/lib/metrics/format'

interface BudgetPacingWidgetProps {
  spend: number
  budget: number
  /** Days elapsed in the current period (default: day of month) */
  daysElapsed?: number
  totalDays?: number
  currency?: string
  compact?: boolean
}

type PacingState = 'on_track' | 'overpacing' | 'underpacing' | 'severe_underpacing'

function getPacingState(rate: number): PacingState {
  if (rate > 1.25) return 'overpacing'
  if (rate < 0.6)  return 'severe_underpacing'
  if (rate < 0.85) return 'underpacing'
  return 'on_track'
}

const PACING_CONFIG: Record<PacingState, { label: string; barColor: string; textColor: string; bg: string }> = {
  on_track:           { label: 'On Track',            barColor: 'bg-emerald-500', textColor: 'text-emerald-700', bg: 'bg-emerald-50' },
  overpacing:         { label: 'Overpacing',           barColor: 'bg-red-500',     textColor: 'text-red-700',     bg: 'bg-red-50' },
  underpacing:        { label: 'Underpacing',          barColor: 'bg-amber-500',   textColor: 'text-amber-700',   bg: 'bg-amber-50' },
  severe_underpacing: { label: 'Severely Underpacing', barColor: 'bg-red-400',     textColor: 'text-red-600',     bg: 'bg-red-50' },
}

export function BudgetPacingWidget({
  spend,
  budget,
  daysElapsed,
  totalDays = 30,
  currency = 'USD',
  compact = false,
}: BudgetPacingWidgetProps) {
  const elapsed = daysElapsed ?? new Date().getDate()
  const expectedSpend = budget * (elapsed / totalDays)
  const pacingRate = expectedSpend > 0 ? spend / expectedSpend : spend > 0 ? 2 : 1
  const spendPct = budget > 0 ? Math.min((spend / budget) * 100, 100) : 0
  const expectedPct = Math.min((elapsed / totalDays) * 100, 100)

  const state = getPacingState(pacingRate)
  const cfg = PACING_CONFIG[state]

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{fmtCurrency(spend, currency)} / {fmtCurrency(budget, currency)}</span>
          <span className={cn('font-medium', cfg.textColor)}>{fmtPercent(pacingRate * 100, 0)}</span>
        </div>
        <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          {/* Expected marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-300 z-10"
            style={{ left: `${expectedPct}%` }}
          />
          <div
            className={cn('h-full rounded-full transition-all', cfg.barColor)}
            style={{ width: `${spendPct}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg p-3 space-y-2', cfg.bg)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-xs font-medium', cfg.textColor)}>{cfg.label}</span>
        <span className={cn('text-xs font-semibold tabular-nums', cfg.textColor)}>
          {fmtPercent(pacingRate * 100, 0)} of expected
        </span>
      </div>
      <div className="relative h-2 w-full bg-white/60 rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-400/60 z-10"
          style={{ left: `${expectedPct}%` }}
        />
        <div
          className={cn('h-full rounded-full transition-all', cfg.barColor)}
          style={{ width: `${spendPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{fmtCurrency(spend, currency)} spent</span>
        <span>{fmtCurrency(budget, currency)} budget</span>
      </div>
    </div>
  )
}
