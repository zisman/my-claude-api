import { cn } from '@/lib/utils'

interface HealthScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function getScoreColor(score: number) {
  if (score >= 80) return { stroke: '#10b981', text: 'text-emerald-600' }
  if (score >= 60) return { stroke: '#f59e0b', text: 'text-amber-600' }
  if (score >= 40) return { stroke: '#f97316', text: 'text-orange-600' }
  return { stroke: '#ef4444', text: 'text-red-600' }
}

const SIZE_CONFIG = {
  sm: { px: 40, r: 14, stroke: 4, text: 'text-xs' },
  md: { px: 64, r: 24, stroke: 5, text: 'text-sm' },
  lg: { px: 96, r: 36, stroke: 6, text: 'text-base' },
}

export function HealthScoreRing({ score, size = 'md', showLabel = true }: HealthScoreRingProps) {
  const { px, r, stroke, text } = SIZE_CONFIG[size]
  const { stroke: color, text: textColor } = getScoreColor(score)
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const center = px / 2

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="flex flex-col items-center -mt-px" style={{ marginTop: `-${px * 0.6}px`, height: px * 0.6 + 'px', justifyContent: 'center' }}>
        <span className={cn('font-bold tabular-nums leading-none rotate-90', text, textColor)}>
          {Math.round(score)}
        </span>
      </div>
      {showLabel && <span className="text-xs text-slate-400">Health</span>}
    </div>
  )
}
