// TODO: Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_REDIRECT_URI in your environment
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}/oauth/callback/google`

const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/analytics.readonly',
]

export function getGoogleOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeGoogleCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
}> {
  // TODO: This exchange must happen server-side (Supabase Edge Function) to keep client_secret safe.
  // Call your edge function: POST /functions/v1/google-oauth-exchange
  const response = await fetch('/functions/v1/google-oauth-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })
  if (!response.ok) throw new Error('Failed to exchange Google OAuth code')
  return response.json()
}
