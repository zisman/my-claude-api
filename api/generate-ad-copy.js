/**
 * Multi-Platform Ad Copy Generator
 *
 * Generates platform-optimized ad copy for Google, Meta, LinkedIn, TikTok, and YouTube
 * using Claude Opus 4.7 with adaptive thinking and prompt caching.
 *
 * Body params:
 *   product         {string}   Product/service name (required)
 *   description     {string}   What it does and its key benefits (required)
 *   targetAudience  {string}   Who you're targeting
 *   uniqueValue     {string}   Core differentiator / unique selling proposition
 *   tone            {string}   e.g. "professional", "playful", "urgent", "inspirational"
 *   platforms       {string[]} Which platforms to generate for (defaults to all)
 *   budget          {string}   Budget range hint for strategy context
 *   goal            {string}   Campaign goal: "awareness"|"leads"|"sales"|"app_installs"
 */

import { applyCors, callClaude, parseJsonResponse } from './_lib/claude-client.js';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    product,
    description,
    targetAudience = 'general consumers',
    uniqueValue = '',
    tone = 'professional',
    platforms = ['google', 'meta', 'linkedin', 'tiktok', 'youtube'],
    budget = 'not specified',
    goal = 'leads',
  } = req.body || {};

  if (!product || !description) {
    return res.status(400).json({ success: false, error: 'product and description are required' });
  }

  const platformsStr = Array.isArray(platforms) ? platforms.join(', ') : platforms;

  const prompt = `Generate high-converting ad copy for the following campaign:

**Product/Service:** ${product}
**Description:** ${description}
**Target Audience:** ${targetAudience}
**Unique Value Proposition:** ${uniqueValue || 'Not specified — infer from description'}
**Desired Tone:** ${tone}
**Campaign Goal:** ${goal}
**Monthly Budget:** ${budget}
**Platforms Required:** ${platformsStr}

For each requested platform, generate multiple ad variants optimized for that platform's format, audience psychology, and best practices. Include character counts where platform limits apply.

Return ONLY this JSON (no markdown):

{
  "campaign_brief": {
    "core_message": "<the single most compelling message thread across all ads>",
    "key_benefits": ["<benefit 1>", "<benefit 2>", "<benefit 3>"],
    "emotional_hook": "<the primary emotional trigger being leveraged>",
    "audience_insight": "<one key psychological insight about this audience>",
    "recommended_goal": "${goal}"
  },
  "platforms": {
    "google": {
      "search_ads": [
        {
          "variant": "A",
          "headlines": [
            "<headline 1 max 30 chars>",
            "<headline 2 max 30 chars>",
            "<headline 3 max 30 chars>",
            "<headline 4 max 30 chars>",
            "<headline 5 max 30 chars>"
          ],
          "descriptions": [
            "<description 1 max 90 chars>",
            "<description 2 max 90 chars>"
          ],
          "display_url_path": "<path1>/<path2>",
          "strategy": "<why these headlines work>"
        },
        {
          "variant": "B",
          "headlines": ["<h1>","<h2>","<h3>","<h4>","<h5>"],
          "descriptions": ["<d1>","<d2>"],
          "display_url_path": "<path>",
          "strategy": "<rationale>"
        }
      ],
      "performance_max_assets": {
        "short_headlines": ["<max 30 chars each — 5 variants>"],
        "long_headlines": ["<max 90 chars — 3 variants>"],
        "descriptions": ["<max 90 chars — 4 variants>"],
        "call_to_actions": ["<CTA suggestions>"]
      }
    },
    "meta": {
      "feed_ads": [
        {
          "variant": "A",
          "primary_text": "<125 chars or less — hook-first>",
          "headline": "<27 chars — news-feed bold text>",
          "description": "<27 chars — optional subtext>",
          "cta_button": "<Shop Now|Learn More|Sign Up|Get Quote|Book Now>",
          "visual_concept": "<describe ideal image or video concept>",
          "hook_style": "<pain point|social proof|curiosity|transformation>",
          "strategy": "<why this will perform>"
        },
        {
          "variant": "B",
          "primary_text": "<primary text>",
          "headline": "<headline>",
          "description": "<description>",
          "cta_button": "<CTA>",
          "visual_concept": "<visual>",
          "hook_style": "<style>",
          "strategy": "<rationale>"
        }
      ],
      "story_reel_ads": [
        {
          "variant": "A",
          "hook_text": "<first 3 seconds on-screen text — grabs attention>",
          "body_text": "<middle content text>",
          "cta_overlay": "<CTA text on screen>",
          "caption": "<caption for reel>",
          "visual_concept": "<vertical video concept>"
        }
      ],
      "carousel_ads": {
        "headline": "<overall carousel headline>",
        "cards": [
          {"card_number": 1, "headline": "<card headline>", "description": "<card body>", "visual": "<image concept>"},
          {"card_number": 2, "headline": "<card headline>", "description": "<card body>", "visual": "<image concept>"},
          {"card_number": 3, "headline": "<card headline>", "description": "<card body>", "visual": "<image concept>"}
        ]
      }
    },
    "linkedin": {
      "sponsored_content": [
        {
          "variant": "A",
          "intro_text": "<150 chars — professional tone, insight-led>",
          "headline": "<70 chars>",
          "description": "<100 chars>",
          "cta": "<Download|Learn More|Register|Request Demo>",
          "visual_concept": "<professional imagery concept>",
          "targeting_notes": "<recommended LinkedIn targeting parameters>",
          "strategy": "<B2B psychology rationale>"
        }
      ],
      "message_ads": {
        "subject": "<subject line>",
        "message_body": "<personalized message body — 500 chars max>",
        "cta_text": "<button text>",
        "sender_persona": "<recommended sender job title for authenticity>"
      },
      "thought_leadership_post": "<organic post to boost — 1300 chars, storytelling format, ends with soft CTA>"
    },
    "tiktok": {
      "video_ads": [
        {
          "variant": "A",
          "hook_0_3s": "<first 3 seconds script — pattern interrupt>",
          "body_3_15s": "<problem/solution content>",
          "cta_15_20s": "<closing CTA>",
          "caption": "<TikTok caption with hashtags>",
          "sound_strategy": "<trending audio recommendation or music mood>",
          "creator_brief": "<what type of creator/style works best>",
          "ugc_angle": "<user-generated content angle if applicable>"
        }
      ]
    },
    "youtube": {
      "skippable_instream": {
        "first_5s_hook": "<must keep viewers before skip button — compelling hook>",
        "body_5_30s": "<key message content>",
        "cta": "<clear conversion action>",
        "companion_banner_text": "<text for companion banner ad>"
      },
      "bumper_ads_6s": [
        "<6-second bumper script variant 1>",
        "<6-second bumper script variant 2>"
      ],
      "video_discovery_ads": {
        "title": "<100 chars — searchable, curious>",
        "description_line1": "<35 chars>",
        "description_line2": "<35 chars>"
      }
    }
  },
  "copy_frameworks_used": ["<AIDA|PAS|FAB|Before-After-Bridge|4Ps>"],
  "ab_testing_priority": "<which variant to test first and why>",
  "budget_allocation_suggestion": {
    "google": "<% recommendation>",
    "meta": "<% recommendation>",
    "linkedin": "<% recommendation if included>",
    "tiktok": "<% recommendation if included>"
  },
  "retargeting_copy": {
    "warm_audience_angle": "<different angle for people who visited but didn't convert>",
    "retargeting_headline": "<retargeting specific headline>",
    "retargeting_body": "<retargeting body copy>"
  }
}

Only include platform keys for platforms in [${platformsStr}]. Omit platforms not in the list.`;

  try {
    const result = await callClaude({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-opus-4-7',
      maxTokens: 8000,
      useThinking: true,
    });

    const adData = parseJsonResponse(result.text);

    return res.json({
      success: true,
      data: {
        ...adData,
        generated_for: { product, goal, platforms, tone },
        generated_at: new Date().toISOString(),
        model: 'claude-opus-4-7',
      },
    });

  } catch (error) {
    console.error('Ad copy generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
