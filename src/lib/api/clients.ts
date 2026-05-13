import { supabase } from '@/lib/supabase/client'
import type { Client, ClientWithStats, CreateClientForm } from '@/types'

export async function getClients(): Promise<ClientWithStats[]> {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      account_manager:user_profiles!account_manager_id(id, full_name, avatar_url, email),
      platform_connections(id, platform, status),
      campaigns(id, status)
    `)
    .eq('is_active', true)
    .order('name')

  if (error) throw error

  return ((data ?? []) as unknown[]).map((client) => {
    const c = client as Record<string, unknown>
    return {
      ...c,
      platform_count: (c.platform_connections as unknown[] ?? []).length,
      campaign_count: (c.campaigns as unknown[] ?? []).length,
      total_spend: 0,
      total_impressions: 0,
      total_clicks: 0,
      avg_health_score: null,
      open_alert_count: 0,
    }
  }) as ClientWithStats[]
}

export async function getClient(id: string): Promise<ClientWithStats | null> {
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      account_manager:user_profiles!account_manager_id(id, full_name, avatar_url, email),
      platform_connections(*),
      campaigns(id, name, status, platform, daily_budget, currency)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  const c = data as unknown as Record<string, unknown>
  return {
    ...c,
    platform_count: (c.platform_connections as unknown[] ?? []).length,
    campaign_count: (c.campaigns as unknown[] ?? []).length,
    total_spend: 0,
    total_impressions: 0,
    total_clicks: 0,
    avg_health_score: null,
    open_alert_count: 0,
  } as ClientWithStats
}

export async function createClient(form: CreateClientForm & { organization_id: string }): Promise<Client> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('clients') as any)
    .insert(form)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

export async function updateClient(id: string, updates: Partial<CreateClientForm>): Promise<Client> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('clients') as any)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Client
}

export async function archiveClient(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('clients') as any)
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}
