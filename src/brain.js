// Optional Claude brain for the copywriting agents (Lexi + Mira).
// With ANTHROPIC_API_KEY set, listing copy and customer replies are written
// by Claude; without it, agents fall back to built-in templates so the
// dashboard works out of the box.

let client = null;
let unavailable = false;

async function getClient() {
  if (unavailable || !process.env.ANTHROPIC_API_KEY) return null;
  if (client) return client;
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
    return client;
  } catch (err) {
    unavailable = true;
    console.warn('[brain] @anthropic-ai/sdk not installed, using template mode:', err.message);
    return null;
  }
}

async function generate(prompt, maxTokens = 400) {
  const c = await getClient();
  if (!c) return null;
  try {
    const response = await c.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content.find((b) => b.type === 'text');
    return text ? text.text.trim() : null;
  } catch (err) {
    console.warn('[brain] Claude call failed, falling back to template:', err.message);
    return null;
  }
}

function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY) && !unavailable;
}

module.exports = { generate, aiEnabled };
