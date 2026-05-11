/**
 * AI analysis service — calls the Supabase Edge Function (which holds ANTHROPIC_API_KEY).
 * Never calls Claude directly from the browser.
 */
import { supabase } from '@/lib/supabase/client'
import type { AIInsightRequest, AIInsightResponse } from './types'

export class AIAnalysisError extends Error {
  readonly status: number | undefined
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AIAnalysisError'
    this.status = status
  }
}

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new AIAnalysisError('Not authenticated')
  return session.access_token
}

export async function runAnalysis<T extends AIInsightResponse>(
  request: AIInsightRequest
): Promise<T> {
  const token = await getAccessToken()

  const res = await fetch('/functions/v1/generate-insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new AIAnalysisError(err.message ?? 'AI analysis failed', res.status)
  }

  return res.json() as Promise<T>
}
