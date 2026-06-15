const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return response(204, {});
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return response(500, { error: 'OPENAI_API_KEY is not configured.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid JSON payload.' });
  }

  const { image, fileName } = payload;
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return response(400, { error: 'A base64 image data URL is required.' });
  }

  try {
    const openaiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  'Extract all readable text from this image.',
                  'Return only the extracted text.',
                  'Preserve line breaks and table-like spacing when possible.',
                  'Do not describe the image.',
                  fileName ? `Image filename: ${fileName}` : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
              },
              {
                type: 'input_image',
                image_url: image,
                detail: 'high',
              },
            ],
          },
        ],
        max_output_tokens: 4096,
      }),
    });

    const result = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return response(openaiResponse.status, {
        error: result?.error?.message || 'OpenAI request failed.',
      });
    }

    return response(200, {
      text: extractOutputText(result),
    });
  } catch {
    return response(500, { error: 'Unable to extract text with ChatGPT.' });
  }
}

function extractOutputText(result) {
  if (typeof result.output_text === 'string') {
    return result.output_text;
  }

  return (result.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text)
    .join('\n')
    .trim();
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}
