import { supabase } from '@/lib/supabase/client'
import type { Report, CreateReportForm } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getReports(organizationId?: string): Promise<Report[]> {
  let query = db
    .from('reports')
    .select(`*, client:clients(id, name), created_by_user:user_profiles!created_by(id, full_name, avatar_url)`)
    .order('created_at', { ascending: false })

  if (organizationId) query = query.eq('organization_id', organizationId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Report[]
}

export async function createReport(form: CreateReportForm & { organization_id: string; created_by: string }): Promise<Report> {
  const { data, error } = await db.from('reports').insert({ ...form, status: 'pending' }).select().single()
  if (error) throw error
  return data as Report
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await db.from('reports').delete().eq('id', id)
  if (error) throw error
}
