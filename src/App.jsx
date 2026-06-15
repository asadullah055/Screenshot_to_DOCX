import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileImage, RotateCcw, ScanText, UploadCloud, X, XCircle } from 'lucide-react';
import './App.css';
import { downloadOcrDocx } from './lib/docxExport';
import { downloadOcrPdf } from './lib/pdfExport';
import { createImagePreviewUrl, formatBytes, isImageFile } from './lib/fileUtils';
import { extractTextFromImage } from './lib/ocr';

const initialProgress = { percent: 0, status: 'Idle' };

function App() {
  const fileInputRef = useRef(null);
  const itemsRef = useRef([]);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [exportType, setExportType] = useState('');

  const hasFiles = items.length > 0;
  const hasText = text.trim().length > 0;
  const isExporting = Boolean(exportType);
  const isBusy = isExtracting || isExporting;
  const canExtract = hasFiles && !isBusy;
  const canDownload = hasFiles && hasText && !isBusy;
  const canClear = Boolean(hasFiles || text || error) && !isBusy;

  const fileMeta = useMemo(() => {
    if (!hasFiles) {
      return null;
    }

    const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    return `${items.length} image${items.length === 1 ? '' : 's'} - ${formatBytes(totalBytes)}`;
  }, [hasFiles, items]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  function addSelectedFiles(nextFiles) {
    const files = Array.from(nextFiles || []);
    if (!files.length) {
      return;
    }

    const imageFiles = files.filter(isImageFile);
    if (!imageFiles.length) {
      setError('Choose image files only.');
      return;
    }

    const newItems = imageFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: createImagePreviewUrl(file),
    }));

    setItems((currentItems) => [...currentItems, ...newItems]);
    setText('');
    setProgress(initialProgress);
    setError(
      imageFiles.length === files.length
        ? ''
        : 'Some files were skipped because they were not images.',
    );
  }

  function handleInputChange(event) {
    addSelectedFiles(event.target.files);
    event.target.value = '';
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    addSelectedFiles(event.dataTransfer.files);
  }

  function removeItem(itemId) {
    setItems((currentItems) => {
      const itemToRemove = currentItems.find((item) => item.id === itemId);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }

      return currentItems.filter((item) => item.id !== itemId);
    });
    setText('');
    setProgress(initialProgress);
    setError('');
  }

  async function handleExtractText() {
    if (!hasFiles) {
      return;
    }

    setIsExtracting(true);
    setError('');
    setProgress({ percent: 0, status: 'Starting OCR' });

    try {
      const extractedSections = [];

      for (const [index, item] of items.entries()) {
        const imageNumber = index + 1;
        const extractedText = await extractTextFromImage(item.file, ({ percent, status }) => {
          const overallPercent = Math.round(((index + percent / 100) / items.length) * 100);
          setProgress({
            percent: overallPercent,
            status: `Image ${imageNumber}/${items.length}: ${status || 'Processing'}`,
          });
        });

        extractedSections.push(formatExtractedSection(item.file.name, extractedText));
      }

      const combinedText = extractedSections.join('\n\n');
      setText(combinedText);
      setProgress({ percent: 100, status: 'Complete' });
      if (!combinedText.trim()) {
        setError('OCR completed, but no text was detected.');
      }
    } catch (ocrError) {
      setProgress(initialProgress);
      setError(ocrError instanceof Error ? ocrError.message : 'OCR failed. Try clearer images.');
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleDownloadDocx() {
    if (!hasFiles || !hasText) {
      return;
    }

    setExportType('docx');
    setError('');

    try {
      await downloadOcrDocx({
        imageFiles: items.map((item) => item.file),
        extractedText: text,
      });
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
    if (!hasFiles || !hasText) {
      return;
    }

    setExportType('pdf');
    setError('');

    try {
      await downloadOcrPdf({
        imageFiles: items.map((item) => item.file),
        extractedText: text,
      });
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
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setItems([]);
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
            <span>{hasFiles ? 'Add more screenshots' : 'Drop screenshots or browse'}</span>
            <small>PNG, JPG, GIF, BMP, or other image files</small>
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/*"
            multiple
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
          <div className={`preview-frame ${hasFiles ? 'has-grid' : ''}`}>
            {hasFiles ? (
              <div className="preview-grid">
                {items.map((item, index) => (
                  <figure className="preview-item" key={item.id}>
                    <img src={item.previewUrl} alt={`Uploaded screenshot ${index + 1} preview`} />
                    <figcaption>
                      <span>{index + 1}. {item.file.name}</span>
                      <button
                        type="button"
                        className="remove-image"
                        aria-label={`Remove ${item.file.name}`}
                        onClick={() => removeItem(item.id)}
                        disabled={isBusy}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
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

function formatExtractedSection(fileName, extractedText) {
  const text = extractedText.trim() || 'No text detected.';
  return `--- ${fileName} ---\n${text}`;
}

export default App;
