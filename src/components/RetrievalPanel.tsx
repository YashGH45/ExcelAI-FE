// ============================================================
//  RetrievalPanel.tsx
//  Fixed-overlay right-side panel showing source chunks for a
//  selected bot message. Does not push or resize the chat area.
//
//  Card types:
//    • SpreadsheetCard — file/sheet header, meta row, mini table,
//                        collapsible SQL query
//    • PdfCard         — file/page/heading header, relevance bar,
//                        chunk text with emphasised numbers/acronyms
//    • GenericCard     — fallback for unknown source types
//
//  Props:
//    info    — RetrievalInfo for the selected message (null = none)
//    isOpen  — drives the open/close CSS class
//    onClose — collapses the panel
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { X, Database, FileSpreadsheet, FileText, ChevronDown, ChevronRight, AlertCircle, ExternalLink } from 'lucide-react';
import type { RetrievalInfo, RetrievalChunk } from '../types';

interface Props {
  info: RetrievalInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInPdf?: (chunk: RetrievalChunk) => void;
}

// ── Helpers ────────────────────────────────────────────────────

const pct = (score: number) => `${Math.round(score * 100)}%`;

// ── Highlighted text ───────────────────────────────────────────
// When the backend sends highlight_spans, slices the text string at those
// exact character offsets and wraps each highlighted segment in a <mark>.
// Falls back to emphasising numbers and acronyms when no spans are present.

const EMPHASIS_RE = /(\b\d[\d.,]*%?\b|\b[A-Z]{2,}\b)/g;

function HighlightText({
  text,
  spans,
}: {
  text: string;
  spans?: { start: number; end: number }[];
}) {
  // ── span-based highlighting ──────────────────────────────────
  if (spans && spans.length > 0) {
    // Sort spans by start position and merge any overlaps
    const sorted = [...spans].sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const span of sorted) {
      const last = merged[merged.length - 1];
      if (last && span.start <= last.end) {
        last.end = Math.max(last.end, span.end);
      } else {
        merged.push({ ...span });
      }
    }

    const segments: (string | React.ReactElement)[] = [];
    let cursor = 0;
    merged.forEach(({ start, end }, i) => {
      const s = Math.max(0, start);
      const e = Math.min(text.length, end);
      if (cursor < s) segments.push(text.slice(cursor, s));
      segments.push(<mark key={i} className="highlight-mark">{text.slice(s, e)}</mark>);
      cursor = e;
    });
    if (cursor < text.length) segments.push(text.slice(cursor));
    return <>{segments}</>;
  }

  // ── fallback: emphasise numbers + acronyms ───────────────────
  const parts = text.split(EMPHASIS_RE);
  return (
    <>
      {parts.map((part, i) =>
        EMPHASIS_RE.test(part)
          ? <em key={i} className="emphasis-term">{part}</em>
          : part
      )}
    </>
  );
}

// ── Spreadsheet source card ────────────────────────────────────
function SpreadsheetCard({ chunk }: { chunk: RetrievalChunk }) {
  const [sqlOpen, setSqlOpen] = useState(false);
  const cols    = chunk.columnsUsed ?? [];
  const rows    = chunk.tableRows  ?? [];
  const headers = cols.length > 0 ? cols : rows.length > 0 ? Object.keys(rows[0]) : [];
  const truncated = chunk.rowsRetrieved != null && chunk.totalRows != null
    && chunk.rowsRetrieved < chunk.totalRows;

  return (
    <div className="source-card">
      {/* Header: "sales.xlsx › Sheet1" */}
      <div className="source-card-header">
        <span className="source-card-icon"><FileSpreadsheet size={13} /></span>
        <div className="source-card-title" title={chunk.source}>
          {chunk.source}
          {chunk.sheetName && (
            <span className="source-card-separator"> › {chunk.sheetName}</span>
          )}
        </div>
      </div>

      {/* Collapsible SQL — first */}
      {chunk.sqlQuery && (
        <>
          <button className="sql-toggle" onClick={() => setSqlOpen(v => !v)}>
            {sqlOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            SQL Query
          </button>
          {sqlOpen && (
            <div className="sql-block">{chunk.sqlQuery}</div>
          )}
        </>
      )}

      {/* Row count badge */}
      {chunk.rowsRetrieved != null && chunk.totalRows != null && (
        <div className="source-card-meta">
          <span>Showing {chunk.rowsRetrieved} of {chunk.totalRows.toLocaleString()} rows</span>
        </div>
      )}

      {/* Data table */}
      {headers.length > 0 && rows.length > 0 && (
        <div className="mini-table-scroll">
          <table className="mini-table">
            <thead>
              <tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {headers.map(h => (
                    <td key={h}>{row[h] != null ? String(row[h]) : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Truncation note */}
          {truncated && (
            <p className="truncation-note">
              Results truncated — {chunk.totalRows! - chunk.rowsRetrieved!} more rows not shown
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── PDF source card ────────────────────────────────────────────
function PdfCard({ chunk, onOpenInPdf }: { chunk: RetrievalChunk; onOpenInPdf?: (c: RetrievalChunk) => void }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bodyRef.current) return;
    const mark = bodyRef.current.querySelector<HTMLElement>('.highlight-mark');
    if (mark) mark.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [chunk.id]);

  const canOpenPdf = onOpenInPdf != null && (
    chunk.pageNumber != null || (chunk.boundingBoxes?.length ?? 0) > 0
  );

  return (
    <div className="source-card">
      {/* Header: "report.pdf · Page 4"  +  score pill */}
      <div className="source-card-header">
        <span className="source-card-icon"><FileText size={13} /></span>
        <div className="source-card-title" title={chunk.source} style={{ flex: 1, minWidth: 0 }}>
          {chunk.source}
          {chunk.pageNumber != null && (
            <span className="source-card-separator"> · Page {chunk.pageNumber}</span>
          )}
        </div>
        <span className="score-pill">{pct(chunk.score)}</span>
      </div>

      {/* Sub-header: section heading */}
      {chunk.sectionHeading && (
        <div className="source-card-subtitle">{chunk.sectionHeading}</div>
      )}

      {/* Chunk text with backend-driven highlights */}
      <div className="chunk-body" ref={bodyRef}>
        <HighlightText text={chunk.text} spans={chunk.highlightSpans} />
      </div>

      {/* "View in PDF" button — only when bounding boxes or page number are available */}
      {canOpenPdf && (
        <button
          className="view-in-pdf-btn"
          onClick={() => onOpenInPdf!(chunk)}
          title={`Open page ${chunk.pageNumber ?? '?'} in PDF viewer`}
        >
          <ExternalLink size={11} />
          View in PDF
        </button>
      )}
    </div>
  );
}

// ── Generic fallback card ──────────────────────────────────────
function GenericCard({ chunk }: { chunk: RetrievalChunk }) {
  return (
    <div className="chunk-card">
      <div className="chunk-header">
        <span className="rank-badge">#{chunk.rank}</span>
        <span className="chunk-source" title={chunk.source}>{chunk.source}</span>
        <span className={`chunk-score ${chunk.score >= 0.75 ? 'score-high' : chunk.score >= 0.5 ? 'score-mid' : 'score-low'}`}>
          {pct(chunk.score)}
        </span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: pct(chunk.score),
            background: chunk.score >= 0.75
              ? 'var(--score-high)'
              : chunk.score >= 0.5
              ? 'var(--score-mid)'
              : 'var(--score-low)',
          }}
        />
      </div>
      <p className="chunk-text">{chunk.text}</p>
    </div>
  );
}

// ── Card dispatcher ────────────────────────────────────────────
function SourceCard({ chunk, onOpenInPdf }: { chunk: RetrievalChunk; onOpenInPdf?: (c: RetrievalChunk) => void }) {
  if (chunk.sourceType === 'spreadsheet') return <SpreadsheetCard chunk={chunk} />;
  if (chunk.sourceType === 'pdf')         return <PdfCard chunk={chunk} onOpenInPdf={onOpenInPdf} />;
  return <GenericCard chunk={chunk} />;
}

// ── Panel ──────────────────────────────────────────────────────
export default function RetrievalPanel({ info, isOpen, onClose, onOpenInPdf }: Props) {
  return (
    <div className={`retrieval-panel${isOpen ? ' open' : ''}`}>
    <div className="retrieval-panel-inner">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="retrieval-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Database size={14} style={{ color: 'var(--accent)' }} />
          <span className="retrieval-title">
            Sources
            {info && (
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                ({info.chunks.length})
              </span>
            )}
          </span>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close panel">
          <X size={15} />
        </button>
      </div>

      {/* ── Placeholder ─────────────────────────────────────── */}
      {!info ? (
        <div className="retrieval-placeholder">
          <Database size={28} style={{ opacity: 0.2 }} />
          <p>
            Click <strong>Sources</strong> below any response to view
            the retrieved context.
          </p>
        </div>
      ) : (
        <>
          {/* ── Metadata badges ────────────────────────────── */}
          <div className="retrieval-meta">
            <span className="meta-badge">
              {info.searchMode === 'semantic' ? 'Semantic' : 'Keyword'}
            </span>
            <span className="meta-badge">Top-{info.topK} of {info.totalSearched}</span>
          </div>

          {/* ── Source cards ─────────────────────────────────── */}
          <div className="retrieval-chunks">
            {info.chunks.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>
                No sources retrieved
              </p>
            ) : (
              info.chunks.map(chunk => (
                <SourceCard key={chunk.id} chunk={chunk} onOpenInPdf={onOpenInPdf} />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Disclaimer — always visible at bottom ─────────── */}
      <div className="retrieval-disclaimer">
        <AlertCircle size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
        AI outputs may contain errors. Always verify against the original source before relying on this information.
      </div>

    </div>
    </div>
  );
}
