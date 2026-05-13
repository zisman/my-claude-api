// GA4 uses the same Google OAuth flow as Google Ads (same credentials, different scope)
// Reuses VITE_GOOGLE_CLIENT_ID

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? `${window.location.origin}/oauth/callback/google`

const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics',
]

export function getGA4OAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GA4_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export interface GA4Property {
  name: string
  displayName: string
  propertyType: string
  createTime: string
}

export interface GA4RunReportResponse {
  dimensionHeaders: { name: string }[]
  metricHeaders: { name: string; type: string }[]
  rows: {
    dimensionValues: { value: string }[]
    metricValues: { value: string }[]
  }[]
  rowCount: number
}
