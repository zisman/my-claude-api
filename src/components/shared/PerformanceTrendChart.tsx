import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fmtCurrency, fmtNumber } from '@/lib/metrics/format'

type MetricKey = 'spend' | 'clicks' | 'impressions' | 'conversions'

interface DataPoint {
  date: string
  spend: number
  clicks: number
  impressions: number
  conversions: number
  ctr?: number
  cpc?: number
  roas?: number | null
}

interface PerformanceTrendChartProps {
  data: DataPoint[]
  loading?: boolean
  title?: string
  defaultMetrics?: MetricKey[]
}

const METRIC_CONFIG: Record<MetricKey, { label: string; color: string; format: (v: number) => string }> = {
  spend:       { label: 'Spend',       color: '#3b82f6', format: v => fmtCurrency(v) },
  clicks:      { label: 'Clicks',      color: '#10b981', format: v => fmtNumber(v) },
  impressions: { label: 'Impressions', color: '#8b5cf6', format: v => fmtNumber(v) },
  conversions: { label: 'Conversions', color: '#f59e0b', format: v => fmtNumber(v) },
}

const PERIOD_OPTIONS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

interface PerformanceTrendChartFullProps extends PerformanceTrendChartProps {
  days?: number
  onDaysChange?: (days: number) => void
}

export function PerformanceTrendChart({
  data,
  loading,
  title = 'Performance Trend',
  defaultMetrics = ['spend', 'clicks'],
  days = 30,
  onDaysChange,
}: PerformanceTrendChartFullProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(defaultMetrics))

  function toggleMetric(key: MetricKey) {
    setActiveMetrics(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const chartData = data.map(d => ({ ...d, date: d.date.slice(5) }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {onDaysChange && PERIOD_OPTIONS.map(opt => (
            <Button
              key={opt.days}
              variant={days === opt.days ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => onDaysChange(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Metric toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map(key => {
            const cfg = METRIC_CONFIG[key]
            const active = activeMetrics.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? `${cfg.color}18` : '#f1f5f9',
                  color: active ? cfg.color : '#94a3b8',
                  border: `1px solid ${active ? cfg.color : 'transparent'}`,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? cfg.color : '#cbd5e1' }} />
                {cfg.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-full h-full bg-slate-50 rounded animate-pulse" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-slate-400">
            No performance data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                {(Object.keys(METRIC_CONFIG) as MetricKey[]).map(key => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={METRIC_CONFIG[key].color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={METRIC_CONFIG[key].color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => fmtNumber(v)} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const cfg = METRIC_CONFIG[name as MetricKey]
                  return [cfg?.format(value) ?? fmtNumber(value), cfg?.label ?? name]
                }}
                labelStyle={{ fontSize: 12, color: '#475569' }}
                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
              />
              {(Object.keys(METRIC_CONFIG) as MetricKey[]).filter(k => activeMetrics.has(k)).map(key => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={METRIC_CONFIG[key].color}
                  strokeWidth={2}
                  fill={`url(#grad-${key})`}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
