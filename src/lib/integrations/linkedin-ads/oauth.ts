// TODO: Set VITE_LINKEDIN_CLIENT_ID and VITE_LINKEDIN_REDIRECT_URI in your environment
// LinkedIn Marketing API OAuth 2.0

const CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI ?? `${window.location.origin}/oauth/callback/linkedin`

const SCOPES = ['r_ads', 'r_ads_reporting', 'rw_ads', 'r_organization_social']

export function getLinkedInOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: SCOPES.join(' '),
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

export async function exchangeLinkedInCode(code: string): Promise<{
  access_token: string
  expires_in: number
  refresh_token?: string
}> {
  // TODO: Exchange must happen server-side via Supabase Edge Function
  const response = await fetch('/functions/v1/linkedin-oauth-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })
  if (!response.ok) throw new Error('Failed to exchange LinkedIn OAuth code')
  return response.json()
}
