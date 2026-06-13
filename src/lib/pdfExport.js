import { jsPDF } from 'jspdf';
import { getPngImageData } from './fileUtils';

const PDF_NAME = 'ocr-result.pdf';

export async function downloadOcrPdf({ imageFile, extractedText, createdAt = new Date() }) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const image = await getPngImageData(imageFile);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  pdf.text('OCR Result', margin, cursorY);

  cursorY += 24;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(90);
  pdf.text(`Created: ${createdAt.toLocaleString()}`, margin, cursorY);

  cursorY += 28;
  const imageScale = Math.min(contentWidth / image.naturalWidth, 300 / image.naturalHeight, 1);
  const imageWidth = image.naturalWidth * imageScale;
  const imageHeight = image.naturalHeight * imageScale;
  pdf.addImage(image.dataUrl, 'PNG', margin + (contentWidth - imageWidth) / 2, cursorY, imageWidth, imageHeight);

  cursorY += imageHeight + 34;
  if (cursorY > pageHeight - margin) {
    pdf.addPage();
    cursorY = margin;
  }

  pdf.setTextColor(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('Extracted Text', margin, cursorY);

  cursorY += 22;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  const lines = pdf.splitTextToSize(extractedText.trim() || ' ', contentWidth);
  lines.forEach((line) => {
    if (cursorY > pageHeight - margin) {
      pdf.addPage();
      cursorY = margin;
    }

    pdf.text(line, margin, cursorY);
    cursorY += 15;
  });

  pdf.save(PDF_NAME);
}
