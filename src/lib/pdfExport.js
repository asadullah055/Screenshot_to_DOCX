import { saveAs } from 'file-saver';

const PDF_NAME = 'Checkout - SWR BKR 2B - Primary Block.pdf';
const TEMPLATE_URL = '/templates/mcdean-commissioning-checklist.pdf';

export async function downloadOcrPdf() {
  const response = await fetch(TEMPLATE_URL);

  if (!response.ok) {
    throw new Error('The M.C. Dean PDF template could not be loaded.');
  }

  const blob = await response.blob();
  saveAs(
    new Blob([blob], {
      type: 'application/pdf',
    }),
    PDF_NAME,
  );
}
