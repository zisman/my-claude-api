/**
 * Email Campaign Sequence Generator
 *
 * Generates complete email sequences using Claude Opus 4.7 with streaming:
 * - Cold outreach sequences (5-7 touch cadence)
 * - Drip / nurture sequences (onboarding, lead nurture, re-engagement)
 * - Newsletter editions (value-first content)
 * - Promotional campaigns (launch, sale, event)
 * - Win-back campaigns (churn recovery)
 *
 * Body params:
 *   sequenceType    {string}   "cold_outreach"|"drip"|"newsletter"|"promotional"|"winback"
 *   product         {string}   Product/service name (required)
 *   description     {string}   What it does and key benefits (required)
 *   targetAudience  {string}   Who this sequence targets
 *   tone            {string}   "professional"|"conversational"|"urgent"|"friendly"|"formal"
 *   goal            {string}   "demo_booking"|"purchase"|"trial"|"webinar"|"content_download"
 *   senderName      {string}   Name of the sender persona
 *   companyName     {string}   Company name
 *   uniqueValue     {string}   Core differentiator
 *   emailCount      {number}   Number of emails (2-10, default varies by type)
 *   industryContext {string}   Industry for personalization
 */

import { applyCors, callClaudeStreaming } from './_lib/claude-client.js';

const SEQUENCE_CONFIGS = {
  cold_outreach: { defaultCount: 6, maxTokens: 12000 },
  drip:          { defaultCount: 7, maxTokens: 14000 },
  newsletter:    { defaultCount: 4, maxTokens: 10000 },
  promotional:   { defaultCount: 5, maxTokens: 10000 },
  winback:       { defaultCount: 4, maxTokens: 8000  },
};

function buildPrompt({
  sequenceType, product, description, targetAudience, tone, goal,
  senderName, companyName, uniqueValue, emailCount, industryContext,
}) {
  const typeInstructions = {
    cold_outreach: `Create a cold outreach email sequence. Each email must feel personal, not spammy. Use the PAS (Problem-Agitate-Solution) and pattern-interrupt frameworks. Include a permission-based nurture approach with value in every touch. Vary subject line styles: curiosity, direct, question, social proof, follow-up.`,
    drip: `Create a drip nurture sequence. Emails should build on each other, delivering increasing value before the ask. Use storytelling, case studies, and education. Structure: welcome → value → pain point → solution showcase → social proof → urgency → CTA.`,
    newsletter: `Create newsletter editions that deliver genuine value. Each should have: a compelling hook, insightful main content (200-400 words), practical takeaway, and soft CTA. Include subject line A/B variants for each.`,
    promotional: `Create a promotional campaign sequence with a clear narrative arc. Build anticipation → reveal → social proof → urgency → last chance. Use power words and urgency ethically. Include countdown timer copy.`,
    winback: `Create a win-back sequence for lapsed customers or churned users. Acknowledge absence without blame. Lead with value, new features, or exclusive offer. Use empathy and social proof. Final email: breakup email (reverse psychology).`,
  };

  return `Generate a complete ${sequenceType.replace('_', ' ')} email sequence.

**Campaign Details:**
- Product/Service: ${product}
- Description: ${description}
- Target Audience: ${targetAudience}
- Unique Value Proposition: ${uniqueValue || 'Infer from description'}
- Sender Name: ${senderName || 'Alex'}
- Company: ${companyName || product}
- Tone: ${tone}
- Campaign Goal: ${goal}
- Industry: ${industryContext || 'General'}
- Number of Emails: ${emailCount}

**Sequence Strategy:**
${typeInstructions[sequenceType]}

Return ONLY this JSON (no markdown):

{
  "sequence_overview": {
    "type": "${sequenceType}",
    "total_emails": ${emailCount},
    "estimated_duration": "<e.g. 14 days>",
    "overall_strategy": "<the psychological arc and persuasion strategy>",
    "send_timing": "<day-by-day or trigger-based send schedule>",
    "expected_open_rate": "<industry benchmark for this type>",
    "expected_reply_rate": "<if cold outreach>",
    "key_copywriting_frameworks": ["<AIDA|PAS|FAB|StoryBrand|etc>"]
  },
  "emails": [
    {
      "email_number": 1,
      "send_timing": "<immediately|day 1|after trigger X>",
      "purpose": "<what this email achieves in the sequence>",
      "subject_lines": {
        "primary": "<primary subject line — tested formula>",
        "ab_variant": "<alternative to A/B test>",
        "preview_text": "<email preview/preheader text — 90 chars>",
        "subject_analysis": "<why these subject lines will get opened>"
      },
      "from_name": "<From name to display>",
      "body": {
        "opening_hook": "<first sentence — must grab attention immediately>",
        "full_copy": "<complete email body — properly formatted with line breaks>",
        "ps_line": "<P.S. line — optional but high-read area>",
        "cta": {
          "primary_cta_text": "<button/link text>",
          "cta_url_placeholder": "<{{CTA_URL}}>",
          "cta_placement": "<where CTA appears in email>"
        }
      },
      "personalization_tokens": ["<{{FIRST_NAME}}>", "<{{COMPANY}}>"],
      "estimated_read_time": "<X minutes>",
      "word_count": <number>,
      "copywriting_technique": "<technique used in this email>"
    }
  ],
  "segmentation_variants": {
    "high_intent_variant": "<how to modify emails for high-intent leads>",
    "cold_audience_variant": "<adjustments for totally cold prospects>",
    "enterprise_variant": "<tone/content adjustments for enterprise targets>"
  },
  "deliverability_checklist": [
    "<specific deliverability best practice>",
    "<spam word to avoid>",
    "<technical setup recommendation>"
  ],
  "ab_testing_plan": [
    {
      "email_number": <number>,
      "element_to_test": "<what to A/B test>",
      "variant_a": "<control>",
      "variant_b": "<challenger>",
      "success_metric": "<open rate|CTR|reply rate|conversion>"
    }
  ],
  "performance_benchmarks": {
    "good_open_rate": "<% for this type>",
    "good_ctr": "<%>",
    "good_conversion": "<%>"
  },
  "integration_notes": "<recommended ESP platform, tagging, automation trigger logic>"
}`;
}

export default async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const {
    sequenceType = 'drip',
    product,
    description,
    targetAudience = 'potential customers',
    tone = 'conversational',
    goal = 'demo_booking',
    senderName = 'Alex',
    companyName,
    uniqueValue = '',
    emailCount,
    industryContext = '',
  } = req.body || {};

  if (!product || !description) {
    return res.status(400).json({ success: false, error: 'product and description are required' });
  }

  const validTypes = Object.keys(SEQUENCE_CONFIGS);
  if (!validTypes.includes(sequenceType)) {
    return res.status(400).json({
      success: false,
      error: `sequenceType must be one of: ${validTypes.join(', ')}`,
    });
  }

  const config = SEQUENCE_CONFIGS[sequenceType];
  const resolvedEmailCount = Math.min(Math.max(emailCount || config.defaultCount, 2), 10);

  const prompt = buildPrompt({
    sequenceType, product, description, targetAudience, tone, goal,
    senderName, companyName, uniqueValue, emailCount: resolvedEmailCount, industryContext,
  });

  try {
    const stream = await callClaudeStreaming({
      messages: [{ role: 'user', content: prompt }],
      model: 'claude-opus-4-7',
      maxTokens: config.maxTokens,
      useThinking: true,
    });

    // Stream the SSE response directly to the client
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
          // skip malformed SSE events
        }
      }
    }

    // Send final structured data
    try {
      const emailData = JSON.parse(
        fullText.replace(/^```json\s*/m, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim()
      );

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        data: {
          ...emailData,
          generated_for: { product, sequenceType, emailCount: resolvedEmailCount, goal, tone },
          generated_at: new Date().toISOString(),
          model: 'claude-opus-4-7',
        },
      })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'complete', raw_text: fullText })}\n\n`);
    }

    res.end();

  } catch (error) {
    console.error('Email campaign generation error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
}
