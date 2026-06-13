import { createWorker } from 'tesseract.js';

const basePath = import.meta.env.BASE_URL;

function assetPath(path) {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBase}${path}`;
}

export async function extractTextFromImage(file, onProgress) {
  let worker;

  try {
    worker = await createWorker('eng', 1, {
      workerPath: assetPath('tesseract/worker.min.js'),
      corePath: assetPath('tesseract/core'),
      langPath: assetPath('tesseract/lang'),
      logger: ({ progress, status }) => {
        if (typeof progress === 'number') {
          onProgress?.({
            percent: Math.round(progress * 100),
            status,
          });
        }
      },
    });

    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
