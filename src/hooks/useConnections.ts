import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPlatformConnections,
  getLastSyncJob,
  disconnectPlatform,
  toggleSyncEnabled,
  triggerManualSync,
  refreshConnectionToken,
} from '@/lib/api/connections'
import { useAuth } from '@/contexts/AuthContext'

const KEYS = {
  connections: (clientId?: string) => ['connections', clientId] as const,
  lastSync: (connId: string) => ['connections', 'lastSync', connId] as const,
}

export function useConnections(clientId?: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: KEYS.connections(clientId),
    queryFn: () => getPlatformConnections({ clientId, orgId: user?.organization_id }),
    enabled: !!user,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useLastSyncJob(connectionId: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: KEYS.lastSync(connectionId!),
    queryFn: () => getLastSyncJob(connectionId!),
    enabled: !!connectionId && (opts?.enabled !== false),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}

export function useDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: disconnectPlatform,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useToggleSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleSyncEnabled(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useTriggerSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (opts: { connectionId: string; jobType?: 'full' | 'incremental' | 'campaigns' | 'metrics' }) =>
      triggerManualSync(opts),
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['connections'] }), 2000)
    },
  })
}

export function useRefreshToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: refreshConnectionToken,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })
}
