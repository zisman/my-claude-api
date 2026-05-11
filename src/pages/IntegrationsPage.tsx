import { useState } from 'react'
import { Plug, CheckCircle, XCircle, Clock, RefreshCw, Link2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useClients } from '@/hooks/useClients'
import { getGoogleOAuthUrl } from '@/lib/integrations/google-ads/oauth'
import { getMetaOAuthUrl } from '@/lib/integrations/meta-ads/oauth'
import { getLinkedInOAuthUrl } from '@/lib/integrations/linkedin-ads/oauth'
import type { PlatformType, ConnectionStatus } from '@/types'

interface PlatformCard {
  id: PlatformType
  name: string
  description: string
  color: string
  logoText: string
  features: string[]
  getOAuthUrl?: (state: string) => string
  comingSoon?: boolean
}

const PLATFORMS: PlatformCard[] = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Search, Display, Shopping, YouTube and Performance Max campaigns.',
    color: 'text-blue-600 bg-blue-50',
    logoText: 'G',
    features: ['Campaign sync', 'Keyword metrics', 'Quality Score', 'Conversion tracking'],
    getOAuthUrl: (state) => getGoogleOAuthUrl(state),
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Website traffic, user behavior, and conversion funnel analytics.',
    color: 'text-orange-600 bg-orange-50',
    logoText: 'GA',
    features: ['Session data', 'Conversion events', 'Audience segments', 'Attribution'],
    getOAuthUrl: (state) => getGoogleOAuthUrl(state + '_ga4'),
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Facebook and Instagram campaigns across all ad formats.',
    color: 'text-indigo-600 bg-indigo-50',
    logoText: 'M',
    features: ['Campaign sync', 'Ad set metrics', 'Audience insights', 'Pixel events'],
    getOAuthUrl: (state) => getMetaOAuthUrl(state),
  },
  {
    id: 'linkedin_ads',
    name: 'LinkedIn Ads',
    description: 'Sponsored content, InMail, and lead generation campaigns.',
    color: 'text-sky-600 bg-sky-50',
    logoText: 'in',
    features: ['Campaign sync', 'Demographic metrics', 'Lead gen forms', 'Company targeting'],
    getOAuthUrl: (state) => getLinkedInOAuthUrl(state),
  },
]

function ConnectionStatus({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { icon: CheckCircle, label: 'Connected', color: 'text-emerald-600' },
    disconnected: { icon: XCircle, label: 'Not connected', color: 'text-slate-400' },
    error: { icon: XCircle, label: 'Error', color: 'text-red-500' },
    pending: { icon: Clock, label: 'Pending', color: 'text-amber-500' },
  }[status]

  const { icon: Icon, label, color } = config

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  )
}

export function IntegrationsPage() {
  const { data: clients = [] } = useClients()
  const [selectedClient, setSelectedClient] = useState<string>(clients[0]?.id ?? '')
  const [connecting, setConnecting] = useState<string | null>(null)

  const handleConnect = (platform: PlatformCard, clientId: string) => {
    if (!platform.getOAuthUrl) return
    setConnecting(platform.id)

    // Store client context for OAuth callback
    sessionStorage.setItem('oauth_client_id', clientId)
    sessionStorage.setItem('oauth_platform', platform.id)

    const state = `${clientId}:${platform.id}:${Date.now()}`
    window.location.href = platform.getOAuthUrl(state)
  }

  return (
    <div>
      <Header title="Integrations" subtitle="Connect advertising platforms to start syncing campaign data" />

      <div className="p-8 space-y-8">
        {/* Client selector */}
        {clients.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Connecting for client:</span>
            <div className="flex gap-2 flex-wrap">
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClient(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedClient === c.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platform cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLATFORMS.map(platform => (
            <Card key={platform.id}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold ${platform.color}`}>
                    {platform.logoText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{platform.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs">{platform.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1">
                  {platform.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-500">
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between pt-2 border-t">
                  <ConnectionStatus status="disconnected" />
                  {platform.comingSoon ? (
                    <Badge variant="secondary">Coming Soon</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!selectedClient || connecting === platform.id}
                      onClick={() => selectedClient && handleConnect(platform, selectedClient)}
                    >
                      {connecting === platform.id ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
                      ) : (
                        <><Link2 className="w-3.5 h-3.5" /> Connect</>
                      )}
                    </Button>
                  )}
                </div>

                {!selectedClient && (
                  <p className="text-xs text-amber-600">Select a client above to connect this platform.</p>
                )}

                {/* TODO: Show actual connection status from platform_connections table */}
                <div className="text-xs text-slate-400 bg-slate-50 rounded-md p-2">
                  <strong>Setup required:</strong> Configure OAuth credentials in your environment variables
                  {platform.id === 'google_ads' && ' (VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_REDIRECT_URI)'}
                  {platform.id === 'ga4' && ' (VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_REDIRECT_URI)'}
                  {platform.id === 'meta_ads' && ' (VITE_META_APP_ID, VITE_META_REDIRECT_URI)'}
                  {platform.id === 'linkedin_ads' && ' (VITE_LINKEDIN_CLIENT_ID, VITE_LINKEDIN_REDIRECT_URI)'}
                  . Token exchange happens in Supabase Edge Functions to keep secrets server-side.
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
