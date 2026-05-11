/**
 * sync-metrics — POST /functions/v1/sync-metrics
 *
 * Fetches daily performance metrics from the platform API and upserts
 * them into the daily_metrics table. Uses the idempotent upsert_daily_metric()
 * DB function defined in migration 005.
 *
 * Request body:
 *   { sync_job_id, platform_connection_id, job_type }
 *   For incremental syncs, fetches last 7 days.
 *   For full syncs, fetches last 90 days.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Crypto ───────────────────────────────────────────────────────────────────

async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY not set')
  const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function decryptToken(encoded: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return new TextDecoder().decode(decrypted)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dateRange(days: number): { start: string; end: string } {
  const end   = new Date()
  const start = new Date(Date.now() - days * 86_400_000)
  return { start: toISODate(start), end: toISODate(end) }
}

// ─── Logger ───────────────────────────────────────────────────────────────────

async function log(
  db: ReturnType<typeof createClient>,
  jobId: string,
  orgId: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  details: Record<string, unknown> = {}
) {
  await db.from('sync_job_logs').insert({ sync_job_id: jobId, organization_id: orgId, level, message, details })
}

// ─── Metric upsert ────────────────────────────────────────────────────────────

async function upsertMetric(
  db: ReturnType<typeof createClient>,
  metric: Record<string, unknown>
) {
  // Use the idempotent RPC defined in 005_views_and_functions.sql
  const { error } = await (db as any).rpc('upsert_daily_metric', metric)
  if (error) throw new Error(`upsert_daily_metric failed: ${error.message}`)
}

// ─── Google Ads metrics ───────────────────────────────────────────────────────

async function syncGoogleAdsMetrics(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string,
  days: number
): Promise<number> {
  const customerId = (conn.metadata as Record<string, unknown>)?.customer_id as string
  if (!customerId) {
    await log(db, jobId, conn.organization_id as string, 'warning', 'No customer_id in metadata')
    return 0
  }

  const { start, end } = dateRange(days)
  const query = `
    SELECT
      campaign.id,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm,
      metrics.search_impression_share
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status != 'REMOVED'
  `

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization:     `Bearer ${accessToken}`,
        'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? '',
        'Content-Type':    'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )

  if (!res.ok) {
    await log(db, jobId, conn.organization_id as string, 'error',
      'Google Ads metrics API call failed', { status: res.status })
    throw new Error(`Google Ads metrics API error ${res.status}`)
  }

  const responses: { results?: Record<string, unknown>[] }[] = await res.json()
  const rows = responses.flatMap(r => r.results ?? [])

  // Fetch campaign id→internal id mapping
  const { data: campaignRows } = await db
    .from('campaigns')
    .select('id, platform_campaign_id')
    .eq('platform_connection_id', conn.id as string)

  const campaignMap = new Map((campaignRows ?? []).map((r: Record<string, string>) => [r.platform_campaign_id, r.id]))

  let synced = 0
  for (const row of rows) {
    const cam = row.campaign as Record<string, string>
    const seg = row.segments as Record<string, string>
    const m   = row.metrics as Record<string, number>

    const campaignId = campaignMap.get(cam.id)
    if (!campaignId) continue

    const spend = (m.cost_micros ?? 0) / 1_000_000

    await upsertMetric(db, {
      p_organization_id:    conn.organization_id,
      p_client_id:          conn.client_id,
      p_campaign_id:        campaignId,
      p_ad_group_id:        null,
      p_ad_id:              null,
      p_platform:           'google_ads',
      p_date:               seg.date,
      p_impressions:        m.impressions ?? 0,
      p_clicks:             m.clicks ?? 0,
      p_spend:              spend,
      p_conversions:        m.conversions ?? 0,
      p_conversion_value:   m.conversions_value ?? 0,
      p_ctr:                m.ctr ?? 0,
      p_cpc:                (m.average_cpc ?? 0) / 1_000_000,
      p_cpm:                (m.average_cpm ?? 0) / 1_000_000,
      p_impression_share:   m.search_impression_share ?? null,
      p_platform_data:      row,
    })
    synced++
  }

  return synced
}

// ─── Meta Ads metrics ─────────────────────────────────────────────────────────

async function syncMetaMetrics(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string,
  days: number
): Promise<number> {
  const adAccountId = (conn.metadata as Record<string, unknown>)?.ad_account_id as string
  if (!adAccountId) {
    await log(db, jobId, conn.organization_id as string, 'warning', 'No ad_account_id in metadata')
    return 0
  }

  const { start, end } = dateRange(days)
  const fields = 'campaign_id,campaign_name,date_start,impressions,clicks,spend,actions,action_values,ctr,cpc,cpm'
  const res = await fetch(
    `https://graph.facebook.com/v19.0/act_${adAccountId}/insights` +
    `?fields=${fields}&time_range={"since":"${start}","until":"${end}"}` +
    `&level=campaign&time_increment=1&limit=500&access_token=${accessToken}`
  )

  if (!res.ok) {
    await log(db, jobId, conn.organization_id as string, 'error',
      'Meta Insights API call failed', { status: res.status })
    throw new Error(`Meta Insights API error ${res.status}`)
  }

  const json = await res.json() as { data: Record<string, unknown>[] }

  const { data: campaignRows } = await db
    .from('campaigns')
    .select('id, platform_campaign_id')
    .eq('platform_connection_id', conn.id as string)
  const campaignMap = new Map((campaignRows ?? []).map((r: Record<string, string>) => [r.platform_campaign_id, r.id]))

  let synced = 0
  for (const row of json.data ?? []) {
    const campaignId = campaignMap.get(row.campaign_id as string)
    if (!campaignId) continue

    const actions      = (row.actions as { action_type: string; value: string }[] | null) ?? []
    const actionValues = (row.action_values as { action_type: string; value: string }[] | null) ?? []
    const conversions  = actions.find(a => a.action_type === 'purchase')?.value ?? '0'
    const convValue    = actionValues.find(a => a.action_type === 'purchase')?.value ?? '0'

    await upsertMetric(db, {
      p_organization_id:  conn.organization_id,
      p_client_id:        conn.client_id,
      p_campaign_id:      campaignId,
      p_ad_group_id:      null,
      p_ad_id:            null,
      p_platform:         'meta_ads',
      p_date:             row.date_start as string,
      p_impressions:      parseInt(row.impressions as string, 10) || 0,
      p_clicks:           parseInt(row.clicks as string, 10) || 0,
      p_spend:            parseFloat(row.spend as string) || 0,
      p_conversions:      parseFloat(conversions),
      p_conversion_value: parseFloat(convValue),
      p_ctr:              parseFloat(row.ctr as string) || 0,
      p_cpc:              parseFloat(row.cpc as string) || 0,
      p_cpm:              parseFloat(row.cpm as string) || 0,
      p_platform_data:    row,
    })
    synced++
  }

  return synced
}

// ─── LinkedIn Ads metrics ─────────────────────────────────────────────────────

async function syncLinkedInMetrics(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string,
  days: number
): Promise<number> {
  const accountId = (conn.metadata as Record<string, unknown>)?.account_id as string
  if (!accountId) {
    await log(db, jobId, conn.organization_id as string, 'warning', 'No account_id in metadata')
    return 0
  }

  const { start, end } = dateRange(days)
  const startEncoded = start.replace(/-/g, '%2C')
  const endEncoded   = end.replace(/-/g, '%2C')

  const res = await fetch(
    `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN` +
    `&dateRange.start.year=${start.slice(0,4)}&dateRange.start.month=${parseInt(start.slice(5,7))}` +
    `&dateRange.start.day=${parseInt(start.slice(8,10))}` +
    `&dateRange.end.year=${end.slice(0,4)}&dateRange.end.month=${parseInt(end.slice(5,7))}` +
    `&dateRange.end.day=${parseInt(end.slice(8,10))}` +
    `&timeGranularity=DAILY&accounts=urn:li:sponsoredAccount:${accountId}` +
    `&fields=dateRange,impressions,clicks,costInUsd,externalWebsiteConversions,pivotValues`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202401' } }
  )

  if (!res.ok) {
    await log(db, jobId, conn.organization_id as string, 'error',
      'LinkedIn Analytics API call failed', { status: res.status })
    throw new Error(`LinkedIn Analytics API error ${res.status}`)
  }

  const json = await res.json() as { elements: Record<string, unknown>[] }

  const { data: campaignRows } = await db
    .from('campaigns')
    .select('id, platform_campaign_id')
    .eq('platform_connection_id', conn.id as string)
  const campaignMap = new Map((campaignRows ?? []).map((r: Record<string, string>) => [r.platform_campaign_id, r.id]))

  let synced = 0
  for (const row of json.elements ?? []) {
    const pivotValues = row.pivotValues as string[]
    const campaignUrn = pivotValues?.[0] ?? ''
    const campaignPlatformId = campaignUrn.split(':').pop() ?? ''
    const campaignId = campaignMap.get(campaignPlatformId)
    if (!campaignId) continue

    const dr = row.dateRange as Record<string, Record<string, number>>
    const s  = dr?.start
    const date = s ? `${s.year}-${String(s.month).padStart(2,'0')}-${String(s.day).padStart(2,'0')}` : null
    if (!date) continue

    const impressions = (row.impressions as number) ?? 0
    const clicks      = (row.clicks as number) ?? 0
    const spend       = parseFloat((row.costInUsd as string | number | null)?.toString() ?? '0')

    await upsertMetric(db, {
      p_organization_id:  conn.organization_id,
      p_client_id:        conn.client_id,
      p_campaign_id:      campaignId,
      p_ad_group_id:      null,
      p_ad_id:            null,
      p_platform:         'linkedin_ads',
      p_date:             date,
      p_impressions:      impressions,
      p_clicks:           clicks,
      p_spend:            spend,
      p_conversions:      (row.externalWebsiteConversions as number) ?? 0,
      p_conversion_value: 0,
      p_ctr:              impressions > 0 ? clicks / impressions : 0,
      p_cpc:              clicks > 0 ? spend / clicks : 0,
      p_cpm:              impressions > 0 ? spend / impressions * 1000 : 0,
      p_platform_data:    row,
    })
    synced++
  }

  return synced
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  let jobId: string | undefined

  try {
    const body = await req.json() as {
      sync_job_id: string
      platform_connection_id: string
      job_type: string
    }

    jobId = body.sync_job_id
    const days = body.job_type === 'full' ? 90 : 7

    const { data: conn, error: connErr } = await db
      .from('platform_connections')
      .select('id,organization_id,client_id,platform,access_token_encrypted,metadata')
      .eq('id', body.platform_connection_id)
      .single()

    if (connErr || !conn) throw new Error('Connection not found')

    const encKey      = await getEncryptionKey()
    const accessToken = await decryptToken(conn.access_token_encrypted as string, encKey)

    await log(db, jobId, conn.organization_id as string, 'info',
      `Syncing metrics for last ${days} days on ${conn.platform}`)

    let metricsSynced = 0
    if (conn.platform === 'google_ads') {
      metricsSynced = await syncGoogleAdsMetrics(db, conn as Record<string, unknown>, jobId, accessToken, days)
    } else if (conn.platform === 'meta_ads') {
      metricsSynced = await syncMetaMetrics(db, conn as Record<string, unknown>, jobId, accessToken, days)
    } else if (conn.platform === 'linkedin_ads') {
      metricsSynced = await syncLinkedInMetrics(db, conn as Record<string, unknown>, jobId, accessToken, days)
    } else if (conn.platform === 'ga4') {
      await log(db, jobId, conn.organization_id as string, 'info',
        'GA4 metrics sync not yet implemented — use GA4 Data API')
    }

    // Update job metrics count
    await db.from('sync_jobs').update({ metrics_synced: metricsSynced }).eq('id', jobId)

    await log(db, jobId, conn.organization_id as string, 'info',
      `Metrics sync complete: ${metricsSynced} rows upserted`)

    return new Response(
      JSON.stringify({ success: true, metrics_synced: metricsSynced }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('sync-metrics error:', err)
    if (jobId) {
      await db.from('sync_jobs').update({
        records_failed: 1,
        error_summary:  err instanceof Error ? err.message : 'Metrics sync failed',
      }).eq('id', jobId).catch(console.error)
    }
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Metrics sync failed' }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
