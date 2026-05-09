/**
 * SEO Content Optimizer
 *
 * Deep SEO analysis and content optimization using Claude Opus 4.7 with:
 * - Real page fetching via web_fetch server tool (when URL provided)
 * - Keyword strategy, gap analysis, on-page recommendations
 * - Technical SEO audit, schema markup, meta tag generation
 * - Content rewrite suggestions with E-E-A-T signals
 *
 * Body params:
 *   url             {string}   Page URL to analyze (optional if content provided)
 *   content         {string}   Raw page content/copy to optimize (optional if url provided)
 *   targetKeywords  {string[]} Primary and secondary keywords to target
 *   industry        {string}   Industry vertical for competitive context
 *   pageType        {string}   "homepage"|"landing"|"blog"|"product"|"category"|"local"
 *   competitors     {string[]} Competitor URLs for gap analysis (optional)
 *   locale          {string}   e.g. "en-US", "he-IL" (default: "en-US")
 */

import Anthropic from '@anthropic-ai/sdk';
import { applyCors, MARKETING_SYSTEM_PROMPT, parseJsonResponse } from './_lib/claude-client.js';

const client = new Anthropic();

const SEO_ANALYSIS_PROMPT = `You are conducting a comprehensive SEO audit and content optimization analysis. Use web_fetch to retrieve the actual page content when a URL is provided.

Analyze every SEO dimension with expert precision and return actionable, prioritized recommendations.

Return ONLY this JSON (no markdown):

{
  "page_overview": {
    "title": "<detected or inferred page title>",
    "url": "<analyzed URL if provided>",
    "page_type": "<homepage|landing|blog|product|category|local>",
    "word_count": <number>,
    "primary_topic": "<main topic/theme>",
    "current_ranking_potential": "<Low|Medium|High|Very High>",
    "overall_seo_score": <number 0-100>,
    "seo_grade": "<A+|A|A-|B+|B|B-|C+|C|D|F>"
  },
  "keyword_analysis": {
    "primary_keyword": {
      "keyword": "<main target keyword>",
      "search_intent": "<Informational|Navigational|Transactional|Commercial>",
      "competition_level": "<Low|Medium|High|Very High>",
      "estimated_monthly_volume": "<range>",
      "current_density": "<% found in content>",
      "optimal_density": "<recommended %>",
      "placement_score": <number 0-100>,
      "missing_placements": ["<title tag>", "<H1>", "<first paragraph>", "<meta description>"]
    },
    "secondary_keywords": [
      {
        "keyword": "<keyword>",
        "intent": "<intent>",
        "priority": "<High|Medium|Low>",
        "suggested_placement": "<where to add it>"
      }
    ],
    "semantic_keywords": ["<LSI and related terms to include>"],
    "long_tail_opportunities": [
      {
        "keyword": "<long-tail phrase>",
        "why": "<why it's valuable>",
        "content_angle": "<how to target it>"
      }
    ],
    "keyword_cannibalization_risk": "<description of any cannibalization issues found>"
  },
  "on_page_seo": {
    "title_tag": {
      "current": "<current title or N/A>",
      "score": <number 0-100>,
      "issues": ["<issue>"],
      "optimized_version": "<your rewritten title — 50-60 chars, keyword-first>",
      "character_count": <number>
    },
    "meta_description": {
      "current": "<current meta description or N/A>",
      "score": <number 0-100>,
      "issues": ["<issue>"],
      "optimized_version": "<your rewritten meta description — 150-160 chars, includes CTA>",
      "character_count": <number>
    },
    "heading_structure": {
      "score": <number 0-100>,
      "current_h1": "<current H1 or N/A>",
      "optimized_h1": "<rewritten H1>",
      "issues": ["<issue>"],
      "recommended_heading_outline": [
        {"level": "H1", "text": "<heading>"},
        {"level": "H2", "text": "<heading>"},
        {"level": "H3", "text": "<heading>"}
      ]
    },
    "content_quality": {
      "score": <number 0-100>,
      "readability_score": "<Flesch-Kincaid estimate>",
      "issues": ["<issue>"],
      "strengths": ["<strength>"],
      "eeat_signals": {
        "experience": "<present|missing|weak>",
        "expertise": "<present|missing|weak>",
        "authoritativeness": "<present|missing|weak>",
        "trustworthiness": "<present|missing|weak>"
      }
    },
    "url_structure": {
      "score": <number 0-100>,
      "issues": ["<issue>"],
      "optimized_slug": "<recommended URL slug>"
    },
    "image_optimization": {
      "score": <number 0-100>,
      "issues": ["<issue>"],
      "fixes": ["<fix>"]
    },
    "internal_linking": {
      "score": <number 0-100>,
      "issues": ["<issue>"],
      "opportunities": ["<where and what to link>"]
    }
  },
  "technical_seo": {
    "overall_technical_score": <number 0-100>,
    "core_web_vitals": {
      "lcp_estimate": "<Good|Needs Improvement|Poor>",
      "cls_estimate": "<Good|Needs Improvement|Poor>",
      "inp_estimate": "<Good|Needs Improvement|Poor>",
      "improvement_actions": ["<specific technical fix>"]
    },
    "mobile_friendliness": {
      "score": <number 0-100>,
      "issues": ["<issue>"]
    },
    "schema_markup": {
      "current_schema": "<types detected or 'None'>",
      "recommended_schemas": ["<schema type>"],
      "schema_code": "<JSON-LD schema markup to add — complete, copy-pasteable code>",
      "impact": "<expected impact of adding schema>"
    },
    "crawlability": {
      "issues": ["<potential crawl issue>"],
      "fixes": ["<fix>"]
    },
    "page_speed_factors": ["<specific factor affecting speed>"]
  },
  "content_optimization": {
    "content_gaps": ["<topic or section missing from the page>"],
    "content_to_add": [
      {
        "section": "<section title>",
        "why": "<why it helps SEO>",
        "suggested_content": "<brief content outline>"
      }
    ],
    "content_to_remove_or_consolidate": ["<thin or duplicate content to address>"],
    "faq_opportunities": [
      {
        "question": "<question to add as FAQ>",
        "answer_guidance": "<how to answer it for SEO>"
      }
    ],
    "featured_snippet_opportunities": [
      {
        "query": "<query this page could win a featured snippet for>",
        "snippet_type": "<paragraph|list|table>",
        "how_to_optimize": "<exact changes to make>"
      }
    ]
  },
  "optimized_content_rewrite": {
    "opening_paragraph": "<rewritten opening paragraph — keyword-rich, compelling, 100-150 words>",
    "suggested_cta": "<optimized call-to-action copy>",
    "meta_tags_html": "<complete HTML meta tags block — title, description, og:title, og:description, canonical>"
  },
  "link_building": {
    "internal_link_recommendations": [
      {
        "anchor_text": "<anchor text>",
        "link_to": "<suggested internal page type to link to>",
        "placement": "<where in the content>"
      }
    ],
    "external_link_opportunities": ["<authority sites to cite for credibility>"],
    "backlink_angles": [
      {
        "tactic": "<link building tactic>",
        "rationale": "<why it would work for this page>"
      }
    ]
  },
  "competitor_gaps": {
    "topics_competitors_cover": ["<topic your competitors rank for that this page misses>"],
    "content_depth_gap": "<how much deeper competitors go on this topic>",
    "quick_wins_vs_competitors": ["<specific thing to add to outrank>"]
  },
  "action_plan": {
    "immediate_wins": [
      {
        "action": "<specific action>",
        "impact": "<High|Medium|Low>",
        "effort": "<Low|Medium|High>",
        "expected_result": "<e.g. +20% organic CTR>"
      }
    ],
    "week_1_2": ["<action>"],
    "month_1": ["<action>"],
    "ongoing": ["<ongoing SEO practice>"]
  },
  "top_3_priorities": [
    "<single most impactful SEO change>",
    "<second priority>",
    "<third priority>"
  ]
}`;

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    url,
    content,
    targetKeywords = [],
    industry = 'general',
    pageType = 'landing',
    competitors = [],
    locale = 'en-US',
  } = req.body || {};

  if (!url && !content) {
    return res.status(400).json({ success: false, error: 'Either url or content is required' });
  }

  if (url) {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format' });
    }
  }

  const keywordsStr = Array.isArray(targetKeywords) ? targetKeywords.join(', ') : targetKeywords;
  const competitorsStr = Array.isArray(competitors) ? competitors.join(', ') : competitors;

  const userMessage = `${SEO_ANALYSIS_PROMPT}

**Analysis Parameters:**
- Page URL: ${url || 'Not provided — analyze the content below'}
- Target Keywords: ${keywordsStr || 'Infer from content'}
- Industry: ${industry}
- Page Type: ${pageType}
- Locale: ${locale}
- Competitor URLs for gap analysis: ${competitorsStr || 'None provided'}

${content ? `**Page Content to Analyze:**\n${content}` : `Use web_fetch to retrieve and analyze: ${url}`}`;

  try {
    const tools = url
      ? [{ type: 'web_fetch_20260209', name: 'web_fetch' }]
      : undefined;

    const messages = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 10000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high' },
      ...(tools && { tools }),
      system: [
        {
          type: 'text',
          text: MARKETING_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    // Handle multi-turn tool use (web_fetch) automatically via .create()
    // Extract final text block
    let finalText;
    if (messages.stop_reason === 'tool_use' && tools) {
      // Claude wants to fetch the URL — run a full agentic loop
      const toolUseBlock = messages.content.find(b => b.type === 'tool_use');
      const fetchResponse = await fetch(toolUseBlock.input.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0)' },
      });
      const pageText = await fetchResponse.text();

      const followUp = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 10000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high' },
        tools,
        system: [
          {
            type: 'text',
            text: MARKETING_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: messages.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUseBlock.id,
                content: pageText.slice(0, 50000), // cap at 50k chars
              },
            ],
          },
        ],
      });

      const textBlock = followUp.content.findLast(b => b.type === 'text');
      if (!textBlock) throw new Error('No text response from Claude after tool use');
      finalText = textBlock.text;
    } else {
      const textBlock = messages.content.findLast(b => b.type === 'text');
      if (!textBlock) throw new Error('No text response from Claude');
      finalText = textBlock.text;
    }

    const seoData = parseJsonResponse(finalText);

    return res.json({
      success: true,
      data: {
        ...seoData,
        analyzed_url: url || null,
        target_keywords: targetKeywords,
        industry,
        locale,
        generated_at: new Date().toISOString(),
        model: 'claude-opus-4-7',
      },
    });

  } catch (error) {
    console.error('SEO optimization error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
