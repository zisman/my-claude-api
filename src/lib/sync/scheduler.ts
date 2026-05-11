import { supabase } from '@/lib/supabase/client'

export type SyncJobType = 'full' | 'incremental' | 'campaigns' | 'metrics'

export async function triggerSync(
  platformConnectionId: string,
  jobType: SyncJobType = 'incremental',
  accessToken: string
): Promise<{ job_id: string }> {
  const response = await fetch('/functions/v1/sync-campaigns', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ platform_connection_id: platformConnectionId, job_type: jobType }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Sync trigger failed')
  }

  return response.json()
}

export async function getSyncStatus(jobId: string) {
  const { data, error } = await supabase
    .from('sync_job_logs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) throw error
  return data
}

export async function getLastSyncInfo(platformConnectionId: string) {
  const { data } = await supabase
    .from('sync_job_logs')
    .select('status, started_at, completed_at, records_synced, error_summary')
    .eq('platform_connection_id', platformConnectionId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single()

  return data
}
