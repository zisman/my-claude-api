/**
 * Competitor Intelligence Analyzer
 *
 * Deep competitive intelligence report using Claude Opus 4.7 with web_fetch.
 * Analyzes competitors' positioning, messaging, strengths, weaknesses,
 * and surfaces strategic opportunities.
 *
 * Body params:
 *   yourBrand       {string}   Your brand/product name (required)
 *   yourDescription {string}   What your product does (required)
 *   competitors     {string[]} Competitor URLs or names to analyze (required, max 5)
 *   industry        {string}   Industry vertical
 *   analysisDepth   {string}   "quick"|"standard"|"deep" (default: "standard")
 *   focusAreas      {string[]} "pricing"|"messaging"|"seo"|"social"|"features"|"positioning"
 */

import { applyCors, MARKETING_SYSTEM_PROMPT, parseJsonResponse } from './_lib/claude-client.js';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    yourBrand,
    yourDescription,
    competitors = [],
    industry = 'general',
    analysisDepth = 'standard',
    focusAreas = ['messaging', 'positioning', 'features', 'pricing'],
  } = req.body || {};

  if (!yourBrand || !yourDescription) {
    return res.status(400).json({ success: false, error: 'yourBrand and yourDescription are required' });
  }

  if (!Array.isArray(competitors) || competitors.length === 0) {
    return res.status(400).json({ success: false, error: 'competitors array is required (at least 1 competitor)' });
  }

  const competitorsList = competitors.slice(0, 5);
  const focusAreasStr = Array.isArray(focusAreas) ? focusAreas.join(', ') : focusAreas;

  const depthInstructions = {
    quick: 'Provide a concise overview — 2-3 key insights per competitor.',
    standard: 'Provide thorough analysis with specific examples and evidence.',
    deep: 'Provide exhaustive analysis with granular tactical details, exact copy examples, and comprehensive battle cards.',
  };

  const prompt = `Conduct a professional competitive intelligence analysis. Use web_fetch to visit each competitor's website and gather real data.

**Your Brand:**
- Name: ${yourBrand}
- Description: ${yourDescription}
- Industry: ${industry}

**Competitors to Analyze:**
${competitorsList.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Analysis Focus Areas:** ${focusAreasStr}
**Analysis Depth:** ${analysisDepth} — ${depthInstructions[analysisDepth]}

For each competitor, fetch their main URL and extract positioning, messaging, pricing signals, and differentiators.

Return ONLY this JSON (no markdown):

{
  "executive_summary": {
    "competitive_landscape": "<1-2 paragraph overview of the competitive landscape>",
    "your_position": "<where your brand stands relative to the field>",
    "biggest_opportunity": "<the single most actionable competitive opportunity>",
    "biggest_threat": "<the most serious competitive threat>"
  },
  "competitors": [
    {
      "name": "<competitor name>",
      "url": "<their website URL>",
      "category": "<Direct|Indirect|Emerging>",
      "target_market": "<who they are primarily targeting>",
      "positioning_statement": "<their core positioning>",
      "primary_message": "<headline or hook from their homepage>",
      "pricing_model": "<pricing structure if visible>",
      "pricing_tiers": ["<tier name: price if available>"],
      "key_features": ["<feature>"],
      "strengths": ["<strength — be specific>"],
      "weaknesses": ["<weakness — be specific>"],
      "recent_moves": "<any recent product launches, campaigns, or pivots>",
      "social_proof": "<types of social proof they use>",
      "traffic_estimate": "<Low|Medium|High|Very High based on signals>",
      "marketing_channels": ["<channel they appear active on>"],
      "messaging_analysis": {
        "hero_headline": "<their homepage hero headline>",
        "value_prop": "<their stated value proposition>",
        "emotional_appeal": "<fear|aspiration|belonging|status|utility>",
        "key_claims": ["<claim they make>"],
        "tone_of_voice": "<tone description>"
      },
      "seo_signals": {
        "estimated_domain_authority": "<Low|Medium|High>",
        "content_strategy": "<what type of content they produce>",
        "keyword_focus": ["<topic or keyword they target>"]
      },
      "battle_card": {
        "when_you_win": ["<scenario where you beat them>"],
        "when_they_win": ["<scenario where they beat you>"],
        "your_counter_talking_points": ["<how to position against this competitor>"],
        "their_likely_objections_to_you": ["<what they say about you or will>"],
        "your_rebuttals": ["<how to counter their objections>"]
      }
    }
  ],
  "competitive_matrix": {
    "dimensions": ["<comparison dimension>"],
    "scores": {
      "${yourBrand}": {"<dimension>": "<score or description>"},
      "<competitor_name>": {"<dimension>": "<score or description>"}
    }
  },
  "gap_analysis": {
    "features_they_have_you_lack": ["<feature gap>"],
    "features_you_have_they_lack": ["<your advantage>"],
    "messaging_gaps": ["<positioning angle no one is owning>"],
    "market_segments_underserved": ["<audience segment competitors ignore>"],
    "price_gaps": "<price positioning opportunity>"
  },
  "strategic_recommendations": {
    "immediate_actions": [
      {
        "action": "<specific action>",
        "rationale": "<why this gives you an edge>",
        "effort": "<Low|Medium|High>",
        "impact": "<Low|Medium|High>"
      }
    ],
    "differentiation_strategy": "<recommended unique positioning strategy>",
    "messaging_pivots": ["<how to reframe your messaging to win>"],
    "content_angles_to_own": ["<content territory no competitor is effectively owning>"],
    "channels_to_prioritize": ["<channel where you can out-compete them>"]
  },
  "win_loss_patterns": {
    "why_customers_choose_you": ["<reason>"],
    "why_customers_choose_competitors": ["<reason>"],
    "switching_triggers": ["<what makes customers switch from competitors to you>"]
  },
  "market_trends": {
    "emerging_threats": ["<new entrant or trend to watch>"],
    "declining_players": ["<competitors losing ground>"],
    "market_direction": "<where this market is heading in 12-24 months>"
  }
}`;

  try {
    const effortLevel = analysisDepth === 'deep' ? 'max' : 'high';

    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: analysisDepth === 'deep' ? 12000 : 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: effortLevel },
      tools: [{ type: 'web_fetch_20260209', name: 'web_fetch' }],
      system: [
        {
          type: 'text',
          text: MARKETING_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    // Handle multi-turn: if Claude wants to do more tool calls, we need to continue the loop
    let currentResponse = response;
    let messages = [{ role: 'user', content: prompt }];

    while (currentResponse.stop_reason === 'tool_use') {
      const toolUseBlocks = currentResponse.content.filter(b => b.type === 'tool_use');
      messages.push({ role: 'assistant', content: currentResponse.content });

      const toolResults = await Promise.all(
        toolUseBlocks.map(async (toolBlock) => {
          try {
            const fetchRes = await fetch(toolBlock.input.url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ResearchBot/1.0)' },
              signal: AbortSignal.timeout(10000),
            });
            const text = await fetchRes.text();
            return {
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: text.slice(0, 30000),
            };
          } catch (fetchErr) {
            return {
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: `Failed to fetch: ${fetchErr.message}`,
              is_error: true,
            };
          }
        })
      );

      messages.push({ role: 'user', content: toolResults });

      currentResponse = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: analysisDepth === 'deep' ? 12000 : 8000,
        thinking: { type: 'adaptive' },
        output_config: { effort: effortLevel },
        tools: [{ type: 'web_fetch_20260209', name: 'web_fetch' }],
        system: [
          {
            type: 'text',
            text: MARKETING_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages,
      });
    }

    const textBlock = currentResponse.content.findLast(b => b.type === 'text');
    if (!textBlock) throw new Error('No text response from Claude');

    const analysisData = parseJsonResponse(textBlock.text);

    return res.json({
      success: true,
      data: {
        ...analysisData,
        your_brand: yourBrand,
        competitors_analyzed: competitorsList,
        analysis_depth: analysisDepth,
        generated_at: new Date().toISOString(),
        model: 'claude-opus-4-7',
        cache_performance: {
          cache_creation_tokens: currentResponse.usage?.cache_creation_input_tokens ?? 0,
          cache_read_tokens: currentResponse.usage?.cache_read_input_tokens ?? 0,
        },
      },
    });

  } catch (error) {
    console.error('Competitor analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
