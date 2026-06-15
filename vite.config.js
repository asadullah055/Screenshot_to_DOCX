import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localOpenAiOcrPlugin(env)],
  };
});

function localOpenAiOcrPlugin(env) {
  return {
    name: 'local-openai-ocr-api',
    configureServer(server) {
      server.middlewares.use('/api/extract-text', async (req, res) => {
        if (req.method === 'OPTIONS') {
          sendJson(res, 204, {});
          return;
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed.' });
          return;
        }

        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
          sendJson(res, 500, { error: 'OPENAI_API_KEY is not configured in .env.' });
          return;
        }

        let payload;
        try {
          payload = JSON.parse(await readRequestBody(req));
        } catch {
          sendJson(res, 400, { error: 'Invalid JSON payload.' });
          return;
        }

        const { image, fileName } = payload;
        if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
          sendJson(res, 400, { error: 'A base64 image data URL is required.' });
          return;
        }

        try {
          const openaiResponse = await fetch(OPENAI_RESPONSES_URL, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: env.OPENAI_MODEL || DEFAULT_MODEL,
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
            sendJson(res, openaiResponse.status, {
              error: result?.error?.message || 'OpenAI request failed.',
            });
            return;
          }

          sendJson(res, 200, { text: extractOutputText(result) });
        } catch {
          sendJson(res, 500, { error: 'Unable to extract text with ChatGPT.' });
        }
      });
    },
  };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
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

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
