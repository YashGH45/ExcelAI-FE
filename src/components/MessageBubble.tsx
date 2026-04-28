// ============================================================
//  MessageBubble.tsx
//  Renders a single chat message (user or bot).
//
//  Features:
//    • Basic markdown: **bold**, `inline code`, ```code blocks```
//    • "View Sources" button on bot messages that have retrievalInfo
//    • Output format transformations (bullets, table, raw) applied
//      at display time — the underlying text is always preserved
//    • Vega-Lite chart rendered inline when message.vegaSpec is set
//    • Key insights shown below the chart when message.insights is set
//    • Timestamp shown below each message
//
//  Props:
//    message        — the Message object to display
//    onViewSources  — called when user clicks "View Sources";
//                     receives the message's RetrievalInfo
// ============================================================

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Bot, User, BookOpen, Sparkles, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Message, RetrievalInfo, OutputFormat, FileAttachment } from '../types';
import ChartRenderer from './ChartRenderer';

interface Props {
  message: Message;
  onViewSources?: (info: RetrievalInfo) => void;
}

// ── Markdown renderer ──────────────────────────────────────────
function renderMarkdown(text: string) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '').trimEnd();
      return <pre key={i} className="code-block">{code}</pre>;
    }
    return (
      <span key={i}>
        {part.split(/(\*\*.*?\*\*|`[^`]+`)/g).map((chunk, j) => {
          if (chunk.startsWith('**') && chunk.endsWith('**'))
            return <strong key={j}>{chunk.slice(2, -2)}</strong>;
          if (chunk.startsWith('`') && chunk.endsWith('`'))
            return <code key={j} className="inline-code">{chunk.slice(1, -1)}</code>;
          return chunk;
        })}
      </span>
    );
  });
}

// ── Output format transformations ─────────────────────────────
function applyOutputFormat(text: string, format: OutputFormat): ReactNode {
  switch (format) {
    case 'bullets': {
      const lines = text.split('\n').filter(l => l.trim());
      return (
        <ul style={{ paddingLeft: 18, margin: 0, listStyleType: 'disc' }}>
          {lines.map((line, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{renderMarkdown(line)}</li>
          ))}
        </ul>
      );
    }
    case 'table': {
      const rows = text.split('\n').filter(l => l.trim());
      return (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <tbody>
            {rows.map((row, i) => {
              const [label, ...rest] = row.split(':');
              return (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--border-light)',
                  background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                }}>
                  <td style={{
                    padding: '5px 10px 5px 0', fontWeight: 500,
                    color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                    verticalAlign: 'top', width: '40%',
                  }}>
                    {label?.trim() ?? row}
                  </td>
                  <td style={{ padding: '5px 0', verticalAlign: 'top' }}>
                    {rest.length ? renderMarkdown(rest.join(':').trim()) : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    case 'raw':
      return <pre className="code-block" style={{ fontSize: 11 }}>{text}</pre>;
    default:
      return renderMarkdown(text);
  }
}

// ── Excel / CSV preview ────────────────────────────────────────
const PREVIEW_ROWS = 6;

type PreviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; headers: string[]; rows: (string | number | null)[][]; totalRows: number; sheetName: string };

function ExcelPreview({ attachment }: { attachment: FileAttachment }) {
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch(attachment.url)
      .then(r => r.arrayBuffer())
      .then(buf => {
        if (cancelled) return;
        const wb     = XLSX.read(buf, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws     = wb.Sheets[wsName];
        const all    = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
          header: 1, defval: null,
        });
        const isCsv = attachment.name.toLowerCase().endsWith('.csv');
        const [headerRow = [], ...dataRows] = all;
        setPreview({
          status:    'ready',
          headers:   (headerRow as (string | number | null)[]).map(h => String(h ?? '')),
          rows:      dataRows.slice(0, PREVIEW_ROWS) as (string | number | null)[][],
          totalRows: Math.max(0, dataRows.length),
          sheetName: isCsv ? '' : wsName,
        });
      })
      .catch(() => { if (!cancelled) setPreview({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [attachment.url, attachment.name]);

  return (
    <div className="excel-preview-wrapper">
      {/* Header bar */}
      <div className="excel-preview-header">
        <span className="excel-preview-icon"><FileSpreadsheet size={14} /></span>
        <span className="excel-preview-name">{attachment.name}</span>

        {preview.status === 'ready' && preview.sheetName && (
          <span className="excel-preview-sheet">{preview.sheetName}</span>
        )}
        {preview.status === 'ready' && (
          <span className="excel-preview-meta">
            {preview.totalRows.toLocaleString()} row{preview.totalRows !== 1 ? 's' : ''}
            {preview.headers.length > 0 ? ` · ${preview.headers.length} col${preview.headers.length !== 1 ? 's' : ''}` : ''}
          </span>
        )}

        <a
          className="excel-download-btn"
          href={attachment.url}
          download={attachment.name}
          title={`Download ${attachment.name}`}
        >
          <Download size={12} />
          Download
        </a>
      </div>

      {/* Table preview */}
      {preview.status === 'loading' && (
        <div className="excel-preview-loading">Loading preview…</div>
      )}
      {preview.status === 'error' && (
        <div className="excel-preview-loading">Preview unavailable</div>
      )}
      {preview.status === 'ready' && preview.headers.length > 0 && (
        <div className="excel-table-scroll">
          <table className="excel-preview-table">
            <thead>
              <tr>{preview.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {preview.rows.map((row, ri) => (
                <tr key={ri}>
                  {preview.headers.map((_, ci) => (
                    <td key={ci}>{row[ci] != null ? String(row[ci]) : ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.totalRows > PREVIEW_ROWS && (
            <div className="excel-preview-more">
              +{(preview.totalRows - PREVIEW_ROWS).toLocaleString()} more rows — download to view all
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────
export default function MessageBubble({ message, onViewSources }: Props) {
  const isUser  = message.role === 'user';
  const fmt     = message.outputFormat ?? 'text';
  const hasChart      = !isUser && !!message.vegaSpec;
  const hasAttachment = !isUser && !!message.fileAttachment;

  return (
    <div
      className={`message-row ${isUser ? 'user' : 'bot'}`}
      style={hasChart || hasAttachment ? { alignItems: 'flex-start' } : undefined}
    >
      {/* Bot avatar — left side */}
      {!isUser && (
        <div className="message-avatar" style={hasChart || hasAttachment ? { marginTop: 6 } : undefined}>
          <Bot size={13} />
        </div>
      )}

      {/* Content column — wider when a chart or file is present */}
      <div style={{ maxWidth: hasChart || hasAttachment ? '90%' : '72%', minWidth: 0, width: hasChart || hasAttachment ? '90%' : undefined }}>

        {/* Text bubble */}
        <div className={`message-bubble ${isUser ? 'user' : 'bot'}`}>
          {applyOutputFormat(message.text, fmt)}
        </div>

        {/* ── Chart (Vega-Lite) ────────────────────────────── */}
        {hasChart && (
          <div className="chart-wrapper">
            <ChartRenderer spec={message.vegaSpec!} />
          </div>
        )}

        {/* ── Excel file attachment ────────────────────────── */}
        {hasAttachment && (
          <ExcelPreview attachment={message.fileAttachment!} />
        )}

        {/* ── Key Insights ─────────────────────────────────── */}
        {!isUser && message.insights && message.insights.length > 0 && (
          <div className="insights-panel">
            <div className="insights-header">
              <Sparkles size={12} />
              Key Insights
            </div>
            <ul className="insights-list">
              {message.insights.map((insight, i) => (
                <li key={i}>{insight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer: timestamp + optional "View Sources" button */}
        <div
          className="message-footer"
          style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}
        >
          <span className="message-timestamp">{message.timestamp}</span>

          {!isUser && message.retrievalInfo && onViewSources && (
            <button
              className="source-btn"
              onClick={() => onViewSources(message.retrievalInfo!)}
              title="View retrieved source chunks"
            >
              <BookOpen size={10} />
              {message.retrievalInfo.chunks.length} sources
            </button>
          )}

          {!isUser && fmt !== 'text' && (
            <span style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              [{fmt}]
            </span>
          )}
        </div>
      </div>

      {/* User avatar — right side */}
      {isUser && (
        <div
          className="message-avatar"
          style={{ background: 'var(--btn-send)', color: 'var(--btn-send-text)', border: 'none' }}
        >
          <User size={13} />
        </div>
      )}
    </div>
  );
}