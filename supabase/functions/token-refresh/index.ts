/**
 * token-refresh — POST /functions/v1/token-refresh
 *
 * Refreshes an expired access token using the stored refresh token.
 * Called automatically before sync if the token will expire within 5 minutes,
 * or triggered manually when the user clicks "Re-authorize" for Meta
 * (which uses long-lived tokens instead of refresh tokens).
 *
 * Request body:
 *   { connection_id }
 *
 * Response:
 *   { success: true }
 *
 * Required secrets:
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *   META_APP_ID, META_APP_SECRET
 *   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
 *   TOKEN_ENCRYPTION_KEY
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

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

async function encryptToken(token: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(token)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  const combined = new Uint8Array(12 + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), 12)
  return btoa(String.fromCharCode(...combined))
}

// ─── Platform refresh logic ───────────────────────────────────────────────────

interface RefreshResult {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

async function refreshGoogleToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Google token refresh failed: ${body.error_description ?? res.statusText}`)
  }
  const json = await res.json()
  return {
    accessToken:  json.access_token,
    refreshToken: json.refresh_token ?? null, // Google may rotate refresh token
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  }
}

async function refreshMetaToken(accessToken: string): Promise<RefreshResult> {
  // Meta uses long-lived tokens (60 days) — exchange short-lived for long-lived
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         Deno.env.get('META_APP_ID')!,
    client_secret:     Deno.env.get('META_APP_SECRET')!,
    fb_exchange_token: accessToken,
  })
  const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Meta token refresh failed: ${body.error?.message ?? res.statusText}`)
  }
  const json = await res.json()
  return {
    accessToken:  json.access_token,
    refreshToken: null,
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  }
}

async function refreshLinkedInToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     Deno.env.get('LINKEDIN_CLIENT_ID')!,
      client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET')!,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`LinkedIn token refresh failed: ${body.error_description ?? res.statusText}`)
  }
  const json = await res.json()
  return {
    accessToken:  json.access_token,
    refreshToken: json.refresh_token ?? refreshToken, // keep old if not rotated
    expiresAt:    json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  }
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

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const { connection_id } = await req.json() as { connection_id: string }
    if (!connection_id) {
      return new Response(JSON.stringify({ message: 'connection_id required' }), { status: 400, headers: CORS_HEADERS })
    }

    // Fetch connection (service role — tokens are encrypted server-side only)
    const { data: conn, error: fetchErr } = await db
      .from('platform_connections')
      .select('id, platform, access_token_encrypted, refresh_token_encrypted, status')
      .eq('id', connection_id)
      .single()

    if (fetchErr || !conn) {
      return new Response(JSON.stringify({ message: 'Connection not found' }), { status: 404, headers: CORS_HEADERS })
    }

    const encKey = await getEncryptionKey()

    let result: RefreshResult

    if (conn.platform === 'google_ads' || conn.platform === 'ga4') {
      if (!conn.refresh_token_encrypted) {
        throw new Error('No refresh token stored — user must re-authorize')
      }
      const refreshToken = await decryptToken(conn.refresh_token_encrypted, encKey)
      result = await refreshGoogleToken(refreshToken)
    } else if (conn.platform === 'meta_ads') {
      if (!conn.access_token_encrypted) throw new Error('No access token stored')
      const accessToken = await decryptToken(conn.access_token_encrypted, encKey)
      result = await refreshMetaToken(accessToken)
    } else if (conn.platform === 'linkedin_ads') {
      if (!conn.refresh_token_encrypted) {
        throw new Error('No refresh token stored — user must re-authorize')
      }
      const refreshToken = await decryptToken(conn.refresh_token_encrypted, encKey)
      result = await refreshLinkedInToken(refreshToken)
    } else {
      return new Response(JSON.stringify({ message: `Unsupported platform: ${conn.platform}` }), { status: 400, headers: CORS_HEADERS })
    }

    // Re-encrypt and store
    const encAccess  = await encryptToken(result.accessToken, encKey)
    const encRefresh = result.refreshToken ? await encryptToken(result.refreshToken, encKey) : conn.refresh_token_encrypted

    const { error: updateErr } = await db
      .from('platform_connections')
      .update({
        access_token_encrypted:  encAccess,
        refresh_token_encrypted: encRefresh,
        token_expires_at:        result.expiresAt?.toISOString() ?? null,
        status:                  'connected',
        error_code:              null,
        error_message:           null,
        updated_at:              new Date().toISOString(),
      })
      .eq('id', connection_id)

    if (updateErr) {
      console.error('Failed to update tokens:', updateErr)
      throw new Error('Failed to persist refreshed tokens')
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('token-refresh error:', err)

    // Mark connection as error so UI can prompt re-authorization
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const body        = await (req.clone().json().catch(() => ({}))) as { connection_id?: string }
    if (supabaseUrl && serviceKey && body.connection_id) {
      const db = createClient(supabaseUrl, serviceKey)
      await db.from('platform_connections').update({
        status:        'error',
        error_code:    'token_refresh_failed',
        error_message: err instanceof Error ? err.message : 'Token refresh failed',
      }).eq('id', body.connection_id)
    }

    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Token refresh failed' }),
      { status: 500, headers: CORS_HEADERS }
    )
  }
})
