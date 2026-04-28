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
import { Bot, User, BookOpen, Sparkles } from 'lucide-react';
import type { Message, RetrievalInfo, OutputFormat } from '../types';
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

// ── Component ──────────────────────────────────────────────────
export default function MessageBubble({ message, onViewSources }: Props) {
  const isUser  = message.role === 'user';
  const fmt     = message.outputFormat ?? 'text';
  const hasChart = !isUser && !!message.vegaSpec;

  return (
    <div
      className={`message-row ${isUser ? 'user' : 'bot'}`}
      style={hasChart ? { alignItems: 'flex-start' } : undefined}
    >
      {/* Bot avatar — left side */}
      {!isUser && (
        <div className="message-avatar" style={hasChart ? { marginTop: 6 } : undefined}>
          <Bot size={13} />
        </div>
      )}

      {/* Content column — wider when a chart is present */}
      <div style={{ maxWidth: hasChart ? '90%' : '72%', minWidth: 0, width: hasChart ? '90%' : undefined }}>

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