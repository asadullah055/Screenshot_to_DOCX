import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileImage, RotateCcw, ScanText, UploadCloud, XCircle } from 'lucide-react';
import './App.css';
import { downloadOcrDocx } from './lib/docxExport';
import { downloadOcrPdf } from './lib/pdfExport';
import { createImagePreviewUrl, formatBytes, isImageFile } from './lib/fileUtils';
import { extractTextFromImage } from './lib/ocr';

const initialProgress = { percent: 0, status: 'Idle' };

function App() {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [exportType, setExportType] = useState('');

  const hasText = text.trim().length > 0;
  const isExporting = Boolean(exportType);
  const isBusy = isExtracting || isExporting;
  const canExtract = Boolean(file) && !isBusy;
  const canDownload = Boolean(file) && hasText && !isBusy;
  const canClear = Boolean(file || text || error) && !isBusy;

  const fileMeta = useMemo(() => {
    if (!file) {
      return null;
    }

    return `${file.name} - ${formatBytes(file.size)}`;
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function setSelectedFile(nextFile) {
    if (!nextFile) {
      return;
    }

    if (!isImageFile(nextFile)) {
      setError('Choose an image file.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(nextFile);
    setPreviewUrl(createImagePreviewUrl(nextFile));
    setText('');
    setProgress(initialProgress);
    setError('');
  }

  function handleInputChange(event) {
    setSelectedFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files?.[0]);
  }

  async function handleExtractText() {
    if (!file) {
      return;
    }

    setIsExtracting(true);
    setError('');
    setProgress({ percent: 0, status: 'Starting OCR' });

    try {
      const extractedText = await extractTextFromImage(file, setProgress);
      setText(extractedText);
      setProgress({ percent: 100, status: 'Complete' });
      if (!extractedText) {
        setError('OCR completed, but no text was detected.');
      }
    } catch (ocrError) {
      setProgress(initialProgress);
      setError(ocrError instanceof Error ? ocrError.message : 'OCR failed. Try a clearer image.');
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleDownloadDocx() {
    if (!file || !hasText) {
      return;
    }

    setExportType('docx');
    setError('');

    try {
      await downloadOcrDocx({ imageFile: file, extractedText: text });
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'The DOCX file could not be created.',
      );
    } finally {
      setExportType('');
    }
  }

  async function handleDownloadPdf() {
    if (!file || !hasText) {
      return;
    }

    setExportType('pdf');
    setError('');

    try {
      await downloadOcrPdf({ imageFile: file, extractedText: text });
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'The PDF file could not be created.',
      );
    } finally {
      setExportType('');
    }
  }

  function handleClear() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl('');
    setText('');
    setProgress(initialProgress);
    setError('');
    setIsDragging(false);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Local OCR Utility</span>
          <h1>Screenshot to DOCX</h1>
        </div>
        <div className="status-pill" aria-live="polite">
          {isExtracting
            ? 'Extracting'
            : exportType
              ? `Preparing ${exportType.toUpperCase()}`
              : 'Ready'}
        </div>
      </header>

      <section className="workspace" aria-label="Screenshot OCR workspace">
        <div className="upload-panel">
          <button
            type="button"
            className={`upload-zone ${isDragging ? 'is-dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <UploadCloud aria-hidden="true" />
            <span>{file ? 'Replace screenshot' : 'Drop screenshot or browse'}</span>
            <small>PNG, JPG, GIF, BMP, or other image file</small>
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={handleInputChange}
          />

          {fileMeta && (
            <div className="file-row">
              <FileImage aria-hidden="true" />
              <span>{fileMeta}</span>
            </div>
          )}

          <div className="button-row">
            <button type="button" onClick={handleExtractText} disabled={!canExtract}>
              <ScanText aria-hidden="true" />
              Extract Text
            </button>
            <button type="button" onClick={handleDownloadDocx} disabled={!canDownload}>
              <Download aria-hidden="true" />
              Download DOCX
            </button>
            <button type="button" onClick={handleDownloadPdf} disabled={!canDownload}>
              <Download aria-hidden="true" />
              Download PDF
            </button>
            <button type="button" className="secondary" onClick={handleClear} disabled={!canClear}>
              <RotateCcw aria-hidden="true" />
              Clear
            </button>
          </div>

          <div className="progress-block">
            <div className="progress-label">
              <span>{progress.status}</span>
              <strong>{progress.percent}%</strong>
            </div>
            <div className="progress-track" aria-label="OCR progress">
              <span style={{ width: `${progress.percent}%` }} />
            </div>
          </div>

          {error && (
            <p className="message" role="alert">
              <XCircle aria-hidden="true" />
              {error}
            </p>
          )}
        </div>

        <div className="preview-panel">
          <div className="panel-heading">
            <h2>Image Preview</h2>
          </div>
          <div className="preview-frame">
            {previewUrl ? (
              <img src={previewUrl} alt="Uploaded screenshot preview" />
            ) : (
              <div className="empty-state">
                <FileImage aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="text-panel">
          <div className="panel-heading">
            <h2>Extracted Text</h2>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="OCR text will appear here."
            spellCheck="true"
            disabled={isExtracting}
          />
        </div>
      </section>
    </main>
  );
}

export default App;
