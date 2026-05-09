/**
 * Full GTM Marketing Strategy Generator
 *
 * Generates a comprehensive go-to-market strategy using Claude Opus 4.7 with streaming.
 * Covers positioning, channel strategy, funnel design, budget allocation,
 * KPIs, 90-day action plan, and growth experiments.
 *
 * Body params:
 *   brand            {string}   Brand/company name (required)
 *   product          {string}   Product/service name (required)
 *   description      {string}   What it does and its key benefits (required)
 *   targetAudience   {string}   ICP description (required)
 *   stage            {string}   "pre-launch"|"launch"|"growth"|"scale"|"mature"
 *   monthlyBudget    {number}   Total monthly marketing budget in USD
 *   currentChannels  {string[]} Channels currently active
 *   goals            {string[]} "revenue"|"leads"|"brand"|"market_share"|"retention"
 *   timeframe        {string}   "30_days"|"90_days"|"6_months"|"12_months"
 *   uniqueValue      {string}   Core differentiator
 *   competitors      {string[]} Main competitors (names)
 *   geography        {string}   Target geography (e.g. "US", "Global", "EMEA")
 */

import { applyCors, callClaudeStreaming } from './_lib/claude-client.js';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    brand,
    product,
    description,
    targetAudience,
    stage = 'growth',
    monthlyBudget,
    currentChannels = [],
    goals = ['revenue', 'leads'],
    timeframe = '90_days',
    uniqueValue = '',
    competitors = [],
    geography = 'US',
  } = req.body || {};

  if (!brand || !product || !description || !targetAudience) {
    return res.status(400).json({
      success: false,
      error: 'brand, product, description, and targetAudience are required',
    });
  }

  const budgetStr = monthlyBudget ? `$${monthlyBudget.toLocaleString()}/month` : 'Not specified — provide recommendations for 3 budget tiers (bootstrap <$5K, growth $5K-$50K, scale $50K+)';
  const goalsStr = Array.isArray(goals) ? goals.join(', ') : goals;
  const competitorsStr = Array.isArray(competitors) ? competitors.join(', ') : competitors;
  const channelsStr = Array.isArray(currentChannels) ? currentChannels.join(', ') : currentChannels;
  const timeframeLabel = timeframe.replace('_', ' ');

  const prompt = `Create a comprehensive, investor-grade go-to-market marketing strategy document.

**Company & Product:**
- Brand: ${brand}
- Product: ${product}
- Description: ${description}
- Unique Value Proposition: ${uniqueValue || 'Derive from description'}
- Company Stage: ${stage}
- Geography: ${geography}

**Market Context:**
- Target Audience (ICP): ${targetAudience}
- Main Competitors: ${competitorsStr || 'Unknown — identify likely competitors'}
- Current Active Channels: ${channelsStr || 'None / starting fresh'}

**Strategy Parameters:**
- Primary Goals: ${goalsStr}
- Planning Timeframe: ${timeframeLabel}
- Monthly Budget: ${budgetStr}

Create a professional, data-informed strategy that a CMO would present to a board. Be specific, tactical, and contrarian where appropriate.

Return ONLY this JSON (no markdown):

{
  "executive_summary": {
    "strategic_thesis": "<2-3 sentence core strategic bet>",
    "market_opportunity": "<TAM/SAM/SOM framing>",
    "winning_strategy": "<the single key insight that defines the strategy>",
    "expected_outcomes": "<quantified outcomes over the timeframe>"
  },
  "positioning_strategy": {
    "positioning_statement": "<classic positioning statement — for [target] who [need], [brand] is the [category] that [differentiator] because [reason to believe]>",
    "category_design": "<are you creating a new category or competing in an existing one?>",
    "brand_archetype": "<Hero|Sage|Explorer|Rebel|etc>",
    "key_messages": {
      "primary": "<single most important message>",
      "secondary": ["<supporting message>"],
      "proof_points": ["<credibility-building evidence>"]
    },
    "messaging_framework": {
      "problem_statement": "<the problem you solve in customer language>",
      "solution_statement": "<how you solve it>",
      "value_statement": "<the measurable outcome customers get>",
      "differentiation_statement": "<why you vs. alternatives>"
    }
  },
  "ideal_customer_profile": {
    "primary_icp": {
      "firmographics": "<company size, industry, geography, funding stage>",
      "demographics": "<title, seniority, department>",
      "psychographics": "<values, motivations, identity>",
      "pain_points": ["<specific pain>"],
      "buying_triggers": ["<event that triggers purchase consideration>"],
      "objections": ["<common objection>"],
      "decision_process": "<how they buy — who's involved, timeline, criteria>"
    },
    "secondary_icp": {
      "description": "<secondary segment>",
      "size": "<relative market size>",
      "why_secondary": "<why not the primary focus>"
    }
  },
  "channel_strategy": {
    "recommended_channels": [
      {
        "channel": "<channel name>",
        "priority": "<Primary|Secondary|Test>",
        "rationale": "<why this channel for this ICP>",
        "budget_allocation": "<% of total budget>",
        "expected_cac": "<estimated customer acquisition cost>",
        "tactics": ["<specific tactic>"],
        "kpis": ["<metric>"],
        "ramp_time": "<time to see results>"
      }
    ],
    "channel_mix_rationale": "<why this specific mix for this stage and budget>",
    "channels_to_avoid": [
      {
        "channel": "<channel>",
        "reason": "<why not now>"
      }
    ]
  },
  "funnel_strategy": {
    "awareness": {
      "goal": "<what we want people to think/feel>",
      "tactics": ["<tactic>"],
      "content_types": ["<content type>"],
      "metrics": ["<metric and target>"]
    },
    "consideration": {
      "goal": "<what moves someone from aware to considering>",
      "tactics": ["<tactic>"],
      "content_types": ["<content type>"],
      "metrics": ["<metric and target>"]
    },
    "conversion": {
      "goal": "<conversion action>",
      "tactics": ["<tactic>"],
      "friction_reducers": ["<how to reduce conversion friction>"],
      "metrics": ["<metric and target>"]
    },
    "retention": {
      "goal": "<reduce churn / increase LTV>",
      "tactics": ["<tactic>"],
      "metrics": ["<metric and target>"]
    },
    "advocacy": {
      "goal": "<turn customers into referral sources>",
      "tactics": ["<tactic>"],
      "metrics": ["<metric and target>"]
    }
  },
  "budget_allocation": {
    "total_monthly": "${budgetStr}",
    "breakdown": [
      {
        "category": "<category e.g. Paid Media>",
        "percentage": <number>,
        "monthly_amount": "<amount or % if budget not specified>",
        "rationale": "<why this allocation>"
      }
    ],
    "north_star_cac_target": "<target customer acquisition cost>",
    "ltv_cac_target": "<target LTV:CAC ratio>",
    "payback_period_target": "<months to recoup CAC>"
  },
  "content_strategy": {
    "content_mission": "<why you create content — audience-centric>",
    "content_pillars": [
      {
        "pillar": "<topic>",
        "why": "<why this builds authority>",
        "formats": ["<format>"]
      }
    ],
    "seo_strategy": {
      "primary_topics": ["<topic cluster>"],
      "quick_wins": ["<low-competition keywords to target immediately>"],
      "authority_play": "<long-term SEO content angle>"
    },
    "thought_leadership": "<strategy for building category authority>"
  },
  "growth_experiments": [
    {
      "experiment": "<experiment name>",
      "hypothesis": "<what you expect to happen>",
      "channel": "<where to run it>",
      "effort": "<Low|Medium|High>",
      "potential_impact": "<Low|Medium|High|10x>",
      "how_to_test": "<minimum viable test>",
      "success_criteria": "<how you'll know it worked>"
    }
  ],
  "action_plan": {
    "week_1_2": {
      "theme": "<sprint theme>",
      "tasks": ["<specific task with owner type>"]
    },
    "month_1": {
      "theme": "<month focus>",
      "milestones": ["<milestone>"],
      "tasks": ["<task>"]
    },
    "month_2_3": {
      "theme": "<theme>",
      "milestones": ["<milestone>"],
      "tasks": ["<task>"]
    }
  },
  "kpis_dashboard": {
    "north_star_metric": "<the one metric that defines success>",
    "leading_indicators": [
      {
        "metric": "<metric>",
        "current_baseline": "<unknown or estimated>",
        "target": "<target>",
        "review_cadence": "<weekly|monthly>"
      }
    ],
    "lagging_indicators": [
      {
        "metric": "<metric>",
        "target": "<target>",
        "review_cadence": "<monthly|quarterly>"
      }
    ],
    "reporting_structure": "<recommended weekly/monthly reporting rhythm>"
  },
  "risks_and_mitigations": [
    {
      "risk": "<strategic risk>",
      "probability": "<Low|Medium|High>",
      "impact": "<Low|Medium|High>",
      "mitigation": "<specific mitigation action>"
    }
  ],
  "contrarian_bets": [
    {
      "bet": "<unconventional move worth considering>",
      "rationale": "<why this could be a competitive advantage>",
      "downside": "<what happens if it doesn't work>"
    }
  ]
}`;

  try {
    const stream = await callClaudeStreaming({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-opus-4-7',
      maxTokens: 16000,
      useThinking: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullText = '';
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            fullText += event.delta.text;
            res.write(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`);
          }
        } catch {
          // skip malformed events
        }
      }
    }

    try {
      const strategyData = JSON.parse(
        fullText.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim()
      );

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: {
          ...strategyData,
          generated_for: { brand, product, stage, timeframe, goals },
          generated_at: new Date().toISOString(),
          model: 'claude-opus-4-7',
        },
      })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'complete', raw_text: fullText })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Marketing strategy error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
}
