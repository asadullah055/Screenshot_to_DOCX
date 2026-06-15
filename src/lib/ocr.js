export async function extractTextFromImage(file, onProgress) {
  onProgress?.({ percent: 5, status: 'Preparing image' });

  const image = await fileToDataUrl(file);
  onProgress?.({ percent: 25, status: 'Sending to ChatGPT' });

  const response = await fetch('/api/extract-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      image,
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : {};

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('OCR API route not found. Restart the local dev server with npm run dev.');
    }

    throw new Error(data.error || `ChatGPT OCR request failed with status ${response.status}.`);
  }

  onProgress?.({ percent: 100, status: 'Complete' });
  return (data.text || '').trim();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.readAsDataURL(file);
  });
}
