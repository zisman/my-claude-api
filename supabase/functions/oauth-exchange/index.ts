/**
 * oauth-exchange — POST /functions/v1/oauth-exchange
 *
 * Exchanges an OAuth authorization code for access + refresh tokens,
 * fetches the platform account name, and persists the connection to DB.
 *
 * Request body:
 *   { platform, code, state, redirectUri }
 *
 * Response:
 *   { connectionId, accountName }
 *
 * Required secrets (set via `supabase secrets set`):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   META_APP_ID, META_APP_SECRET
 *   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 *   TOKEN_ENCRYPTION_KEY  (32-byte base64 key for AES-GCM)
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Encryption (AES-GCM) ─────────────────────────────────────────────────────

async function getEncryptionKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY not set')
  const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptToken(token: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(token)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(12 + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), 12)
  return btoa(String.fromCharCode(...combined))
}

// ─── Platform token exchange ──────────────────────────────────────────────────

interface TokenResult {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
}

interface AccountInfo {
  accountId: string
  accountName: string
}

async function exchangeGoogle(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Google token exchange failed: ${body.error_description ?? res.statusText}`)
  }
  const json = await res.json()
  return {
    accessToken:  json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scopes:       (json.scope ?? '').split(' ').filter(Boolean),
  }
}

async function exchangeMeta(code: string, redirectUri: string): Promise<TokenResult> {
  const params = new URLSearchParams({
    client_id:     Deno.env.get('META_APP_ID')!,
    client_secret: Deno.env.get('META_APP_SECRET')!,
    redirect_uri:  redirectUri,
    code,
  })
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Meta token exchange failed: ${body.error?.message ?? res.statusText}`)
  }
  const json = await res.json()
  return {
    accessToken:  json.access_token,
    refreshToken: null, // Meta uses long-lived tokens, no refresh token
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scopes:       [],
  }
}

async function exchangeLinkedIn(code: string, redirectUri: string): Promise<TokenResult> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      client_id:     Deno.env.get('LINKEDIN_CLIENT_ID')!,
      client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET')!,
      redirect_uri:  redirectUri,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`LinkedIn token exchange failed: ${body.error_description ?? res.statusText}`)
  }
  const json = await res.json()
  return {
    accessToken:  json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    scopes:       [],
  }
}

// ─── Account info fetch ───────────────────────────────────────────────────────

async function fetchGoogleAccountInfo(accessToken: string): Promise<AccountInfo> {
  // Fetch Google Ads customer list to get account name
  const res = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) return { accountId: '', accountName: 'Google Account' }
  const json = await res.json()
  return { accountId: json.id ?? '', accountName: json.email ?? json.name ?? 'Google Account' }
}

async function fetchMetaAccountInfo(accessToken: string): Promise<AccountInfo> {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`
  )
  if (!res.ok) return { accountId: '', accountName: 'Meta Account' }
  const json = await res.json()
  return { accountId: json.id ?? '', accountName: json.name ?? 'Meta Account' }
}

async function fetchLinkedInAccountInfo(accessToken: string): Promise<AccountInfo> {
  const res = await fetch('https://api.linkedin.com/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return { accountId: '', accountName: 'LinkedIn Account' }
  const json = await res.json()
  const name = [json.localizedFirstName, json.localizedLastName].filter(Boolean).join(' ')
  return { accountId: json.id ?? '', accountName: name || 'LinkedIn Account' }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
    }

    const supabaseUrl    = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userToken      = authHeader.slice(7)

    // User-scoped client to get user identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${userToken}` } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: CORS_HEADERS })
    }

    const db = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()
    const { platform, code, state, redirectUri } = body as {
      platform: string; code: string; state: string; redirectUri: string
    }

    if (!platform || !code || !state || !redirectUri) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400, headers: CORS_HEADERS })
    }

    // Look up the pending connection by oauth_state (CSRF check)
    const { data: conn, error: connError } = await db
      .from('platform_connections')
      .select('id, client_id, organization_id, platform')
      .eq('oauth_state', state)
      .eq('platform', platform === 'google' ? 'google_ads' : platform === 'ga4' ? 'ga4' : platform === 'meta' ? 'meta_ads' : 'linkedin_ads')
      .maybeSingle()

    if (connError || !conn) {
      return new Response(
        JSON.stringify({ message: 'Invalid state — connection not found or state mismatch' }),
        { status: 400, headers: CORS_HEADERS }
      )
    }

    // Exchange code for tokens
    let tokens: TokenResult
    let accountInfo: AccountInfo

    if (platform === 'google' || platform === 'ga4') {
      tokens = await exchangeGoogle(code, redirectUri)
      accountInfo = await fetchGoogleAccountInfo(tokens.accessToken)
    } else if (platform === 'meta') {
      tokens = await exchangeMeta(code, redirectUri)
      accountInfo = await fetchMetaAccountInfo(tokens.accessToken)
    } else if (platform === 'linkedin') {
      tokens = await exchangeLinkedIn(code, redirectUri)
      accountInfo = await fetchLinkedInAccountInfo(tokens.accessToken)
    } else {
      return new Response(JSON.stringify({ message: `Unsupported platform: ${platform}` }), { status: 400, headers: CORS_HEADERS })
    }

    // Encrypt tokens
    const encKey = await getEncryptionKey()
    const encAccess  = await encryptToken(tokens.accessToken, encKey)
    const encRefresh = tokens.refreshToken ? await encryptToken(tokens.refreshToken, encKey) : null

    // Update the connection row
    const { error: updateError } = await db
      .from('platform_connections')
      .update({
        status:                    'connected',
        access_token_encrypted:    encAccess,
        refresh_token_encrypted:   encRefresh,
        token_expires_at:          tokens.expiresAt?.toISOString() ?? null,
        scopes:                    tokens.scopes,
        display_name:              accountInfo.accountName,
        oauth_state:               null, // clear after successful exchange
        error_code:                null,
        error_message:             null,
        updated_at:                new Date().toISOString(),
      })
      .eq('id', conn.id)

    if (updateError) {
      console.error('Failed to update connection:', updateError)
      return new Response(JSON.stringify({ message: 'Failed to persist connection' }), { status: 500, headers: CORS_HEADERS })
    }

    // Kick off an initial incremental sync asynchronously
    EdgeRuntime.waitUntil?.(
      fetch(`${supabaseUrl}/functions/v1/sync-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          platform_connection_id: conn.id,
          job_type: 'incremental',
          triggered_by: 'system',
        }),
      }).catch(console.error)
    )

    return new Response(
      JSON.stringify({ connectionId: conn.id, accountName: accountInfo.accountName }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('oauth-exchange error:', err)
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
