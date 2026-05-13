import { supabase } from '@/lib/supabase/client'
import type { AIInsight, AIRecommendation } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getInsights(limit = 20): Promise<AIInsight[]> {
  const { data, error } = await db.from('ai_insights').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data ?? []) as AIInsight[]
}

export async function markInsightRead(id: string): Promise<void> {
  const { error } = await db.from('ai_insights').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export async function getRecommendations(): Promise<AIRecommendation[]> {
  const { data, error } = await db
    .from('ai_recommendations')
    .select('*')
    .eq('is_dismissed', false)
    .eq('is_implemented', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AIRecommendation[]
}

export async function dismissRecommendation(id: string): Promise<void> {
  const { error } = await db.from('ai_recommendations').update({ is_dismissed: true }).eq('id', id)
  if (error) throw error
}

export async function markRecommendationImplemented(id: string): Promise<void> {
  const { error } = await db.from('ai_recommendations').update({ is_implemented: true, implemented_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
