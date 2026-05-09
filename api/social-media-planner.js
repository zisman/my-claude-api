/**
 * 30-Day Social Media Content Calendar Generator
 *
 * Generates a comprehensive, platform-optimized social media content calendar
 * using Claude Opus 4.7 with streaming output.
 *
 * Body params:
 *   brand           {string}   Brand/company name (required)
 *   industry        {string}   Industry vertical (required)
 *   description     {string}   What the brand does (required)
 *   platforms       {string[]} Social platforms: "instagram"|"linkedin"|"twitter"|"tiktok"|"facebook"|"youtube"
 *   tone            {string}   Brand voice: "professional"|"playful"|"educational"|"inspirational"|"bold"
 *   goals           {string[]} "brand_awareness"|"lead_generation"|"community"|"sales"|"thought_leadership"
 *   targetAudience  {string}   ICP description
 *   contentPillars  {string[]} Key content themes (optional — will be generated if empty)
 *   postsPerWeek    {number}   Target posting frequency per platform (default: 5)
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
    industry,
    description,
    platforms = ['instagram', 'linkedin', 'twitter'],
    tone = 'professional',
    goals = ['brand_awareness'],
    targetAudience = 'general audience',
    contentPillars = [],
    postsPerWeek = 5,
  } = req.body || {};

  if (!brand || !industry || !description) {
    return res.status(400).json({
      success: false,
      error: 'brand, industry, and description are required',
    });
  }

  const platformsStr = Array.isArray(platforms) ? platforms.join(', ') : platforms;
  const goalsStr = Array.isArray(goals) ? goals.join(', ') : goals;
  const pillarsStr = Array.isArray(contentPillars) && contentPillars.length > 0
    ? contentPillars.join(', ')
    : 'Generate 5 strategic content pillars based on brand and industry';

  const prompt = `Create a comprehensive 30-day social media content calendar for the following brand.

**Brand Details:**
- Brand: ${brand}
- Industry: ${industry}
- Description: ${description}
- Target Audience: ${targetAudience}
- Brand Tone: ${tone}
- Platforms: ${platformsStr}
- Marketing Goals: ${goalsStr}
- Content Pillars: ${pillarsStr}
- Posts Per Week Per Platform: ${postsPerWeek}

Create a professional, ready-to-execute 30-day content calendar with diverse content types, trending hooks, and platform-specific optimizations.

Return ONLY this JSON (no markdown):

{
  "strategy_overview": {
    "brand_voice": "<refined brand voice description>",
    "content_pillars": [
      {
        "name": "<pillar name>",
        "description": "<what content falls under this>",
        "percentage_of_content": <number>,
        "content_types": ["<post types for this pillar>"]
      }
    ],
    "content_mix": {
      "educational": "<% of content>",
      "entertaining": "<% of content>",
      "promotional": "<% of content>",
      "engagement": "<% of content>",
      "user_generated": "<% of content>"
    },
    "posting_schedule": {
      "best_times_by_platform": {
        "instagram": "<e.g. Mon/Wed/Fri 10am-12pm>",
        "linkedin": "<best times>",
        "twitter": "<best times>",
        "tiktok": "<best times>",
        "facebook": "<best times>"
      }
    },
    "monthly_theme": "<overarching theme for the month>",
    "kpis_to_track": ["<KPI>"]
  },
  "weeks": [
    {
      "week": 1,
      "theme": "<weekly micro-theme>",
      "days": [
        {
          "day": 1,
          "date_placeholder": "Day 1 (Monday)",
          "posts": [
            {
              "platform": "<platform>",
              "content_type": "<Reel|Carousel|Static|Story|Tweet|Thread|Article|Short>",
              "content_pillar": "<which pillar>",
              "hook": "<attention-grabbing first line/visual hook>",
              "caption": "<full caption text ready to post>",
              "hashtags": ["<hashtag>"],
              "cta": "<call to action>",
              "visual_concept": "<describe the image/video concept>",
              "engagement_prompt": "<question or interaction prompt>",
              "estimated_reach_potential": "<Low|Medium|High|Viral>"
            }
          ]
        }
      ]
    }
  ],
  "content_templates": {
    "high_performing_hooks": [
      "<hook template 1 — fill in the blank style>",
      "<hook template 2>",
      "<hook template 3>",
      "<hook template 4>",
      "<hook template 5>"
    ],
    "caption_frameworks": [
      {
        "name": "<framework name e.g. PAS>",
        "template": "<caption template>",
        "best_for": "<platform or content type>"
      }
    ],
    "hashtag_strategy": {
      "brand_hashtags": ["<#brandhashtag>"],
      "niche_hashtags": ["<#nichehashtag>"],
      "trending_hashtags": ["<#trendinghashtag>"],
      "recommended_count_by_platform": {
        "instagram": "<number>",
        "linkedin": "<number>",
        "twitter": "<number>",
        "tiktok": "<number>"
      }
    }
  },
  "viral_content_ideas": [
    {
      "concept": "<viral content idea>",
      "format": "<video|carousel|poll|challenge>",
      "why_it_works": "<psychology behind why this will perform>",
      "execution_guide": "<step-by-step how to create it>"
    }
  ],
  "influencer_collaboration_ideas": [
    {
      "type": "<micro|macro|nano influencer>",
      "collaboration_format": "<format>",
      "expected_reach": "<range>",
      "brief": "<content brief for the influencer>"
    }
  ],
  "paid_amplification": {
    "top_posts_to_boost": ["<day X post — reason>"],
    "boosting_strategy": "<which posts to put budget behind and why>",
    "audience_targeting_for_boosted_posts": "<targeting parameters>"
  },
  "analytics_tracking_plan": {
    "weekly_review_checklist": ["<metric to review>"],
    "monthly_report_template": "<what to include in monthly social report>",
    "optimization_triggers": [
      {
        "if": "<metric condition>",
        "then": "<optimization action>"
      }
    ]
  }
}

Generate ALL 4 weeks with at least ${postsPerWeek} posts per active platform per week. Make every caption ready to post — no placeholders like [INSERT TEXT], write the actual content.`;

  try {
    const stream = await callClaudeStreaming({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-opus-4-7',
      maxTokens: 20000,
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
      const calendarData = JSON.parse(
        fullText.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim()
      );

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: {
          ...calendarData,
          generated_for: { brand, industry, platforms, goals, tone },
          generated_at: new Date().toISOString(),
          model: 'claude-opus-4-7',
        },
      })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'complete', raw_text: fullText })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Social media planner error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
}
