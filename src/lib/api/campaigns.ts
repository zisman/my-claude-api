import { supabase } from '@/lib/supabase/client'
import type { CampaignWithMetrics, CampaignFilters, CampaignStatus } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getCampaigns(filters?: CampaignFilters): Promise<CampaignWithMetrics[]> {
  let query = db
    .from('campaigns')
    .select(`*, client:clients(id, name, logo_url, currency), latest_metrics:campaign_metrics(*)`)
    .order('created_at', { ascending: false })

  if (filters?.client_id)    query = query.eq('client_id', filters.client_id)
  if (filters?.status?.length)    query = query.in('status', filters.status)
  if (filters?.platforms?.length) query = query.in('platform', filters.platforms)
  if (filters?.search) query = query.ilike('name', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as CampaignWithMetrics[]
}

export async function getCampaign(id: string): Promise<CampaignWithMetrics | null> {
  const { data, error } = await db
    .from('campaigns')
    .select(`
      *,
      client:clients(id, name, logo_url, currency, timezone),
      platform_connection:platform_connections(id, platform, account_name, status),
      latest_metrics:campaign_metrics(*)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as CampaignWithMetrics
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<void> {
  const { error } = await db.from('campaigns').update({ status }).eq('id', id)
  if (error) throw error
}
