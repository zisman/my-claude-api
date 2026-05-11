import { supabase } from '@/lib/supabase/client'
import type { PlatformConnection, PlatformType } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getPlatformConnections(clientId?: string): Promise<PlatformConnection[]> {
  let query = db.from('platform_connections').select(`*, client:clients(id, name)`).order('created_at', { ascending: false })
  if (clientId) query = query.eq('client_id', clientId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PlatformConnection[]
}

export async function upsertPlatformConnection(
  connection: Partial<PlatformConnection> & { client_id: string; organization_id: string; platform: PlatformType }
): Promise<PlatformConnection> {
  const { data, error } = await db
    .from('platform_connections')
    .upsert(connection, { onConflict: 'client_id,platform' })
    .select()
    .single()
  if (error) throw error
  return data as PlatformConnection
}

export async function disconnectPlatform(connectionId: string): Promise<void> {
  const { error } = await db
    .from('platform_connections')
    .update({ status: 'disconnected', access_token_encrypted: null, refresh_token_encrypted: null, token_expires_at: null })
    .eq('id', connectionId)
  if (error) throw error
}

export async function getSyncLogs(connectionId: string, limit = 20) {
  const { data, error } = await db
    .from('sync_job_logs')
    .select('*')
    .eq('platform_connection_id', connectionId)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
