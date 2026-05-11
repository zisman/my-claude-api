import { supabase } from '@/lib/supabase/client'
import type { PlatformType } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending' | 'revoked'

export interface PlatformConnectionRow {
  id: string
  organization_id: string
  client_id: string
  platform: PlatformType
  display_name: string | null
  status: ConnectionStatus
  sync_enabled: boolean
  last_synced_at: string | null
  error_code: string | null
  error_message: string | null
  token_expires_at: string | null
  scopes: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SyncJobRow {
  id: string
  platform_connection_id: string
  organization_id: string
  job_type: string
  status: 'pending' | 'queued' | 'running' | 'success' | 'partial' | 'failed' | 'cancelled'
  triggered_by: string
  campaigns_synced: number
  ad_groups_synced: number
  ads_synced: number
  metrics_synced: number
  records_failed: number
  error_summary: string | null
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPlatformConnections(opts?: { clientId?: string; orgId?: string }): Promise<PlatformConnectionRow[]> {
  let query = db
    .from('platform_connections')
    .select('id,organization_id,client_id,platform,display_name,status,sync_enabled,last_synced_at,error_code,error_message,token_expires_at,scopes,metadata,created_at,updated_at')
    .order('platform')

  if (opts?.clientId) query = query.eq('client_id', opts.clientId)
  if (opts?.orgId)    query = query.eq('organization_id', opts.orgId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as PlatformConnectionRow[]
}

export async function getLastSyncJob(connectionId: string): Promise<SyncJobRow | null> {
  const { data } = await db
    .from('sync_jobs')
    .select('*')
    .eq('platform_connection_id', connectionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data ?? null) as SyncJobRow | null
}

export async function getSyncJobLogs(jobId: string, limit = 50) {
  const { data, error } = await db
    .from('sync_job_logs')
    .select('id,level,message,entity_type,entity_id,details,created_at')
    .eq('sync_job_id', jobId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// ─── OAuth initiation ─────────────────────────────────────────────────────────

/**
 * Upserts a pending connection row and returns its id + the state string to use in the OAuth URL.
 * Called just before redirecting the user to the platform OAuth page.
 */
export async function initiateOAuthConnection(opts: {
  clientId: string
  organizationId: string
  platform: PlatformType
}): Promise<{ connectionId: string; state: string }> {
  const state = [opts.clientId, opts.platform, Date.now(), crypto.randomUUID().slice(0, 8)].join(':')

  const { data, error } = await db
    .from('platform_connections')
    .upsert(
      {
        client_id: opts.clientId,
        organization_id: opts.organizationId,
        platform: opts.platform,
        status: 'pending',
        oauth_state: state,
      },
      { onConflict: 'client_id,platform' }
    )
    .select('id')
    .single()

  if (error) throw error
  return { connectionId: data.id as string, state }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function disconnectPlatform(connectionId: string): Promise<void> {
  const { error } = await db
    .from('platform_connections')
    .update({
      status: 'disconnected',
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      token_expires_at: null,
      error_code: null,
      error_message: null,
    })
    .eq('id', connectionId)

  if (error) throw error
}

export async function toggleSyncEnabled(connectionId: string, enabled: boolean): Promise<void> {
  const { error } = await db
    .from('platform_connections')
    .update({ sync_enabled: enabled })
    .eq('id', connectionId)

  if (error) throw error
}

// ─── Edge Function callers ────────────────────────────────────────────────────

async function edgeFn(path: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Not authenticated')

  const base = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${base}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? `Edge function ${path} failed (${res.status})`)
  }

  return res.json()
}

/**
 * Exchange OAuth authorization code for tokens and persist the connection.
 * Called from OAuthCallbackPage after the platform redirects back.
 */
export async function exchangeOAuthCode(opts: {
  platform: PlatformType
  code: string
  state: string
  redirectUri: string
}): Promise<{ connectionId: string; accountName: string | null }> {
  return edgeFn('oauth-exchange', opts)
}

/**
 * Force-refresh the stored access token for a connection.
 */
export async function refreshConnectionToken(connectionId: string): Promise<void> {
  await edgeFn('token-refresh', { connection_id: connectionId })
}

/**
 * Create a manual sync job for a connection and kick it off.
 */
export async function triggerManualSync(opts: {
  connectionId: string
  jobType?: 'full' | 'incremental' | 'campaigns' | 'metrics'
}): Promise<{ jobId: string }> {
  const result = await edgeFn('sync-trigger', {
    platform_connection_id: opts.connectionId,
    job_type: opts.jobType ?? 'incremental',
  })
  return { jobId: result.job_id }
}

/**
 * Poll the status of a sync job.
 */
export async function getSyncJobStatus(jobId: string): Promise<SyncJobRow | null> {
  const { data } = await db
    .from('sync_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle()
  return (data ?? null) as SyncJobRow | null
}
