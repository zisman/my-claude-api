import { supabase } from '@/lib/supabase/client'
import type { Task, TaskFilters, CreateTaskForm } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getTasks(filters?: TaskFilters): Promise<Task[]> {
  let query = db
    .from('tasks')
    .select(`*, client:clients(id, name), campaign:campaigns(id, name, platform), assigned_to_user:user_profiles!assigned_to(id, full_name, avatar_url)`)
    .order('created_at', { ascending: false })

  if (filters?.status?.length) query = query.in('status', filters.status)
  if (filters?.priority?.length) query = query.in('priority', filters.priority)
  if (filters?.client_id) query = query.eq('client_id', filters.client_id)
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
  if (filters?.search) query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function createTask(form: CreateTaskForm & { organization_id: string; created_by: string }): Promise<Task> {
  const { data, error } = await db.from('tasks').insert(form).select().single()
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const payload = { ...updates }
  if (updates.status === 'done') payload.completed_at = new Date().toISOString()
  const { data, error } = await db.from('tasks').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await db.from('tasks').delete().eq('id', id)
  if (error) throw error
}
