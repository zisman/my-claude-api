import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a social media expert for paragliding clubs. You create engaging, authentic posts that capture the thrill of flight and inspire people to join the sport.
Write content that is enthusiastic, safety-conscious, and community-focused. Include relevant hashtags. Keep posts concise and platform-appropriate.`;

export async function generateSocialPost({ platform, topic, tone, clubName, location }) {
  const platformGuidelines = {
    instagram: 'visual-first, 2200 chars max, 5-10 hashtags, use emojis',
    facebook: 'conversational, can be longer, 1-3 hashtags, storytelling style',
    twitter: '280 chars max, 2-3 hashtags, punchy and direct',
    linkedin: 'professional tone, minimal emojis, focus on achievements and education',
    whatsapp: 'casual and friendly, minimal formatting, no hashtags',
  };

  const prompt = `Create a ${platform} post for ${clubName || 'our paragliding club'}${location ? ` based in ${location}` : ''}.

Topic: ${topic}
Tone: ${tone || 'enthusiastic and inspiring'}
Platform guidelines: ${platformGuidelines[platform] || 'engaging and relevant'}

Write only the post content, ready to publish.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  return textBlock?.text || '';
}

export async function generateCampaignIdeas({ goal, targetAudience, budget, clubName }) {
  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: `Generate 3 marketing campaign ideas for ${clubName || 'a paragliding club'}.
Goal: ${goal}
Target audience: ${targetAudience || 'adventure seekers'}
Budget: ${budget ? `${budget} ILS` : 'flexible'}

For each campaign provide: name, description, recommended platforms, content ideas, and expected outcomes. Format as JSON array.`,
    }],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  try {
    const jsonMatch = textBlock?.text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [{ description: textBlock?.text || '' }];
  }
}
