// TODO: Set VITE_META_APP_ID and VITE_META_REDIRECT_URI in your environment
// Meta Marketing API OAuth 2.0 — requires Facebook App with Marketing API permission

const APP_ID = import.meta.env.VITE_META_APP_ID
const REDIRECT_URI = import.meta.env.VITE_META_REDIRECT_URI ?? `${window.location.origin}/oauth/callback/meta`

const SCOPES = ['ads_read', 'ads_management', 'read_insights', 'business_management']

export function getMetaOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(','),
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`
}

export async function exchangeMetaCode(code: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  // TODO: Exchange must happen server-side via Supabase Edge Function
  const response = await fetch('/functions/v1/meta-oauth-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })
  if (!response.ok) throw new Error('Failed to exchange Meta OAuth code')
  return response.json()
}
