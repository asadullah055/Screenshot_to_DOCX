import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { getDocxImageData } from './fileUtils';

const DOCUMENT_NAME = 'ocr-result.docx';

export async function downloadOcrDocx({ imageFile, extractedText, createdAt = new Date() }) {
  const image = await getDocxImageData(imageFile);
  const doc = new Document({
    creator: 'Screenshot to DOCX',
    title: 'OCR Result',
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'OCR Result',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Created: ${createdAt.toLocaleString()}`,
                italics: true,
                color: '555555',
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: image.data,
                transformation: {
                  width: image.width,
                  height: image.height,
                },
                altText: {
                  title: imageFile.name,
                  description: 'Uploaded screenshot',
                  name: imageFile.name,
                },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
          }),
          new Paragraph({
            text: 'Extracted Text',
            heading: HeadingLevel.HEADING_2,
          }),
          ...textToParagraphs(extractedText),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, DOCUMENT_NAME);
}

function textToParagraphs(text) {
  const lines = text.trim() ? text.split(/\r?\n/) : [''];

  return lines.map(
    (line) =>
      new Paragraph({
        children: [
          new TextRun({
            text: line || ' ',
            break: 0,
          }),
        ],
        spacing: { after: 120 },
      }),
  );
}
