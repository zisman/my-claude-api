import { cn } from '@/lib/utils'
import type { PlatformType } from '@/types'

const PLATFORM_CONFIG: Record<PlatformType, { label: string; color: string; bg: string }> = {
  google_ads: { label: 'Google Ads', color: 'text-blue-700', bg: 'bg-blue-50' },
  meta_ads: { label: 'Meta Ads', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  linkedin_ads: { label: 'LinkedIn', color: 'text-sky-700', bg: 'bg-sky-50' },
  ga4: { label: 'GA4', color: 'text-orange-700', bg: 'bg-orange-50' },
}

interface PlatformBadgeProps {
  platform: PlatformType
  size?: 'xs' | 'sm'
  className?: string
}

export function PlatformBadge({ platform, size = 'sm', className }: PlatformBadgeProps) {
  const config = PLATFORM_CONFIG[platform] ?? { label: platform, color: 'text-slate-600', bg: 'bg-slate-100' }
  return (
    <span className={cn(
      'inline-flex items-center rounded font-medium',
      size === 'xs' ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs',
      config.bg, config.color, className
    )}>
      {config.label}
    </span>
  )
}

export function platformLabel(platform: PlatformType): string {
  return PLATFORM_CONFIG[platform]?.label ?? platform
}
