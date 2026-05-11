/**
 * sync-campaigns — POST /functions/v1/sync-campaigns
 *
 * Fetches campaigns (and ad groups/ads for full syncs) from the platform API
 * and upserts them into the DB. Called by sync-trigger.
 *
 * Request body:
 *   { sync_job_id, platform_connection_id, job_type }
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
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

// ─── Logger ───────────────────────────────────────────────────────────────────

async function log(
  db: ReturnType<typeof createClient>,
  jobId: string,
  orgId: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  details: Record<string, unknown> = {}
) {
  await db.from('sync_job_logs').insert({
    sync_job_id:     jobId,
    organization_id: orgId,
    level,
    message,
    details,
  })
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function normalizeCampaignStatus(raw: string): string {
  const s = raw.toUpperCase()
  if (s === 'ENABLED' || s === 'ACTIVE') return 'active'
  if (s === 'PAUSED')  return 'paused'
  if (s === 'REMOVED' || s === 'DELETED') return 'ended'
  return 'paused'
}

// ─── Google Ads sync ──────────────────────────────────────────────────────────

interface GoogleCampaign {
  campaign: {
    resourceName: string
    id: string
    name: string
    status: string
    advertisingChannelType: string
    startDate: string
    endDate: string
    campaignBudget: string
  }
  campaignBudget?: {
    amountMicros: string
  }
}

async function syncGoogleAdsCampaigns(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string
): Promise<number> {
  const customerId = (conn.metadata as { customer_id?: string })?.customer_id
  if (!customerId) {
    await log(db, jobId, conn.organization_id as string, 'warning',
      'No Google Ads customer_id in connection metadata — skipping campaign sync')
    return 0
  }

  const query = `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign.advertising_channel_type, campaign.start_date, campaign.end_date,
           campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization:       `Bearer ${accessToken}`,
        'developer-token':   Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? '',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )

  if (!res.ok) {
    const body = await res.text()
    await log(db, jobId, conn.organization_id as string, 'error',
      'Google Ads API call failed', { status: res.status, body })
    throw new Error(`Google Ads API error ${res.status}`)
  }

  const responses: { results?: GoogleCampaign[] }[] = await res.json()
  const campaigns: GoogleCampaign[] = responses.flatMap(r => r.results ?? [])

  let synced = 0
  for (const row of campaigns) {
    const c = row.campaign
    const budgetMicros = parseInt(row.campaignBudget?.amountMicros ?? '0', 10)

    const { error } = await db.from('campaigns').upsert(
      {
        organization_id:        conn.organization_id,
        client_id:              conn.client_id,
        platform_connection_id: conn.id,
        platform:               'google_ads',
        platform_campaign_id:   c.id,
        name:                   c.name,
        status:                 normalizeCampaignStatus(c.status),
        campaign_type:          c.advertisingChannelType?.toLowerCase() ?? null,
        start_date:             c.startDate || null,
        end_date:               c.endDate || null,
        daily_budget:           budgetMicros ? budgetMicros / 1_000_000 : null,
        currency:               'USD',
        platform_metadata:      c,
        updated_at:             new Date().toISOString(),
      },
      { onConflict: 'platform_connection_id,platform_campaign_id' }
    )

    if (error) {
      await log(db, jobId, conn.organization_id as string, 'warning',
        `Failed to upsert campaign ${c.id}`, { error: error.message })
    } else {
      synced++
    }
  }

  return synced
}

// ─── Meta Ads sync ────────────────────────────────────────────────────────────

async function syncMetaCampaigns(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string
): Promise<number> {
  const adAccountId = (conn.metadata as { ad_account_id?: string })?.ad_account_id
  if (!adAccountId) {
    await log(db, jobId, conn.organization_id as string, 'warning',
      'No Meta ad_account_id in connection metadata — skipping campaign sync')
    return 0
  }

  const fields = 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time'
  const res = await fetch(
    `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?fields=${fields}&access_token=${accessToken}&limit=200`
  )

  if (!res.ok) {
    const body = await res.text()
    await log(db, jobId, conn.organization_id as string, 'error',
      'Meta Graph API call failed', { status: res.status, body })
    throw new Error(`Meta API error ${res.status}`)
  }

  const json = await res.json() as { data: Record<string, unknown>[] }
  let synced = 0

  for (const c of json.data ?? []) {
    const { error } = await db.from('campaigns').upsert(
      {
        organization_id:        conn.organization_id,
        client_id:              conn.client_id,
        platform_connection_id: conn.id,
        platform:               'meta_ads',
        platform_campaign_id:   c.id as string,
        name:                   c.name as string,
        status:                 normalizeCampaignStatus((c.status as string) ?? ''),
        objective:              (c.objective as string | null) ?? null,
        daily_budget:           c.daily_budget ? Number(c.daily_budget) / 100 : null,
        total_budget:           c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        currency:               'USD',
        start_date:             c.start_time ? (c.start_time as string).slice(0, 10) : null,
        end_date:               c.stop_time  ? (c.stop_time  as string).slice(0, 10) : null,
        platform_metadata:      c,
        updated_at:             new Date().toISOString(),
      },
      { onConflict: 'platform_connection_id,platform_campaign_id' }
    )

    if (error) {
      await log(db, jobId, conn.organization_id as string, 'warning',
        `Failed to upsert Meta campaign ${c.id}`, { error: error.message })
    } else {
      synced++
    }
  }

  return synced
}

// ─── LinkedIn Ads sync ────────────────────────────────────────────────────────

async function syncLinkedInCampaigns(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string
): Promise<number> {
  const accountId = (conn.metadata as { account_id?: string })?.account_id
  if (!accountId) {
    await log(db, jobId, conn.organization_id as string, 'warning',
      'No LinkedIn account_id in connection metadata — skipping campaign sync')
    return 0
  }

  const res = await fetch(
    `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${accountId}&count=100`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202401' } }
  )

  if (!res.ok) {
    const body = await res.text()
    await log(db, jobId, conn.organization_id as string, 'error',
      'LinkedIn API call failed', { status: res.status, body })
    throw new Error(`LinkedIn API error ${res.status}`)
  }

  const json = await res.json() as { elements: Record<string, unknown>[] }
  let synced = 0

  for (const c of json.elements ?? []) {
    const id = ((c.id as string | number) ?? '').toString()
    const { error } = await db.from('campaigns').upsert(
      {
        organization_id:        conn.organization_id,
        client_id:              conn.client_id,
        platform_connection_id: conn.id,
        platform:               'linkedin_ads',
        platform_campaign_id:   id,
        name:                   c.name as string,
        status:                 normalizeCampaignStatus((c.status as string) ?? ''),
        objective:              (c.objectiveType as string | null) ?? null,
        daily_budget:           (c as Record<string, unknown>).dailyBudget
                                  ? Number(((c as Record<string, unknown>).dailyBudget as Record<string, unknown>).amount) : null,
        currency:               ((c as Record<string, unknown>).dailyBudget as Record<string, unknown>)?.currencyCode as string ?? 'USD',
        platform_metadata:      c,
        updated_at:             new Date().toISOString(),
      },
      { onConflict: 'platform_connection_id,platform_campaign_id' }
    )

    if (error) {
      await log(db, jobId, conn.organization_id as string, 'warning',
        `Failed to upsert LinkedIn campaign ${id}`, { error: error.message })
    } else {
      synced++
    }
  }

  return synced
}

// ─── GA4 sync ─────────────────────────────────────────────────────────────────

async function syncGA4Properties(
  db: ReturnType<typeof createClient>,
  conn: Record<string, unknown>,
  jobId: string,
  accessToken: string
): Promise<number> {
  // GA4 doesn't have "campaigns" — we store properties as metadata
  // Actual report data is synced by sync-metrics
  const res = await fetch(
    'https://analyticsadmin.googleapis.com/v1beta/properties',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    await log(db, jobId, conn.organization_id as string, 'warning',
      'Could not list GA4 properties — check OAuth scopes')
    return 0
  }
  const json = await res.json() as { properties?: Record<string, unknown>[] }
  await log(db, jobId, conn.organization_id as string, 'info',
    `Found ${json.properties?.length ?? 0} GA4 properties`,
    { properties: json.properties?.map(p => p.displayName) })
  return 0 // No campaign rows for GA4
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  let jobId: string | undefined
  let orgId: string | undefined

  try {
    const body = await req.json() as {
      sync_job_id: string
      platform_connection_id: string
      job_type: string
    }

    jobId = body.sync_job_id
    if (!jobId || !body.platform_connection_id) {
      return new Response(JSON.stringify({ message: 'sync_job_id and platform_connection_id required' }), { status: 400 })
    }

    // Mark job running
    await db.from('sync_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId)

    // Fetch connection with encrypted tokens (service role access)
    const { data: conn, error: connErr } = await db
      .from('platform_connections')
      .select('id,organization_id,client_id,platform,access_token_encrypted,metadata')
      .eq('id', body.platform_connection_id)
      .single()

    if (connErr || !conn) throw new Error(`Connection not found: ${body.platform_connection_id}`)
    orgId = conn.organization_id as string

    await log(db, jobId, orgId, 'info', `Starting ${body.job_type} sync for ${conn.platform}`)

    // Decrypt access token
    const encKey      = await getEncryptionKey()
    const accessToken = await decryptToken(conn.access_token_encrypted as string, encKey)

    // Platform-specific sync
    let campaignsSynced = 0
    if (conn.platform === 'google_ads') {
      campaignsSynced = await syncGoogleAdsCampaigns(db, conn as Record<string, unknown>, jobId, accessToken)
    } else if (conn.platform === 'meta_ads') {
      campaignsSynced = await syncMetaCampaigns(db, conn as Record<string, unknown>, jobId, accessToken)
    } else if (conn.platform === 'linkedin_ads') {
      campaignsSynced = await syncLinkedInCampaigns(db, conn as Record<string, unknown>, jobId, accessToken)
    } else if (conn.platform === 'ga4') {
      campaignsSynced = await syncGA4Properties(db, conn as Record<string, unknown>, jobId, accessToken)
    }

    await log(db, jobId, orgId, 'info', `Sync complete: ${campaignsSynced} campaigns upserted`)

    // Mark job success
    await db.from('sync_jobs').update({
      status:           'success',
      completed_at:     new Date().toISOString(),
      campaigns_synced: campaignsSynced,
    }).eq('id', jobId)

    // Update last_synced_at on the connection
    await db.from('platform_connections').update({
      last_synced_at: new Date().toISOString(),
      error_code:     null,
      error_message:  null,
    }).eq('id', body.platform_connection_id)

    return new Response(
      JSON.stringify({ success: true, campaigns_synced: campaignsSynced }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('sync-campaigns error:', err)

    if (jobId) {
      await db.from('sync_jobs').update({
        status:        'failed',
        completed_at:  new Date().toISOString(),
        error_summary: err instanceof Error ? err.message : 'Unknown error',
      }).eq('id', jobId).catch(console.error)

      if (orgId) {
        await log(db, jobId, orgId, 'error',
          `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        ).catch(console.error)
      }
    }

    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Sync failed' }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
