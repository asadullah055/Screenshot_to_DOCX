import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.4-mini';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 15 * 1024 * 1024);

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, 'dist');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
};

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/healthz') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.url?.startsWith('/api/extract-text')) {
      await handleExtractText(req, res);
      return;
    }

    await serveStatic(req, res);
  } catch {
    sendJson(res, 500, { error: 'Internal server error.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

async function handleExtractText(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: 'OPENAI_API_KEY is not configured.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readRequestBody(req));
  } catch (error) {
    const status = error.code === 'BODY_TOO_LARGE' ? 413 : 400;
    const message = status === 413 ? 'Request body is too large.' : 'Invalid JSON payload.';
    sendJson(res, status, { error: message });
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
      sendJson(res, openaiResponse.status, {
        error: result?.error?.message || 'OpenAI request failed.',
      });
      return;
    }

    sendJson(res, 200, { text: extractOutputText(result) });
  } catch {
    sendJson(res, 500, { error: 'Unable to extract text with ChatGPT.' });
  }
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  const requestPath = getSafeRequestPath(req.url || '/');
  const requestedFile = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.join(distDir, requestedFile);
  const relativePath = path.relative(distDir, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    sendJson(res, 403, { error: 'Forbidden.' });
    return;
  }

  const existingPath = await getExistingFilePath(filePath);
  const staticPath = existingPath || path.join(distDir, 'index.html');
  const fileStat = await stat(staticPath);
  const extension = path.extname(staticPath).toLowerCase();

  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes[extension] || 'application/octet-stream');
  res.setHeader('Content-Length', fileStat.size);

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  createReadStream(staticPath).pipe(res);
}

async function getExistingFilePath(filePath) {
  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

function getSafeRequestPath(url) {
  try {
    return decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return '/';
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';

    req.on('data', (chunk) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        const error = new Error('Request body is too large.');
        error.code = 'BODY_TOO_LARGE';
        reject(error);
        req.destroy();
        return;
      }

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
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (statusCode === 204) {
    res.end();
    return;
  }

  res.end(JSON.stringify(body));
}
