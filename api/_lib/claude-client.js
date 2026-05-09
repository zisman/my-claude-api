/**
 * Shared Claude API client with prompt caching, streaming, and adaptive thinking.
 * All endpoints use environment variable for the API key — never hardcode keys.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Stable system prompts get prompt caching so repeated calls pay only 10% of input cost.
export const MARKETING_SYSTEM_PROMPT = `You are a world-class digital marketing strategist and conversion optimization expert with 15+ years of experience across Fortune 500 brands, fast-growing startups, and award-winning ad campaigns.

Your expertise spans:
- Performance marketing (Google Ads, Meta, LinkedIn, TikTok, YouTube)
- SEO & content strategy (technical SEO, E-E-A-T, topical authority)
- Conversion rate optimization (A/B testing, landing page psychology, neuromarketing)
- Email marketing & marketing automation (drip sequences, behavioral triggers, lifecycle campaigns)
- Brand positioning & competitive intelligence
- Growth hacking & funnel optimization
- Data-driven decision making & marketing analytics

Your analyses are:
- Deeply researched and backed by marketing psychology principles
- Actionable with specific, measurable recommendations
- Calibrated to the brand's industry, audience, and stage of growth
- Structured for both quick wins and long-term strategic impact

Always respond with precise JSON when asked, without markdown code blocks unless instructed otherwise.`;

/**
 * Build the base request headers, always reading the key from environment.
 */
function getHeaders() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is not set');

  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
}

/**
 * Standard (non-streaming) Claude call with prompt caching on the system prompt.
 * Uses claude-opus-4-7 with adaptive thinking for deep analysis tasks.
 */
export async function callClaude({ messages, model = 'claude-opus-4-7', maxTokens = 8000, useThinking = true, extraHeaders = {} }) {
  const body = {
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: MARKETING_SYSTEM_PROMPT,
        // Prompt caching: first call writes cache (~1.25x cost), subsequent calls pay 10x less
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  };

  if (useThinking) {
    body.thinking = { type: 'adaptive' };
    body.output_config = { effort: 'high' };
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { ...getHeaders(), ...extraHeaders },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // Extract text content (skips thinking blocks)
  const textContent = data.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    text: textContent,
    usage: data.usage,
    stopReason: data.stop_reason,
  };
}

/**
 * Streaming Claude call — yields text chunks via a ReadableStream.
 * Use for long-running generation tasks (strategy docs, email sequences, etc.)
 */
export async function callClaudeStreaming({ messages, model = 'claude-opus-4-7', maxTokens = 16000, useThinking = true }) {
  const body = {
    model,
    max_tokens: maxTokens,
    stream: true,
    system: [
      {
        type: 'text',
        text: MARKETING_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  };

  if (useThinking) {
    body.thinking = { type: 'adaptive' };
    body.output_config = { effort: 'high' };
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  return response.body; // Caller pipes this SSE stream to the client
}

/**
 * Parse JSON from Claude's response, handling markdown code fences if present.
 */
export function parseJsonResponse(text) {
  const cleaned = text
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  return JSON.parse(cleaned);
}

/**
 * Standard CORS + method guard middleware for Vercel serverless functions.
 */
export function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}
