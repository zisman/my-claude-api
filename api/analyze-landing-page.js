/**
 * Landing Page Intelligence Analyzer
 *
 * Deep AI analysis of any landing page using Claude Opus 4.7 with:
 * - Real web content fetching via Claude's web_fetch server tool
 * - Adaptive thinking for nuanced multi-dimensional scoring
 * - Prompt caching for cost efficiency
 * - Structured JSON output with actionable recommendations
 */

import { applyCors, callClaude, parseJsonResponse, MARKETING_SYSTEM_PROMPT } from './_lib/claude-client.js';

const ANALYSIS_PROMPT = `Analyze the landing page at the URL provided below. Use your web_fetch capability to actually retrieve and examine the page content, then deliver a rigorous professional audit.

Score each dimension on a 0-100 scale with evidence-based reasoning.

Return ONLY this JSON structure (no markdown, no preamble):

{
  "overall_score": <number 0-100>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|D|F>",
  "page_name": "<detected page title>",
  "website_category": "<e.g. SaaS, E-commerce, Lead Gen, Portfolio>",
  "target_audience": "<inferred ICP description>",
  "analysis": {
    "speed": {
      "score": <number>,
      "headline": "<one sentence verdict>",
      "details": "<technical findings with specific evidence>",
      "issues": ["<specific issue>"],
      "fixes": ["<specific fix>"]
    },
    "design": {
      "score": <number>,
      "headline": "<one sentence verdict>",
      "details": "<UX/UI findings>",
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    },
    "content": {
      "score": <number>,
      "headline": "<one sentence verdict>",
      "details": "<copy, messaging, value proposition findings>",
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    },
    "conversion": {
      "score": <number>,
      "headline": "<one sentence verdict>",
      "details": "<CTA, form, trust signal findings>",
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    },
    "seo": {
      "score": <number>,
      "headline": "<one sentence verdict>",
      "details": "<technical SEO, meta, schema findings>",
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    },
    "trust_signals": {
      "score": <number>,
      "headline": "<verdict>",
      "details": "<social proof, security, credibility findings>",
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    },
    "mobile": {
      "score": <number>,
      "headline": "<verdict>",
      "details": "<responsive design, mobile UX findings>",
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    }
  },
  "priority_recommendations": [
    {
      "priority": "critical",
      "category": "<Speed|Design|Content|Conversion|SEO|Trust|Mobile>",
      "action": "<specific action to take>",
      "estimated_impact": "<e.g. +15-25% conversion rate>",
      "effort": "<Low|Medium|High>",
      "timeframe": "<e.g. 1 day, 1 week, 1 month>"
    }
  ],
  "quick_wins": [
    {
      "action": "<what to do>",
      "why": "<why it matters>",
      "how": "<how to implement it>"
    }
  ],
  "ab_test_ideas": [
    {
      "element": "<what to test>",
      "hypothesis": "<what you expect to happen>",
      "variants": ["<variant A>", "<variant B>"]
    }
  ],
  "competitive_gaps": "<what top competitors in this space do that this page lacks>",
  "value_proposition_score": <number 0-100>,
  "value_proposition_feedback": "<analysis of the core value prop clarity and differentiation>",
  "estimated_conversion_rate": "<e.g. 2-4%>",
  "conversion_rate_benchmark": "<industry benchmark for this category>",
  "top_3_priorities": ["<#1 most impactful change>", "<#2>", "<#3>"]
}`;

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { websiteUrl } = req.body || {};

  if (!websiteUrl) {
    return res.status(400).json({ success: false, error: 'websiteUrl is required' });
  }

  // Basic URL validation
  try {
    new URL(websiteUrl);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL format' });
  }

  try {
    // Use the web_fetch server tool so Claude actually reads the page content
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

    const body = {
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      tools: [
        { type: 'web_fetch_20260209', name: 'web_fetch' },
      ],
      system: [
        {
          type: 'text',
          text: MARKETING_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' }, // prompt caching
        },
      ],
      messages: [
        {
          role: 'user',
          content: `${ANALYSIS_PROMPT}\n\nURL to analyze: ${websiteUrl}`,
        },
      ],
    };

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      throw new Error(`Claude API error ${claudeResponse.status}: ${errText}`);
    }

    const claudeData = await claudeResponse.json();

    // Extract the final text block (may follow tool_use and tool_result turns)
    const textBlock = claudeData.content.findLast(b => b.type === 'text');
    if (!textBlock) throw new Error('No text response from Claude');

    const analysisData = parseJsonResponse(textBlock.text);

    return res.json({
      success: true,
      data: {
        ...analysisData,
        analyzed_url: websiteUrl,
        analysis_timestamp: new Date().toISOString(),
        analysis_source: 'claude_opus_4_7',
        cache_performance: {
          cache_creation_tokens: claudeData.usage?.cache_creation_input_tokens ?? 0,
          cache_read_tokens: claudeData.usage?.cache_read_input_tokens ?? 0,
        },
      },
    });

  } catch (error) {
    console.error('Landing page analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      analyzed_url: websiteUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
