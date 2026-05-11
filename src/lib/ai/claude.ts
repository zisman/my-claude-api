// Claude AI integration — calls Supabase Edge Function to keep ANTHROPIC_API_KEY server-side

export interface InsightRequest {
  campaign_id?: string
  client_id?: string
  metrics_summary: {
    period: string
    impressions: number
    clicks: number
    spend: number
    conversions: number
    ctr: number
    cpc: number
    roas: number | null
    trend: string
  }
  context?: string
}

export interface InsightResponse {
  insights: Array<{
    type: string
    title: string
    summary: string
    details: string
    confidence: number
  }>
  recommendations: Array<{
    priority: string
    title: string
    description: string
    expected_impact: string
    implementation_steps: string[]
    estimated_lift: number | null
  }>
}

export async function generateCampaignInsights(
  request: InsightRequest,
  accessToken: string
): Promise<InsightResponse> {
  // Calls POST /functions/v1/generate-insights (Supabase Edge Function with ANTHROPIC_API_KEY)
  const response = await fetch('/functions/v1/generate-insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message ?? 'Failed to generate insights')
  }

  return response.json()
}

export async function generateReportNarrative(
  reportData: Record<string, unknown>,
  accessToken: string
): Promise<string> {
  const response = await fetch('/functions/v1/generate-report-narrative', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ report_data: reportData }),
  })

  if (!response.ok) throw new Error('Failed to generate report narrative')
  const result = await response.json()
  return result.narrative
}
