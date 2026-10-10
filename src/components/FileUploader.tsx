import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File | Blob, fileName: string) => void;
  isLoading: boolean;
  progressPercent: number;
  statusText: string;
  errorMessage: string | null;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  isLoading,
  progressPercent,
  statusText,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileSelect(file, file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileSelect(file, file.name);
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      const res = await fetch('/exportar.zip');
      if (!res.ok) throw new Error('Sample file exportar.zip not found.');
      const blob = await res.blob();
      onFileSelect(blob, 'exportar.zip');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not load bundled sample: ${msg}`);
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="uploader-container">
      <div
        className={`uploader-dropzone ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,.xml"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div className="uploader-icon-circle">
          <span className="uploader-icon">🏃‍♂️</span>
        </div>

        <h1 className="uploader-title">Apple Health Running Analytics</h1>
        <p className="uploader-subtitle">
          Analyze pace records, weekly mileage trends, and predict your race times directly from your iOS Apple Health export.
        </p>

        {isLoading ? (
          <div className="uploader-progress-card">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
            <div className="progress-status-row">
              <span className="progress-status-text">{statusText || 'Processing...'}</span>
              <span className="progress-percent">{progressPercent}%</span>
            </div>
          </div>
        ) : (
          <div className="uploader-actions">
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleButtonClick}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Open Apple Health Export (.zip)
            </button>

            <div className="uploader-divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLoadSample}
              disabled={loadingSample}
            >
              {loadingSample ? 'Loading Sample...' : 'Try with local sample (exportar.zip)'}
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="uploader-error-box">
            <span className="error-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="uploader-instructions">
          <h3>How to export from iPhone:</h3>
          <ol>
            <li>Open the <strong>Health</strong> app on your iPhone.</li>
            <li>Tap your <strong>Profile picture</strong> in the top-right corner.</li>
            <li>Scroll down and tap <strong>Export All Health Data</strong>.</li>
            <li>Once iOS finishes compressing, save or AirDrop the <strong>export.zip</strong> file and open it here.</li>
          </ol>
          <div className="privacy-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>100% Private: All processing happens entirely inside your browser. No data ever leaves your device.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
