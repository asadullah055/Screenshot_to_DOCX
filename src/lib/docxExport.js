import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const DOCUMENT_NAME = 'Checkout - SWR BKR 2B - Primary Block.docx';
const TEMPLATE_URL = `${import.meta.env.BASE_URL}templates/mcdean-commissioning-checklist.docx`;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function downloadOcrDocx({ extractedText = '' } = {}) {
  const response = await fetch(TEMPLATE_URL);

  if (!response.ok) {
    throw new Error('The M.C. Dean DOCX template could not be loaded.');
  }

  const templateBuffer = await response.arrayBuffer();
  const blob = await appendConvertedText(templateBuffer, extractedText);

  saveAs(blob, DOCUMENT_NAME);
}

async function appendConvertedText(templateBuffer, extractedText) {
  const zip = await JSZip.loadAsync(templateBuffer);
  const documentPath = 'word/document.xml';
  const documentXml = await zip.file(documentPath).async('string');
  const text = extractedText.trim() || 'No converted text was available.';
  const insertionPoint = documentXml.lastIndexOf('<w:sectPr');

  if (insertionPoint === -1) {
    throw new Error('The M.C. Dean DOCX template is missing section metadata.');
  }

  const updatedXml = `${documentXml.slice(0, insertionPoint)}${buildConvertedTextXml(text)}${documentXml.slice(insertionPoint)}`;
  zip.file(documentPath, updatedXml);

  const patchedBuffer = await zip.generateAsync({ type: 'arraybuffer' });

  return new Blob([patchedBuffer], { type: DOCX_MIME });
}

function buildConvertedTextXml(text) {
  const paragraphs = text.split(/\r?\n/).map((line) => line.trimEnd());

  return [
    pageBreakParagraph(),
    headingParagraph('Converted Text'),
    ...paragraphs.map((line) => bodyParagraph(line || ' ')),
  ].join('');
}

function pageBreakParagraph() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function headingParagraph(text) {
  return [
    '<w:p>',
    '<w:pPr><w:spacing w:after="120"/><w:rPr>',
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>',
    '<w:b/><w:sz w:val="28"/><w:szCs w:val="28"/>',
    '</w:rPr></w:pPr>',
    '<w:r><w:rPr>',
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>',
    '<w:b/><w:sz w:val="28"/><w:szCs w:val="28"/>',
    '</w:rPr><w:t>',
    escapeXml(text),
    '</w:t></w:r>',
    '</w:p>',
  ].join('');
}

function bodyParagraph(text) {
  return [
    '<w:p>',
    '<w:pPr><w:spacing w:after="80"/><w:rPr>',
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>',
    '<w:sz w:val="18"/><w:szCs w:val="18"/>',
    '</w:rPr></w:pPr>',
    '<w:r><w:rPr>',
    '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>',
    '<w:sz w:val="18"/><w:szCs w:val="18"/>',
    '</w:rPr><w:t xml:space="preserve">',
    escapeXml(text),
    '</w:t></w:r>',
    '</w:p>',
  ].join('');
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
