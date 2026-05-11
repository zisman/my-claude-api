import Anthropic from 'npm:@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

// ─── JSON schemas ─────────────────────────────────────────────────────────────

const INSIGHT_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    problems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          metric_affected: { type: 'string' },
          current_value: { type: 'string' },
          benchmark_value: { type: 'string' },
        },
        required: ['title', 'description', 'severity', 'metric_affected', 'current_value'],
      },
    },
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          potential_uplift: { type: 'string' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] },
          confidence: { type: 'number' },
        },
        required: ['title', 'description', 'potential_uplift', 'effort', 'confidence'],
      },
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          category: { type: 'string', enum: ['budget', 'targeting', 'creative', 'bidding', 'structure', 'reporting', 'strategy'] },
          title: { type: 'string' },
          description: { type: 'string' },
          expected_impact: { type: 'string' },
          implementation_steps: { type: 'array', items: { type: 'string' } },
          estimated_lift: { type: ['number', 'null'] },
          effort_level: { type: 'string', enum: ['low', 'medium', 'high'] },
          time_to_implement: { type: 'string' },
        },
        required: ['id', 'priority', 'category', 'title', 'description', 'expected_impact', 'implementation_steps', 'effort_level', 'time_to_implement'],
      },
    },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          probability: { type: 'string', enum: ['high', 'medium', 'low'] },
          impact: { type: 'string', enum: ['high', 'medium', 'low'] },
          mitigation: { type: 'string' },
        },
        required: ['title', 'description', 'probability', 'impact', 'mitigation'],
      },
    },
    next_actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          owner: { type: 'string', enum: ['account_manager', 'client', 'platform'] },
          urgency: { type: 'string', enum: ['immediate', 'this_week', 'this_month'] },
          context: { type: 'string' },
        },
        required: ['action', 'owner', 'urgency', 'context'],
      },
    },
    client_friendly_summary: { type: 'string' },
    internal_notes: { type: 'string' },
  },
  required: ['summary', 'problems', 'opportunities', 'recommendations', 'risks', 'next_actions', 'client_friendly_summary', 'internal_notes'],
}

const TASK_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      priority: { type: 'string', enum: ['urgent', 'high', 'normal', 'low'] },
      category: { type: 'string' },
      due_in_days: { type: 'number' },
      source_recommendation_id: { type: 'string' },
    },
    required: ['title', 'description', 'priority', 'category', 'due_in_days', 'source_recommendation_id'],
  },
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString('en-US', { maximumFractionDigits: 0 }) }
function fmtCcy(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}
function pct(n: number) { return `${(n * 100).toFixed(2)}%` }
function roasFmt(n: number | null) { return n != null ? `${n.toFixed(2)}x` : 'N/A' }

function serializeCampaign(c: Record<string, unknown>, days: number): string {
  return `Campaign: ${c.name} | Platform: ${c.platform} | Status: ${c.status}
  Spend(${days}d): ${fmtCcy(Number(c.spend_30d), String(c.currency))} | Clicks: ${fmt(Number(c.clicks_30d))} | CTR: ${pct(Number(c.ctr_30d))} | CPC: ${fmtCcy(Number(c.cpc_30d), String(c.currency))} | ROAS: ${roasFmt(c.roas_30d as number | null)} | Health: ${c.health_score ?? 'N/A'}`
}

function serializeMetric(m: Record<string, unknown>, label: string, currency = 'USD'): string {
  return `${label}: spend=${fmtCcy(Number(m.spend), currency)}, clicks=${fmt(Number(m.clicks))}, impr=${fmt(Number(m.impressions))}, conv=${fmt(Number(m.conversions))}, CTR=${pct(Number(m.ctr))}, CPC=${fmtCcy(Number(m.cpc), currency)}, ROAS=${roasFmt(m.roas as number | null)}`
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(type: string, body: Record<string, unknown>): string {
  switch (type) {
    case 'campaign_insight': {
      const c = body.campaign as Record<string, unknown>
      const m = body.metrics as Record<string, unknown>
      const cur = m.current as Record<string, unknown>
      const prev = m.previous as Record<string, unknown>
      const byDay = (m.byDay as Record<string, unknown>[]) ?? []
      const days = Number(body.period_days) || 30
      const currency = String(c.currency || 'USD')
      const last7 = byDay.slice(-7)
        .map(d => `  ${d.date}: spend=${fmtCcy(Number(d.spend))}, clicks=${fmt(Number(d.clicks))}, conv=${fmt(Number(d.conversions))}`)
        .join('\n')

      return `Analyze this campaign and produce structured insights.

${serializeCampaign(c, days)}
Objective: ${c.objective ?? 'N/A'} | Daily Budget: ${c.daily_budget ? fmtCcy(Number(c.daily_budget), currency) : 'N/A'} | Target ROAS: ${roasFmt(c.target_roas as number | null)}
Health Score: ${c.health_score != null ? `${c.health_score}/100 (${c.health_trend ?? 'stable'})` : 'N/A'}

${serializeMetric(cur, `Current (${days}d)`, currency)}
${serializeMetric(prev, `Prior (${days}d)`, currency)}

Recent daily trend (last 7 days):
${last7 || '  No daily data'}

Provide 1-3 problems, 1-3 opportunities, 2-4 recommendations (each with unique id like "rec_01"), 0-2 risks, 2-4 next_actions.`
    }

    case 'client_summary': {
      const client = body.client as Record<string, unknown>
      const campaigns = (body.campaigns as Record<string, unknown>[]) ?? []
      const days = Number(body.period_days) || 30
      const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend_30d), 0)
      const campaignList = campaigns.slice(0, 10).map(c => serializeCampaign(c, days)).join('\n')

      return `Generate a comprehensive client performance summary.

Client: ${client.name} | Industry: ${client.industry ?? 'N/A'} | Status: ${client.status}
Monthly Budget: ${client.monthly_budget ? fmtCcy(Number(client.monthly_budget), String(client.currency)) : 'N/A'}
Active Campaigns: ${client.active_campaign_count}/${client.campaign_count} | Open Alerts: ${client.open_alert_count}
Avg Health: ${client.avg_health_score != null ? `${Number(client.avg_health_score).toFixed(0)}/100` : 'N/A'}

Portfolio Total Spend (${days}d): ${fmtCcy(totalSpend)}

Campaigns:
${campaignList}

Provide: summary, problems (portfolio-level), opportunities, recommendations (2-4 strategic, each with unique id), risks, next_actions, client_friendly_summary, internal_notes.`
    }

    case 'monthly_report': {
      const orgName = String(body.organization_name)
      const period = String(body.period)
      const campaigns = (body.campaigns as Record<string, unknown>[]) ?? []
      const platformSpend = (body.platform_spend as Record<string, unknown>[]) ?? []
      const days = Number(body.period_days) || 30
      const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend_30d), 0)
      const platformLines = platformSpend.map(p => `  ${p.platform}: ${fmtCcy(Number(p.spend))} (${p.percentage}%)`).join('\n')
      const topCampaigns = campaigns.slice(0, 5).map(c => serializeCampaign(c, days)).join('\n')

      return `Generate a monthly report for this advertising portfolio.

Organization: ${orgName} | Period: ${period}
Total Spend: ${fmtCcy(totalSpend)} | Active Campaigns: ${campaigns.filter(c => c.status === 'active').length}

Platform Breakdown:
${platformLines}

Top Campaigns:
${topCampaigns}

Provide: summary (month overview), problems, opportunities, recommendations (3-5 strategic, each with unique id), risks, next_actions, client_friendly_summary (executive summary), internal_notes.`
    }

    case 'recommendations': {
      const cur = body.current_metrics as Record<string, unknown>
      const prev = body.previous_metrics as Record<string, unknown>
      const campaigns = (body.campaigns as Record<string, unknown>[]) ?? []
      const campaignList = campaigns.slice(0, 8).map(c => serializeCampaign(c, 30)).join('\n')

      return `Generate targeted recommendations for this ${body.context}: ${body.entity_name}.

${serializeMetric(cur, 'Current (30d)')}
${serializeMetric(prev, 'Prior (30d)')}

${campaigns.length ? `\nCampaigns:\n${campaignList}` : ''}

Provide 3-6 specific, prioritized recommendations (each with unique id). Focus on highest-impact actions.`
    }

    case 'generate_tasks': {
      const recs = JSON.stringify(body.recommendations, null, 2)
      return `Convert these advertising recommendations into actionable tasks for ${body.entity_name}.

Recommendations:
${recs}

Generate 1-2 concrete tasks per recommendation. Set source_recommendation_id to the recommendation's id. Assign realistic due_in_days (critical→1, high→3, medium→7, low→14).`
    }

    default:
      throw new Error(`Unknown analysis type: ${type}`)
  }
}

// ─── System prompt (stable — qualifies for prompt caching) ───────────────────

const SYSTEM_PROMPT = `You are an expert digital advertising analyst and strategic advisor. You analyze advertising campaign performance data for a SaaS ad management platform and produce structured, actionable insights for account managers and their clients.

Your analysis should be:
- Data-driven: ground every claim in the numbers provided
- Actionable: every insight should lead to a concrete action
- Prioritized: rank recommendations by expected impact x urgency
- Honest: flag problems clearly; do not sugarcoat underperformance
- Client-aware: distinguish what is appropriate for client-facing vs. internal communication

You always respond with valid JSON matching the schema provided in output_config. Do not include markdown fences or explanatory text outside the JSON.`

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  if (!req.headers.get('Authorization')) return new Response('Unauthorized', { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }

  const type = String(body.type ?? '')
  if (!type) {
    return new Response(JSON.stringify({ error: 'Missing type field' }), { status: 400 })
  }

  let userPrompt: string
  try {
    userPrompt = buildPrompt(type, body)
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 400 })
  }

  const schema = type === 'generate_tasks' ? TASK_SCHEMA : INSIGHT_RESULT_SCHEMA
  const maxTokens = type === 'monthly_report' ? 4096 : 2048

  try {
    // @ts-ignore — output_config is a valid beta field not yet in Deno type stubs
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // @ts-ignore — cache_control beta field
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
      output_config: {
        format: {
          type: 'json_schema',
          name: type === 'generate_tasks' ? 'tasks' : 'insight_result',
          schema,
        },
      },
    })

    const message = await stream.finalMessage()
    const textBlock = message.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined

    if (!textBlock) {
      return new Response(JSON.stringify({ error: 'No structured output from Claude' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(textBlock.text, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
