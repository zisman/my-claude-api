/**
 * AI-Powered Customer Persona Builder
 *
 * Generates deeply researched buyer personas and ICP profiles using Claude Opus 4.7.
 * Creates actionable personas grounded in behavioral psychology and jobs-to-be-done theory.
 *
 * Body params:
 *   product           {string}   Product/service name (required)
 *   description       {string}   What it does and key benefits (required)
 *   industry          {string}   Industry vertical (required)
 *   existingCustomers {string}   Description of current customer base (optional)
 *   jobTitles         {string[]} Target job titles / roles (optional)
 *   companySize       {string}   "solo"|"smb"|"mid_market"|"enterprise"|"all"
 *   useCase           {string}   Primary use case the product solves
 *   personaCount      {number}   Number of personas to generate (1-4, default: 3)
 *   researchContext   {string}   Any qualitative data you have (interviews, reviews, surveys)
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
    industry,
    existingCustomers = '',
    jobTitles = [],
    companySize = 'all',
    useCase = '',
    personaCount = 3,
    researchContext = '',
  } = req.body || {};

  if (!product || !description || !industry) {
    return res.status(400).json({
      success: false,
      error: 'product, description, and industry are required',
    });
  }

  const resolvedCount = Math.min(Math.max(personaCount, 1), 4);
  const jobTitlesStr = Array.isArray(jobTitles) ? jobTitles.join(', ') : jobTitles;

  const prompt = `You are a world-class user researcher and market strategist specializing in Jobs-to-be-Done theory, behavioral psychology, and B2B/B2C buyer journey mapping.

Create ${resolvedCount} detailed, research-grounded buyer personas for the following product.

**Product Intelligence:**
- Product: ${product}
- Description: ${description}
- Industry: ${industry}
- Primary Use Case: ${useCase || 'Infer from description'}
- Target Company Size: ${companySize}
- Target Job Titles: ${jobTitlesStr || 'Infer from context'}
- Current Customer Base: ${existingCustomers || 'Not described — infer from product'}
- Qualitative Research Context: ${researchContext || 'None provided — synthesize from product and industry knowledge'}

Apply the Jobs-to-be-Done framework: functional jobs, emotional jobs, and social jobs. Layer in pain point severity scoring and willingness-to-pay signals.

Return ONLY this JSON (no markdown):

{
  "icp_summary": {
    "total_addressable_personas": "<description of the overall audience>",
    "primary_buyer": "<which persona is the highest-value primary target>",
    "buying_unit_structure": "<who's involved in the purchase decision>",
    "typical_deal_complexity": "<Simple/Complex>",
    "average_sales_cycle": "<estimated timeline>",
    "strategic_insight": "<the single most important insight about this audience>"
  },
  "personas": [
    {
      "persona_name": "<fictional name>",
      "nickname": "<memorable label e.g. 'The Overwhelmed Operator'>",
      "photo_concept": "<describe a stock photo that represents this person>",
      "priority": "<Primary|Secondary|Tertiary>",
      "estimated_market_size": "<% of total addressable market>",
      "demographics": {
        "age_range": "<range>",
        "gender_distribution": "<if relevant>",
        "education": "<typical education level>",
        "income_range": "<personal income>",
        "location": "<geographic concentration>"
      },
      "professional_profile": {
        "title": "<typical job title>",
        "department": "<department>",
        "seniority": "<IC|Manager|Director|VP|C-Suite>",
        "years_experience": "<range>",
        "team_size_managed": "<number or N/A>",
        "company_type": "<startup|SMB|mid-market|enterprise>",
        "industry": "<their industry>",
        "annual_revenue_company": "<company revenue range>",
        "tech_stack_they_use": ["<tool>"],
        "budget_authority": "<Has budget|Influences budget|No budget authority>"
      },
      "jobs_to_be_done": {
        "functional_jobs": [
          {
            "job": "<what they're trying to accomplish>",
            "importance": "<High|Medium|Low>",
            "current_satisfaction": "<High|Medium|Low — how well current solutions work>"
          }
        ],
        "emotional_jobs": [
          {
            "job": "<how they want to feel>",
            "importance": "<High|Medium|Low>"
          }
        ],
        "social_jobs": [
          {
            "job": "<how they want to be perceived>",
            "importance": "<High|Medium|Low>"
          }
        ]
      },
      "pain_points": [
        {
          "pain": "<specific pain point>",
          "severity": <number 1-10>,
          "frequency": "<Daily|Weekly|Monthly|Occasional>",
          "current_workaround": "<how they handle it today>",
          "cost_of_pain": "<time, money, or emotional cost>"
        }
      ],
      "goals_and_motivations": {
        "professional_goals": ["<goal>"],
        "personal_motivations": ["<motivation>"],
        "success_metrics": ["<how they measure success in their role>"],
        "career_aspiration": "<where they want to be in 3-5 years>"
      },
      "buying_behavior": {
        "trigger_events": ["<event that makes them start looking for a solution>"],
        "research_process": "<how they research solutions>",
        "trusted_information_sources": ["<where they get info>"],
        "evaluation_criteria": [
          {
            "criterion": "<e.g. ease of use>",
            "weight": "<High|Medium|Low importance>"
          }
        ],
        "deal_breakers": ["<what kills a deal>"],
        "preferred_purchase_path": "<self-serve|sales-assisted|procurement>",
        "willingness_to_pay": "<price range they'd consider>",
        "time_to_decision": "<typical evaluation timeline>"
      },
      "objections": [
        {
          "objection": "<specific objection they raise>",
          "underlying_fear": "<what they're really afraid of>",
          "rebuttal": "<how to address it>",
          "proof_type_needed": "<case study|ROI data|trial|reference call>"
        }
      ],
      "messaging_guide": {
        "headline_that_resonates": "<headline written specifically for this persona>",
        "value_prop_angle": "<how to frame the product for this persona>",
        "emotional_hook": "<the emotional button to push>",
        "proof_that_converts": "<what evidence will close them>",
        "words_they_use": ["<exact phrases they say about their problem>"],
        "words_to_avoid": ["<language that puts them off>"],
        "content_formats_preferred": ["<blog|video|podcast|case study|webinar>"],
        "channels_they_use": ["<channel>"]
      },
      "day_in_the_life": "<200-word narrative of a typical day that reveals pain points naturally>",
      "quote": "<first-person quote that perfectly captures this persona's mindset>",
      "real_world_analogues": "<3 real companies or job listings that exemplify this persona>"
    }
  ],
  "cross_persona_insights": {
    "shared_pain_points": ["<pain felt by all personas>"],
    "diverging_needs": ["<where personas want different things>"],
    "messaging_hierarchy": "<which persona to lead marketing with and why>",
    "product_implication": "<what these personas reveal about product priorities>"
  },
  "go_to_market_implications": {
    "channel_by_persona": [
      {
        "persona": "<persona nickname>",
        "best_acquisition_channels": ["<channel>"],
        "content_strategy": "<what content attracts them>",
        "outreach_approach": "<how to reach them>"
      }
    ],
    "pricing_by_persona": "<pricing page recommendations based on persona WTP>",
    "sales_enablement_notes": "<what sales needs to know when talking to each persona>"
  }
}`;

  try {
    const result = await callClaude({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-opus-4-7',
      maxTokens: 10000,
      useThinking: true,
    });

    const personaData = parseJsonResponse(result.text);

    return res.json({
      success: true,
      data: {
        ...personaData,
        generated_for: { product, industry, personaCount: resolvedCount, companySize },
        generated_at: new Date().toISOString(),
        model: 'claude-opus-4-7',
      },
    });

  } catch (error) {
    console.error('Customer persona generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
