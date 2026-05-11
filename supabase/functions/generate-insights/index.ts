import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const { metrics_summary, campaign_id, client_id, context } = body

  const prompt = `You are an expert digital advertising analyst. Analyze the following campaign performance metrics and provide actionable insights and recommendations.

Metrics for period ${metrics_summary.period}:
- Impressions: ${metrics_summary.impressions.toLocaleString()}
- Clicks: ${metrics_summary.clicks.toLocaleString()}
- Spend: $${metrics_summary.spend.toFixed(2)}
- Conversions: ${metrics_summary.conversions}
- CTR: ${metrics_summary.ctr.toFixed(2)}%
- CPC: $${metrics_summary.cpc.toFixed(2)}
- ROAS: ${metrics_summary.roas ? metrics_summary.roas.toFixed(2) + 'x' : 'N/A'}
- Trend: ${metrics_summary.trend}
${context ? `\nAdditional context: ${context}` : ''}

Respond in JSON format with this exact structure:
{
  "insights": [
    {
      "type": "performance|anomaly|opportunity|risk|trend",
      "title": "Short insight title",
      "summary": "One sentence summary",
      "details": "Detailed analysis paragraph",
      "confidence": 0.0-1.0
    }
  ],
  "recommendations": [
    {
      "priority": "critical|high|medium|low",
      "title": "Recommendation title",
      "description": "What to do and why",
      "expected_impact": "Quantified expected outcome",
      "implementation_steps": ["Step 1", "Step 2"],
      "estimated_lift": null or percentage as decimal e.g. 0.15 for 15%
    }
  ]
}

Provide 2-4 insights and 2-3 recommendations. Be specific, data-driven, and actionable.`

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  })

  const message = await stream.finalMessage()
  const textContent = message.content.find(b => b.type === 'text')

  if (!textContent || textContent.type !== 'text') {
    return new Response(JSON.stringify({ error: 'No text response from Claude' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch?.[0] ?? textContent.text)
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse Claude response', raw: textContent.text }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
