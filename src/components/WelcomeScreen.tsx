// ============================================================
//  WelcomeScreen.tsx
//  Shown when a new (empty) chat session is opened.
//  Presents two paths:
//    1. Upload a file → shows drop-zone inline
//    2. Skip          → goes straight to chat
//
//  Features:
//    • Smart Parser toggle — when on, an Excel/CSV upload
//      opens a setup dialog; answers are sent to /api/upload
//      alongside the file with smart_parser=true.
//
//  Props:
//    onFileLoaded — called with a FileContext after successful upload
//    onSkip       — user chose to chat without a file
// ============================================================

import { useState, useRef, useCallback } from 'react';
import { Bot, UploadCloud, MessageSquare, FileSpreadsheet, ArrowLeft, Sparkles } from 'lucide-react';
import type { FileContext } from '../types';
import { uploadFile, submitSmartParserAnswers } from '../utils/api';
import type { SmartParserAnswer, UploadResponse } from '../utils/api';
import SmartParserDialog from './SmartParserDialog';
import PdfTipsOverlay from './PdfTipsOverlay';

interface Props {
  onFileLoaded: (ctx: FileContext) => void;
  onSkip: () => void;
}

type View = 'options' | 'upload';

const isSpreadsheet = (file: File) => /\.(xlsx|xls|csv)$/i.test(file.name);

export default function WelcomeScreen({ onFileLoaded, onSkip }: Props) {
  const [view,                setView]               = useState<View>('options');
  const [isDragging,          setDrag]               = useState(false);
  const [isLoading,           setLoading]            = useState(false);
  const [isPdfUploading,      setIsPdfUploading]     = useState(false);
  const [error,               setError]              = useState<string | null>(null);
  const [smartParserMode,     setSmartParserMode]    = useState(false);
  const [pendingFile,         setPendingFile]        = useState<File | null>(null);
  const [pendingUploadResult, setPendingUploadResult]= useState<UploadResponse | null>(null);
  const inputRef                                     = useRef<HTMLInputElement>(null);

  // ── Step 1 (plain): upload file and finish immediately ────
  const doUpload = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const result = await uploadFile(file, { smartParser: false });
      onFileLoaded({
        name:     result.filename  ?? file.name,
        rowCount: result.rows      ?? 0,
        colCount: result.col_count ?? 0,
        preview:  '',
        raw:      [],
      });
    } catch (e) {
      setError((e as Error).message ?? 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }, [onFileLoaded]);

  // ── Step 1 (smart): upload file first, then open dialog ───
  const doSmartUpload = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const result = await uploadFile(file, { smartParser: true });
      setPendingUploadResult(result);
      setPendingFile(file);
    } catch (e) {
      setError((e as Error).message ?? 'Upload failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Step 3 (smart): submit answers, then finalise session ─
  const handleSmartParserSubmit = useCallback(async (answers: SmartParserAnswer[]) => {
    await submitSmartParserAnswers(answers);
    const result = pendingUploadResult!;
    const file   = pendingFile!;
    setPendingFile(null);
    setPendingUploadResult(null);
    onFileLoaded({
      name:     result.filename  ?? file.name,
      rowCount: result.rows      ?? 0,
      colCount: result.col_count ?? 0,
      preview:  '',
      raw:      [],
    });
  }, [pendingUploadResult, pendingFile, onFileLoaded]);

  // ── File picked / dropped ──────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const validExts = /\.(xlsx|xls|csv|pdf)$/i;
    if (!validExts.test(file.name)) {
      setError('Please upload a .xlsx, .xls, .csv, or .pdf file.');
      return;
    }
    setIsPdfUploading(/\.pdf$/i.test(file.name));
    if (smartParserMode && isSpreadsheet(file)) {
      doSmartUpload(file);   // upload first, dialog opens after
    } else {
      doUpload(file);
    }
  }, [smartParserMode, doUpload, doSmartUpload]);

  // ── Drag-and-drop handlers ─────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = () => setDrag(false);
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── "Options" view — two large cards + Smart Parser toggle ─
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
          <button className="option-card" onClick={() => setView('upload')}>
            <UploadCloud size={28} style={{ color: 'var(--accent)' }} />
            <span className="option-card-title">Upload a file</span>
            <span className="option-card-sub">
              Analyse Excel, CSV, or PDF data with AI
            </span>
          </button>

          <button className="option-card" onClick={onSkip}>
            <MessageSquare size={28} style={{ color: 'var(--text-secondary)' }} />
            <span className="option-card-title">Start chatting</span>
            <span className="option-card-sub">
              Chat without any data file
            </span>
          </button>
        </div>

        {/* Smart Parser toggle */}
        <button
          className={`sp-toggle-row${smartParserMode ? ' on' : ''}`}
          onClick={() => setSmartParserMode(v => !v)}
        >
          <Sparkles
            size={15}
            style={{ color: smartParserMode ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}
          />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div className="sp-toggle-label">Smart Parser</div>
            <div className="sp-toggle-desc">Ask setup questions before analysing spreadsheets</div>
          </div>
          <div className={`toggle-switch${smartParserMode ? ' on' : ''}`} />
        </button>

        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          You can attach a file at any time during the conversation
        </p>
      </div>
    );
  }

  // ── "Upload" view — drop zone with back button ─────────────
  return (
    <>
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
            Supports .xlsx, .xls, .csv, and .pdf files
          </p>

          {/* Smart Parser active indicator */}
          {smartParserMode && (
            <div className="sp-upload-badge">
              <Sparkles size={11} />
              Smart Parser is on
            </div>
          )}

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
              accept=".xlsx,.xls,.csv,.pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
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

      {/* Smart Parser Dialog — rendered as a fixed overlay */}
      {pendingFile && (
        <SmartParserDialog
          fileName={pendingFile.name}
          onSubmit={handleSmartParserSubmit}
          onCancel={() => { setPendingFile(null); setPendingUploadResult(null); }}
        />
      )}

      {/* PDF Tips Overlay — shown while a PDF is uploading/parsing */}
      {isLoading && isPdfUploading && <PdfTipsOverlay />}
    </>
  );
}
