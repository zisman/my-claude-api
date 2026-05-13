import { supabase } from '@/lib/supabase/client'
import type { Alert, AlertFilters } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getAlerts(filters?: AlertFilters): Promise<Alert[]> {
  let query = db
    .from('alerts')
    .select(`*, client:clients(id, name), campaign:campaigns(id, name, platform)`)
    .order('created_at', { ascending: false })

  if (filters?.organizationId) query = query.eq('organization_id', filters.organizationId)
  if (filters?.status?.length)   query = query.in('status', filters.status)
  if (filters?.severity?.length) query = query.in('severity', filters.severity)
  if (filters?.client_id)        query = query.eq('client_id', filters.client_id)
  if (filters?.search)           query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Alert[]
}

export async function acknowledgeAlert(id: string, userId: string): Promise<void> {
  const { error } = await db
    .from('alerts')
    .update({ status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function resolveAlert(id: string): Promise<void> {
  const { error } = await db
    .from('alerts')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function suppressAlert(id: string): Promise<void> {
  const { error } = await db.from('alerts').update({ status: 'suppressed' }).eq('id', id)
  if (error) throw error
}

export async function getAlertCounts(organizationId: string) {
  const { data, error } = await db
    .from('alerts')
    .select('severity, status')
    .eq('organization_id', organizationId)
    .eq('status', 'open')

  if (error) throw error
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 }
  for (const alert of (data ?? []) as { severity: string }[]) {
    counts[alert.severity as keyof typeof counts]++
    counts.total++
  }
  return counts
}
