import { config } from '../config.js';

function extractContent(payload) {
  const choice = payload?.choices?.[0]?.message?.content;
  if (typeof choice === 'string') {
    return choice.trim();
  }

  if (Array.isArray(choice)) {
    return choice
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }

  if (typeof payload?.output_text === 'string') {
    return payload.output_text.trim();
  }

  return '';
}

export async function generateDialogueFeedback({ systemPrompt, userPrompt }) {
  const response = await fetch(`${config.arkBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.arkApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.arkDoubaoFlashEndpointId,
      temperature: 0.4,
      max_tokens: 120,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ark Flash failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  const content = extractContent(payload);
  if (!content) {
    throw new Error(`Ark Flash returned empty content: ${JSON.stringify(payload)}`);
  }

  return content;
}
