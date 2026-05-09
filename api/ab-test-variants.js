/**
 * A/B Test Variant Generator
 *
 * Generates statistically-grounded A/B test hypotheses and copy variants
 * for any marketing element using Claude Opus 4.7.
 *
 * Body params:
 *   element         {string}   What to test: "headline"|"cta"|"hero"|"pricing"|"email_subject"|"landing_page"|"ad_copy"|"form"
 *   currentVersion  {string}   The existing/control version (required)
 *   context         {string}   Page/campaign context (required)
 *   goal            {string}   Conversion goal being optimized
 *   audience        {string}   Who sees this element
 *   variantCount    {number}   Number of variants to generate (2-6, default: 3)
 *   testingPlatform {string}   "google_optimize"|"vwo"|"optimizely"|"ab_tasty"|"statsig"|"custom"
 *   currentConvRate {number}   Current conversion rate % (for sample size calc)
 *   weeklyTraffic   {number}   Weekly visitors to this page (for duration calc)
 */

import { applyCors, callClaude, parseJsonResponse } from './_lib/claude-client.js';

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    element,
    currentVersion,
    context,
    goal = 'conversion',
    audience = 'general visitors',
    variantCount = 3,
    testingPlatform = 'custom',
    currentConvRate,
    weeklyTraffic,
  } = req.body || {};

  if (!element || !currentVersion || !context) {
    return res.status(400).json({
      success: false,
      error: 'element, currentVersion, and context are required',
    });
  }

  const resolvedCount = Math.min(Math.max(variantCount, 2), 6);

  // Sample size calculation using simplified Evan Miller formula
  let sampleSizePerVariant = null;
  let estimatedTestDuration = null;
  if (currentConvRate && weeklyTraffic) {
    const baseRate = currentConvRate / 100;
    const mde = 0.1; // 10% minimum detectable effect
    const alpha = 0.05;
    const power = 0.8;
    // Simplified calculation
    const zAlpha = 1.96;
    const zBeta = 0.84;
    const p2 = baseRate * (1 + mde);
    const pBar = (baseRate + p2) / 2;
    const n = Math.ceil(
      Math.pow(zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(baseRate * (1 - baseRate) + p2 * (1 - p2)), 2)
      / Math.pow(p2 - baseRate, 2)
    );
    sampleSizePerVariant = n;
    const dailyTraffic = weeklyTraffic / 7;
    const daysNeeded = Math.ceil((n * (resolvedCount + 1)) / dailyTraffic);
    estimatedTestDuration = `~${daysNeeded} days (${Math.ceil(daysNeeded / 7)} weeks)`;
  }

  const prompt = `You are a world-class CRO (Conversion Rate Optimization) expert. Generate ${resolvedCount} A/B test variants with deep psychological and behavioral science grounding.

**Test Brief:**
- Element Being Tested: ${element}
- Current Control Version: "${currentVersion}"
- Page/Campaign Context: ${context}
- Conversion Goal: ${goal}
- Target Audience: ${audience}
- Testing Platform: ${testingPlatform}
${currentConvRate ? `- Current Conversion Rate: ${currentConvRate}%` : ''}
${weeklyTraffic ? `- Weekly Traffic: ${weeklyTraffic.toLocaleString()} visitors` : ''}

Generate ${resolvedCount} distinct challenger variants, each using a different psychological principle or copywriting approach. Each variant should be substantively different from the control and from each other.

Return ONLY this JSON (no markdown):

{
  "test_strategy": {
    "element": "${element}",
    "primary_hypothesis": "<the overarching hypothesis being tested>",
    "psychological_principles_used": ["<principle>"],
    "test_priority": "<High|Medium|Low — based on expected impact>",
    "recommended_traffic_split": "<e.g. 50/50 for 2 variants, 33/33/33 for 3>",
    "sample_size_per_variant": ${sampleSizePerVariant || '"Calculate based on your current conversion rate and desired MDE"'},
    "estimated_test_duration": "${estimatedTestDuration || 'Requires current conversion rate and traffic data to calculate'}",
    "minimum_detectable_effect": "10% relative improvement",
    "statistical_significance_target": "95%",
    "guardrail_metrics": ["<metric to watch that shouldn't drop>"]
  },
  "control": {
    "label": "Control (A)",
    "copy": "${currentVersion.replace(/"/g, '\\"')}",
    "psychological_appeal": "<what psychological trigger the control uses>",
    "strengths": ["<what it does well>"],
    "weaknesses": ["<what may be underperforming and why>"]
  },
  "variants": [
    {
      "label": "Variant B",
      "copy": "<the complete variant copy — ready to implement>",
      "hypothesis": "<specific hypothesis: 'We believe [variant] will outperform [control] because [reason]'>",
      "psychological_principle": "<e.g. Social Proof|Loss Aversion|Curiosity Gap|FOMO|Anchoring|Reciprocity>",
      "key_change": "<the primary change from control and why>",
      "target_psychology": "<the emotional/cognitive state this targets>",
      "predicted_direction": "<Increase|Decrease|Neutral — for the goal metric>",
      "confidence": "<High|Medium|Low — in this variant winning>",
      "rationale": "<detailed explanation of why this should win>",
      "implementation_notes": "<any technical or design notes for implementation>",
      "secondary_tests": ["<if this wins, what to test next>"]
    }
  ],
  "element_specific_guidance": {
    "what_NOT_to_change": ["<what to keep constant as control variables>"],
    "common_mistakes": ["<CRO mistake to avoid for this element type>"],
    "industry_benchmarks": "<typical conversion lift range when optimizing this element>"
  },
  "testing_protocol": {
    "pre_test_checklist": [
      "<thing to verify before launching>",
      "<QA check>",
      "<analytics verification>"
    ],
    "during_test": [
      "<what to monitor daily>",
      "<when to consider stopping early>",
      "<data quality checks>"
    ],
    "post_test_analysis": [
      "<segmentation analysis to run>",
      "<how to interpret inconclusive results>",
      "<what to do with the winner>"
    ]
  },
  "follow_up_test_roadmap": [
    {
      "test_sequence": 2,
      "element_to_test": "<next element in the optimization sequence>",
      "why_next": "<why test this after the current one>"
    }
  ]
}

Make every variant copy completely ready to implement — no placeholders, no [brackets], actual final copy.`;

  try {
    const result = await callClaude({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-opus-4-7',
      maxTokens: 6000,
      useThinking: true,
    });

    const testData = parseJsonResponse(result.text);

    return res.json({
      success: true,
      data: {
        ...testData,
        generated_for: { element, goal, audience, variantCount: resolvedCount },
        generated_at: new Date().toISOString(),
        model: 'claude-opus-4-7',
      },
    });

  } catch (error) {
    console.error('A/B test variant generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
