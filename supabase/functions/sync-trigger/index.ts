/**
 * sync-trigger — POST /functions/v1/sync-trigger
 *
 * Creates a sync_job record, optionally refreshes the access token if it
 * is about to expire, then calls sync-campaigns (and sync-metrics for a
 * full sync) asynchronously via EdgeRuntime.waitUntil.
 *
 * Request body:
 *   { platform_connection_id, job_type?, triggered_by? }
 *   job_type: 'full' | 'incremental' | 'campaigns' | 'metrics'  (default: incremental)
 *   triggered_by: 'manual' | 'schedule' | 'system' | 'webhook'  (default: manual)
 *
 * Response:
 *   { job_id }
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000 // refresh if expiring within 5 min

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
    }

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json() as {
      platform_connection_id: string
      job_type?: string
      triggered_by?: string
      triggered_by_user_id?: string | null
    }

    const {
      platform_connection_id,
      job_type      = 'incremental',
      triggered_by  = 'manual',
      triggered_by_user_id = null,
    } = body

    if (!platform_connection_id) {
      return new Response(JSON.stringify({ message: 'platform_connection_id required' }), { status: 400, headers: CORS_HEADERS })
    }

    // Fetch connection to verify it exists and is connected
    const { data: conn, error: connErr } = await db
      .from('platform_connections')
      .select('id, organization_id, status, token_expires_at, sync_enabled')
      .eq('id', platform_connection_id)
      .single()

    if (connErr || !conn) {
      return new Response(JSON.stringify({ message: 'Connection not found' }), { status: 404, headers: CORS_HEADERS })
    }

    if (conn.status !== 'connected') {
      return new Response(
        JSON.stringify({ message: `Cannot sync: connection status is '${conn.status}'` }),
        { status: 409, headers: CORS_HEADERS }
      )
    }

    // Proactively refresh token if it expires soon
    if (conn.token_expires_at) {
      const expiresAt = new Date(conn.token_expires_at).getTime()
      if (expiresAt - Date.now() < TOKEN_REFRESH_WINDOW_MS) {
        console.log(`Token expiring soon for ${platform_connection_id}, refreshing…`)
        const refreshRes = await fetch(`${supabaseUrl}/functions/v1/token-refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ connection_id: platform_connection_id }),
        })
        if (!refreshRes.ok) {
          const err = await refreshRes.json().catch(() => ({}))
          // Mark connection error and abort
          await db.from('platform_connections').update({
            status: 'error',
            error_code: 'token_expired',
            error_message: 'Access token expired and refresh failed. Please re-authorize.',
          }).eq('id', platform_connection_id)
          return new Response(
            JSON.stringify({ message: 'Token refresh failed before sync' }),
            { status: 502, headers: CORS_HEADERS }
          )
        }
      }
    }

    // Create sync_job record
    const { data: job, error: jobErr } = await db
      .from('sync_jobs')
      .insert({
        organization_id:        conn.organization_id,
        platform_connection_id,
        job_type,
        status:                 'queued',
        triggered_by,
        triggered_by_user_id,
        scheduled_at:           new Date().toISOString(),
        is_scheduled:           triggered_by === 'schedule',
        campaigns_synced:       0,
        ad_groups_synced:       0,
        ads_synced:             0,
        metrics_synced:         0,
        records_failed:         0,
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      console.error('Failed to create sync_job:', jobErr)
      return new Response(JSON.stringify({ message: 'Failed to create sync job' }), { status: 500, headers: CORS_HEADERS })
    }

    const jobId = job.id as string
    console.log(`Created sync_job ${jobId} for connection ${platform_connection_id}`)

    // Dispatch sync worker asynchronously
    const syncPayload = JSON.stringify({
      sync_job_id:            jobId,
      platform_connection_id,
      job_type,
    })

    // Call sync-campaigns (handles campaign + ad hierarchy)
    const dispatchCampaigns = fetch(`${supabaseUrl}/functions/v1/sync-campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: syncPayload,
    }).catch(err => console.error('sync-campaigns dispatch failed:', err))

    // For full/metrics syncs, also trigger sync-metrics
    const dispatchMetrics = (job_type === 'full' || job_type === 'metrics')
      ? fetch(`${supabaseUrl}/functions/v1/sync-metrics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: syncPayload,
        }).catch(err => console.error('sync-metrics dispatch failed:', err))
      : Promise.resolve()

    // Use EdgeRuntime.waitUntil if available (keeps the function alive for background work)
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(Promise.all([dispatchCampaigns, dispatchMetrics]))
    }

    return new Response(
      JSON.stringify({ job_id: jobId }),
      { status: 202, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('sync-trigger error:', err)
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
