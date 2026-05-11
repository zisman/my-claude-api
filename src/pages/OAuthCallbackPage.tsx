import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { exchangeOAuthCode } from '@/lib/api/connections'
import type { PlatformType } from '@/types'

type Phase = 'exchanging' | 'success' | 'error'

const PLATFORM_NAMES: Record<string, string> = {
  google: 'Google Ads / GA4',
  meta: 'Meta Ads',
  linkedin: 'LinkedIn Ads',
}

const PLATFORM_MAP: Record<string, PlatformType> = {
  google: 'google_ads',
  meta: 'meta_ads',
  linkedin: 'linkedin_ads',
  ga4: 'ga4',
}

function getRedirectUri(platform: string): string {
  return `${window.location.origin}/oauth/callback/${platform}`
}

export function OAuthCallbackPage() {
  const { platform = '' } = useParams<{ platform: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('exchanging')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const ran = useRef(false)

  useEffect(() => {
    // Strict-mode safe: only run once
    if (ran.current) return
    ran.current = true

    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      setErrorMsg(searchParams.get('error_description') ?? error)
      setPhase('error')
      return
    }

    if (!code || !state) {
      setErrorMsg('Missing authorization code or state parameter.')
      setPhase('error')
      return
    }

    // Verify state matches what we stored before the redirect
    const storedState = sessionStorage.getItem('oauth_state')
    if (storedState && storedState !== state) {
      setErrorMsg('State mismatch — possible CSRF. Please try again.')
      setPhase('error')
      return
    }

    const platformType = PLATFORM_MAP[platform]
    if (!platformType) {
      setErrorMsg(`Unknown platform: ${platform}`)
      setPhase('error')
      return
    }

    exchangeOAuthCode({
      platform: platformType,
      code,
      state,
      redirectUri: getRedirectUri(platform),
    })
      .then(() => {
        setPhase('success')
        // Clean up session storage
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_client_id')
        sessionStorage.removeItem('oauth_platform')

        // Redirect back to integrations with success indicator
        setTimeout(() => {
          navigate(`/integrations?oauth=success&platform=${platform}`, { replace: true })
        }, 1800)
      })
      .catch(err => {
        setErrorMsg(err instanceof Error ? err.message : 'Token exchange failed')
        setPhase('error')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const platformLabel = PLATFORM_NAMES[platform] ?? platform

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-4">
        {phase === 'exchanging' && (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-700 font-medium">Connecting {platformLabel}…</p>
            <p className="text-sm text-slate-400">Exchanging authorization code for access tokens</p>
          </>
        )}

        {phase === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-slate-700 font-medium">{platformLabel} connected!</p>
            <p className="text-sm text-slate-400">Redirecting you back to integrations…</p>
          </>
        )}

        {phase === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <p className="text-slate-700 font-medium">Authorization failed</p>
            <p className="text-sm text-red-500">{errorMsg}</p>
            <button
              onClick={() => navigate('/integrations?oauth=error', { replace: true })}
              className="text-sm text-blue-500 hover:underline mt-2"
            >
              Return to Integrations
            </button>
          </>
        )}
      </div>
    </div>
  )
}
