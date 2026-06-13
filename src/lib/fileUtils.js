export function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/'));
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function createImagePreviewUrl(file) {
  return URL.createObjectURL(file);
}

export async function getPngImageData(file, maxDisplayWidth = 560) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available in this browser.');
  }

  context.drawImage(image, 0, 0);

  const blob = await canvasToBlob(canvas);
  const scale = Math.min(1, maxDisplayWidth / image.naturalWidth);

  return {
    data: await blob.arrayBuffer(),
    dataUrl: canvas.toDataURL('image/png'),
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale)),
  };
}

export async function getDocxImageData(file, maxDisplayWidth = 560) {
  const { data, width, height } = await getPngImageData(file, maxDisplayWidth);
  return { data, width, height };
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected file could not be loaded as an image.'));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('The image could not be prepared for the DOCX file.'));
    }, 'image/png');
  });
}
