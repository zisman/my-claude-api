import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Clock, RefreshCw, Link2, Unlink,
  AlertTriangle, RotateCcw, ChevronDown, ChevronUp, Settings,
  CalendarClock, Zap
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useClients } from '@/hooks/useClients'
import { useConnections, useDisconnect, useTriggerSync, useRefreshToken, useToggleSync } from '@/hooks/useConnections'
import { useAuth } from '@/contexts/AuthContext'
import { initiateOAuthConnection } from '@/lib/api/connections'
import { getGoogleOAuthUrl } from '@/lib/integrations/google-ads/oauth'
import { getGA4OAuthUrl } from '@/lib/integrations/ga4/oauth'
import { getMetaOAuthUrl } from '@/lib/integrations/meta-ads/oauth'
import { getLinkedInOAuthUrl } from '@/lib/integrations/linkedin-ads/oauth'
import type { PlatformType } from '@/types'
import type { PlatformConnectionRow, SyncJobRow } from '@/lib/api/connections'

// ─── Platform config ──────────────────────────────────────────────────────────

interface PlatformConfig {
  id: PlatformType
  name: string
  icon: string
  iconBg: string
  iconText: string
  description: string
  features: string[]
  scopes: string[]
  getOAuthUrl: (state: string) => string
  docsUrl: string
  envVars: string[]
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    icon: 'G',
    iconBg: 'bg-blue-50 text-blue-600',
    iconText: 'G',
    description: 'Search, Display, Shopping, YouTube and Performance Max campaigns.',
    features: ['Campaign sync', 'Keyword metrics', 'Quality Score', 'Conversion tracking', 'Budget pacing'],
    scopes: ['https://www.googleapis.com/auth/adwords'],
    getOAuthUrl: getGoogleOAuthUrl,
    docsUrl: 'https://developers.google.com/google-ads/api',
    envVars: ['VITE_GOOGLE_CLIENT_ID', 'VITE_GOOGLE_REDIRECT_URI', 'GOOGLE_CLIENT_SECRET'],
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    icon: 'GA',
    iconBg: 'bg-orange-50 text-orange-600',
    iconText: 'GA',
    description: 'Website traffic, user behavior, and conversion funnel analytics.',
    features: ['Session data', 'Conversion events', 'Audience segments', 'Attribution', 'Funnel reports'],
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    getOAuthUrl: getGA4OAuthUrl,
    docsUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    envVars: ['VITE_GOOGLE_CLIENT_ID', 'VITE_GOOGLE_REDIRECT_URI', 'GOOGLE_CLIENT_SECRET'],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    icon: 'M',
    iconBg: 'bg-indigo-50 text-indigo-600',
    iconText: 'M',
    description: 'Facebook and Instagram campaigns across all ad formats.',
    features: ['Campaign sync', 'Ad set metrics', 'Audience insights', 'Pixel events', 'Creative performance'],
    scopes: ['ads_read', 'ads_management', 'read_insights'],
    getOAuthUrl: getMetaOAuthUrl,
    docsUrl: 'https://developers.facebook.com/docs/marketing-api',
    envVars: ['VITE_META_APP_ID', 'VITE_META_REDIRECT_URI', 'META_APP_SECRET'],
  },
  {
    id: 'linkedin_ads',
    name: 'LinkedIn Ads',
    icon: 'in',
    iconBg: 'bg-sky-50 text-sky-700',
    iconText: 'in',
    description: 'Sponsored content, InMail, and lead generation campaigns.',
    features: ['Campaign sync', 'Demographic metrics', 'Lead gen forms', 'Company targeting', 'Conversation ads'],
    scopes: ['r_ads', 'r_ads_reporting', 'rw_ads'],
    getOAuthUrl: getLinkedInOAuthUrl,
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing',
    envVars: ['VITE_LINKEDIN_CLIENT_ID', 'VITE_LINKEDIN_REDIRECT_URI', 'LINKEDIN_CLIENT_SECRET'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function isTokenExpired(conn: PlatformConnectionRow): boolean {
  if (!conn.token_expires_at) return false
  return new Date(conn.token_expires_at) < new Date()
}

function isSyncing(job: SyncJobRow | null): boolean {
  return !!job && (job.status === 'pending' || job.status === 'queued' || job.status === 'running')
}

// ─── Status badge ─────────────────────────────────────────────────────────────

interface StatusProps {
  connection: PlatformConnectionRow | undefined
  syncJob: SyncJobRow | null
}

function ConnectionStatusBadge({ connection, syncJob }: StatusProps) {
  if (!connection || connection.status === 'disconnected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        Not connected
      </span>
    )
  }

  if (isSyncing(syncJob)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Syncing…
      </span>
    )
  }

  if (connection.status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <Clock className="w-3.5 h-3.5" />
        Awaiting authorization
      </span>
    )
  }

  if (connection.status === 'revoked' || isTokenExpired(connection)) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-orange-600 font-medium">
        <AlertTriangle className="w-3.5 h-3.5" />
        Token expired — re-authorize
      </span>
    )
  }

  if (connection.status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
        <XCircle className="w-3.5 h-3.5" />
        Error
      </span>
    )
  }

  if (connection.status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Connected
        {connection.display_name && (
          <span className="text-slate-400 font-normal">· {connection.display_name}</span>
        )}
      </span>
    )
  }

  return null
}

// ─── Sync summary ─────────────────────────────────────────────────────────────

function SyncSummary({ connection, syncJob }: { connection: PlatformConnectionRow; syncJob: SyncJobRow | null }) {
  const synced = isSyncing(syncJob)

  return (
    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
      <div className="flex items-center gap-1.5">
        <CalendarClock className="w-3.5 h-3.5 text-slate-300" />
        <span>Last sync: <strong className="text-slate-700">{formatRelative(connection.last_synced_at)}</strong></span>
      </div>
      {syncJob && !synced && (
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-slate-300" />
          <span>
            {syncJob.status === 'success'
              ? `${syncJob.campaigns_synced} campaigns`
              : syncJob.status === 'failed'
              ? 'Sync failed'
              : syncJob.status}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Error panel ──────────────────────────────────────────────────────────────

function ErrorPanel({ connection }: { connection: PlatformConnectionRow }) {
  if (!connection.error_message && connection.status !== 'error') return null
  return (
    <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
      <p className="font-semibold">Connection error</p>
      <p>{connection.error_message ?? 'Unknown error. Try reconnecting.'}</p>
      {connection.error_code && (
        <code className="block font-mono text-[10px] text-red-500">{connection.error_code}</code>
      )}
    </div>
  )
}

// ─── Platform card ────────────────────────────────────────────────────────────

interface PlatformCardProps {
  platform: PlatformConfig
  connection: PlatformConnectionRow | undefined
  onConnect: () => void
  onDisconnect: () => void
  onSyncNow: (jobType?: 'full' | 'incremental') => void
  onReauthorize: () => void
  onToggleSync: (enabled: boolean) => void
  isConnecting: boolean
  isSyncLoading: boolean
  isDisconnecting: boolean
  syncJob: SyncJobRow | null
}

function PlatformCard({
  platform, connection, onConnect, onDisconnect, onSyncNow, onReauthorize,
  onToggleSync, isConnecting, isSyncLoading, isDisconnecting, syncJob,
}: PlatformCardProps) {
  const [showDetail, setShowDetail] = useState(false)

  const isConnected = connection?.status === 'connected'
  const isPending   = connection?.status === 'pending'
  const isError     = connection?.status === 'error'
  const isRevoked   = connection?.status === 'revoked' || isTokenExpired(connection!)
  const hasSyncing  = isSyncing(syncJob)

  return (
    <Card className={cn(
      'transition-all duration-150',
      isConnected && 'ring-1 ring-emerald-200',
      isError && 'ring-1 ring-red-200',
      isRevoked && 'ring-1 ring-orange-200',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0', platform.iconBg)}>
            {platform.iconText}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{platform.name}</CardTitle>
              {connection?.sync_enabled === false && isConnected && (
                <Badge variant="secondary" className="text-[10px]">Sync paused</Badge>
              )}
            </div>
            <CardDescription className="mt-0.5 text-xs leading-relaxed">{platform.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
          {platform.features.map(f => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {/* Status row */}
        <div className="flex items-center justify-between pt-3 border-t">
          <ConnectionStatusBadge connection={connection} syncJob={syncJob} />

          <div className="flex items-center gap-2">
            {/* Not connected */}
            {(!connection || connection.status === 'disconnected') && (
              <Button size="sm" variant="outline" onClick={onConnect} disabled={isConnecting}>
                {isConnecting
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
                  : <><Link2 className="w-3.5 h-3.5" /> Connect</>
                }
              </Button>
            )}

            {/* Pending */}
            {isPending && (
              <Button size="sm" variant="outline" onClick={onConnect}>
                <RotateCcw className="w-3.5 h-3.5" /> Retry auth
              </Button>
            )}

            {/* Token expired / revoked */}
            {(isRevoked) && !isError && (
              <Button size="sm" variant="outline" onClick={onReauthorize}>
                <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Re-authorize
              </Button>
            )}

            {/* Error state */}
            {isError && !isRevoked && (
              <Button size="sm" variant="outline" onClick={onConnect}>
                <RotateCcw className="w-3.5 h-3.5" /> Reconnect
              </Button>
            )}

            {/* Connected actions */}
            {isConnected && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSyncNow('incremental')}
                  disabled={isSyncLoading || hasSyncing}
                >
                  {(isSyncLoading || hasSyncing)
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5" />
                  }
                  Sync now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-600"
                  onClick={() => setShowDetail(v => !v)}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Last sync info */}
        {isConnected && connection && (
          <SyncSummary connection={connection} syncJob={syncJob} />
        )}

        {/* Error details */}
        {connection && <ErrorPanel connection={connection} />}

        {/* Expanded settings panel */}
        {showDetail && isConnected && connection && (
          <div className="pt-3 border-t space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Automatic sync</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Sync campaigns and metrics on schedule</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={connection.sync_enabled}
                  onChange={e => onToggleSync(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium">Full resync</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Re-fetch all historical data</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onSyncNow('full')} disabled={hasSyncing}>
                Full sync
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600">Disconnect</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Remove access and stop syncing</p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={onDisconnect}
                disabled={isDisconnecting}
              >
                <Unlink className="w-3.5 h-3.5" />
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </Button>
            </div>

            {/* Env var reference */}
            <div className="text-[10px] text-slate-400 bg-slate-50 rounded-md p-2 space-y-0.5">
              <p className="font-medium text-slate-500">Required env vars</p>
              {platform.envVars.map(v => (
                <code key={v} className="block font-mono">{v}</code>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { data: clients = [], isLoading: clientsLoading } = useClients()

  // Restore last-selected client from sessionStorage
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    return sessionStorage.getItem('integrations_client_id') ?? ''
  })

  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId])

  const { data: connections = [], isLoading: connectionsLoading } = useConnections(selectedClientId || undefined)
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)

  const disconnect  = useDisconnect()
  const triggerSync = useTriggerSync()
  const refreshTok  = useRefreshToken()
  const toggleSync  = useToggleSync()

  // Show success/error flash from OAuth callback
  const oauthStatus = searchParams.get('oauth')
  const oauthPlatform = searchParams.get('platform')

  const connectionByPlatform = (platform: PlatformType): PlatformConnectionRow | undefined =>
    connections.find(c => c.platform === platform)

  const handleConnect = async (platform: PlatformConfig) => {
    if (!selectedClientId || !user?.organization_id) return
    setConnectingPlatform(platform.id)
    try {
      const { state } = await initiateOAuthConnection({
        clientId: selectedClientId,
        organizationId: user.organization_id,
        platform: platform.id,
      })
      sessionStorage.setItem('oauth_state', state)
      sessionStorage.setItem('oauth_client_id', selectedClientId)
      sessionStorage.setItem('oauth_platform', platform.id)
      sessionStorage.setItem('integrations_client_id', selectedClientId)
      window.location.href = platform.getOAuthUrl(state)
    } catch (err) {
      setConnectingPlatform(null)
    }
  }

  const handleSyncNow = async (platform: PlatformConfig, jobType: 'full' | 'incremental' = 'incremental') => {
    const conn = connectionByPlatform(platform.id)
    if (!conn) return
    setSyncingPlatform(platform.id)
    try {
      await triggerSync.mutateAsync({ connectionId: conn.id, jobType })
    } finally {
      setSyncingPlatform(null)
    }
  }

  const handleDisconnect = async (platform: PlatformConfig) => {
    const conn = connectionByPlatform(platform.id)
    if (!conn) return
    await disconnect.mutateAsync(conn.id)
  }

  const handleReauthorize = (platform: PlatformConfig) => {
    handleConnect(platform)
  }

  const handleToggleSync = async (platform: PlatformConfig, enabled: boolean) => {
    const conn = connectionByPlatform(platform.id)
    if (!conn) return
    await toggleSync.mutateAsync({ id: conn.id, enabled })
  }

  const connectedCount = connections.filter(c => c.status === 'connected').length

  return (
    <div>
      <Header
        title="Integrations"
        subtitle="Connect advertising platforms to start syncing campaign data"
        actions={
          connectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {connectedCount} of {PLATFORMS.length} connected
            </Badge>
          )
        }
      />

      <div className="p-8 space-y-6">
        {/* OAuth status flash */}
        {oauthStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>
              <strong className="capitalize">{oauthPlatform?.replace('_', ' ')}</strong> connected successfully.
              Your first sync will start shortly.
            </p>
          </div>
        )}
        {oauthStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <p>OAuth authorization failed. Please try connecting again.</p>
          </div>
        )}

        {/* Client selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Connect for client</p>
          {clientsLoading ? (
            <div className="h-9 w-48 bg-slate-100 rounded-lg animate-pulse" />
          ) : clients.length === 0 ? (
            <p className="text-sm text-slate-400">No clients yet. Add a client first.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedClientId(c.id)
                    sessionStorage.setItem('integrations_client_id', c.id)
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                    selectedClientId === c.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {!selectedClientId && clients.length > 0 && (
          <p className="text-sm text-amber-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Select a client above to manage their platform connections.
          </p>
        )}

        {/* Platform grid */}
        <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', !selectedClientId && 'opacity-50 pointer-events-none')}>
          {connectionsLoading && selectedClientId
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-8 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                        <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            : PLATFORMS.map(platform => {
                const conn = connectionByPlatform(platform.id)
                // Use connection id to identify the last sync job. We pass a null syncJob
                // for simplicity — actual polling is handled per-connection via separate hook.
                return (
                  <PlatformCard
                    key={platform.id}
                    platform={platform}
                    connection={conn}
                    syncJob={null}
                    isConnecting={connectingPlatform === platform.id}
                    isSyncLoading={syncingPlatform === platform.id}
                    isDisconnecting={disconnect.isPending}
                    onConnect={() => handleConnect(platform)}
                    onDisconnect={() => handleDisconnect(platform)}
                    onSyncNow={(jt) => handleSyncNow(platform, jt)}
                    onReauthorize={() => handleReauthorize(platform)}
                    onToggleSync={(enabled) => handleToggleSync(platform, enabled)}
                  />
                )
              })}
        </div>

        {/* Architecture note */}
        <div className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
          <p className="font-semibold text-slate-500">Backend service architecture</p>
          <ul className="space-y-1">
            <li><code className="font-mono">/functions/v1/oauth-exchange</code> — Exchanges authorization codes for tokens (keeps client_secret server-side)</li>
            <li><code className="font-mono">/functions/v1/token-refresh</code> — Refreshes expired access tokens using stored refresh_token</li>
            <li><code className="font-mono">/functions/v1/sync-trigger</code> — Creates a sync_job record and kicks off the sync worker</li>
            <li><code className="font-mono">/functions/v1/sync-campaigns</code> — Fetches campaigns from platform API and upserts to DB</li>
            <li><code className="font-mono">/functions/v1/sync-metrics</code> — Fetches daily metrics and upserts to daily_metrics table</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
