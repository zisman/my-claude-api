import { cn } from '@/lib/utils'
import type { CampaignStatus, AlertSeverity, AlertStatus, TaskStatus, TaskPriority } from '@/types'

type StatusType = CampaignStatus | AlertSeverity | AlertStatus | TaskStatus | TaskPriority

const STATUS_CONFIG: Record<string, { label: string; color: string; dot?: string }> = {
  // Campaign status
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  paused: { label: 'Paused', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  ended: { label: 'Ended', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  draft: { label: 'Draft', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  // Alert severity
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Low', color: 'bg-blue-100 text-blue-700' },
  info: { label: 'Info', color: 'bg-slate-100 text-slate-600' },
  // Alert status
  open: { label: 'Open', color: 'bg-red-100 text-red-700' },
  acknowledged: { label: 'Acknowledged', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  suppressed: { label: 'Suppressed', color: 'bg-slate-100 text-slate-500' },
  // Task status
  todo: { label: 'To Do', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  done: { label: 'Done', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-400' },
  // Task priority
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
}

interface StatusBadgeProps {
  status: StatusType
  showDot?: boolean
  className?: string
}

export function StatusBadge({ status, showDot = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'bg-slate-100 text-slate-600' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', config.color, className)}>
      {showDot && config.dot && <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />}
      {config.label}
    </span>
  )
}
