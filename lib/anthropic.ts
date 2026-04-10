import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Map Anthropic model names to OpenAI equivalents
function mapModel(model: string): string {
  if (model.includes('haiku')) return 'gpt-4o-mini';
  if (model.includes('sonnet')) return 'gpt-4o';
  return 'gpt-4o-mini';
}

export async function callClaude(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: mapModel(model),
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

export async function streamClaude(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<ReadableStream> {
  const stream = await openai.chat.completions.create({
    model: mapModel(model),
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) controller.enqueue(new TextEncoder().encode(text));
      }
      controller.close();
    },
  });
}
