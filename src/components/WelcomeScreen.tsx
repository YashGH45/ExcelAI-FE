// ============================================================
//  WelcomeScreen.tsx
//  Shown when a new (empty) chat session is opened.
//  Presents two paths:
//    1. Upload a file → shows drop-zone inline
//    2. Skip          → goes straight to chat
//
//  Props:
//    onFileLoaded — called with a FileContext after successful upload
//    onSkip       — user chose to chat without a file
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Bot, UploadCloud, MessageSquare, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import type { FileContext } from '../types';
import { uploadFile } from '../utils/api';

interface Props {
  onFileLoaded: (ctx: FileContext) => void;
  onSkip: () => void;
}

// View states for the welcome screen
type View = 'options' | 'upload';

export default function WelcomeScreen({ onFileLoaded, onSkip }: Props) {
  const [view, setView]         = useState<View>('options');
  const [isDragging, setDrag]   = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // ── File handling ──────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const validExts = /\.(xlsx|xls|csv)$/i;
    if (!validExts.test(file.name)) {
      setError('Please upload a .xlsx, .xls, or .csv file.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await uploadFile(file);
      // Map UploadResponse → FileContext.
      // The backend returns { filename, size }; extend this when
      // your API returns rowCount, colCount, preview, etc.
      const ctx: FileContext = {
        name:     result.filename ?? file.name,
        rowCount: 0,
        colCount: 0,
        preview:  '',
        raw:      [],
      };
      onFileLoaded(ctx);
    } catch (e) {
      setError((e as Error).message ?? 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }, [onFileLoaded]);

  // ── Drag-and-drop handlers ─────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = () => setDrag(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── "Options" view — two large cards ──────────────────────
  if (view === 'options') {
    return (
      <div className="welcome-screen">
        {/* Logo + greeting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--accent-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="welcome-title">Data Assistant</h1>
          <p className="welcome-subtitle">How can I help you today?</p>
        </div>

        {/* Two option cards */}
        <div className="option-cards">

          {/* Upload path */}
          <button className="option-card" onClick={() => setView('upload')}>
            <UploadCloud size={28} style={{ color: 'var(--accent)' }} />
            <span className="option-card-title">Upload a file</span>
            <span className="option-card-sub">
              Analyse Excel or CSV data with AI
            </span>
          </button>

          {/* Skip path */}
          <button className="option-card" onClick={onSkip}>
            <MessageSquare size={28} style={{ color: 'var(--text-secondary)' }} />
            <span className="option-card-title">Start chatting</span>
            <span className="option-card-sub">
              Chat without any data file
            </span>
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          You can attach a file at any time during the conversation
        </p>
      </div>
    );
  }

  // ── "Upload" view — drop zone with back button ─────────────
  return (
    <div className="welcome-screen">
      {/* Back button */}
      <button
        className="icon-btn"
        style={{ alignSelf: 'flex-start', marginBottom: -20 }}
        onClick={() => { setView('options'); setError(null); }}
        title="Back"
      >
        <ArrowLeft size={16} />
      </button>

      <div className="uploader-card">
        <FileSpreadsheet size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          Upload your data file
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 4 }}>
          Supports .xlsx, .xls, and .csv files
        </p>

        {/* Drop zone — click triggers hidden file input */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          {/* Hidden native file picker */}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = ''; // reset so same file can be re-selected
            }}
          />
          <UploadCloud
            size={22}
            style={{ color: isDragging ? 'var(--accent)' : 'var(--text-muted)', marginBottom: 4 }}
          />
          <span className="drop-text">
            {isLoading ? 'Uploading…' : 'Drop file here or click to browse'}
          </span>
        </div>

        {/* Error feedback */}
        {error && <p className="uploader-error">{error}</p>}

        {/* Skip link */}
        <button className="text-btn" style={{ marginTop: 8 }} onClick={onSkip}>
          Skip — chat without a file
        </button>
      </div>
    </div>
  );
}