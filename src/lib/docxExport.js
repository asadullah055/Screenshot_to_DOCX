import { saveAs } from 'file-saver';

const DOCUMENT_NAME = 'Checkout - SWR BKR 2B - Primary Block.docx';
const TEMPLATE_URL = '/templates/mcdean-commissioning-checklist.docx';

export async function downloadOcrDocx() {
  const response = await fetch(TEMPLATE_URL);

  if (!response.ok) {
    throw new Error('The M.C. Dean DOCX template could not be loaded.');
  }

  const blob = await response.blob();
  saveAs(
    new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }),
    DOCUMENT_NAME,
  );
}
