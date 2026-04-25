// ============================================================
//  MessageBubble.tsx
//  Renders a single chat message (user or bot).
//
//  Features:
//    • Basic markdown: **bold**, `inline code`, ```code blocks```
//    • "View Sources" button on bot messages that have retrievalInfo
//    • Output format transformations (bullets, table, raw) applied
//      at display time — the underlying text is always preserved
//    • Timestamp shown below each message
//
//  Props:
//    message        — the Message object to display
//    onViewSources  — called when user clicks "View Sources";
//                     receives the message's RetrievalInfo
// ============================================================

import { Bot, User, BookOpen } from 'lucide-react';
import type { Message, RetrievalInfo, OutputFormat } from '../types';

interface Props {
  message: Message;
  onViewSources?: (info: RetrievalInfo) => void;
}

// ── Markdown renderer ──────────────────────────────────────────
// Simple inline parser — handles the most common cases without a
// full Markdown library dependency.
function renderMarkdown(text: string) {
  // Split on fenced code blocks first (``` ... ```)
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/^```\w*\n?/, '').replace(/```$/, '').trimEnd();
      return <pre key={i} className="code-block">{code}</pre>;
    }
    // Within plain text: handle **bold** and `inline code`
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
// These transform the raw text at display time only.
// The original message.text is never mutated.
function applyOutputFormat(text: string, format: OutputFormat): React.ReactNode {
  switch (format) {

    // Convert newlines to a bullet-point list
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

    // Render as a simple two-column table (label | value, split on ':')
    case 'table': {
      const rows = text.split('\n').filter(l => l.trim());
      return (
        <table style={{
          borderCollapse: 'collapse',
          width: '100%',
          fontSize: 13,
        }}>
          <tbody>
            {rows.map((row, i) => {
              const [label, ...rest] = row.split(':');
              return (
                <tr key={i} style={{
                  borderBottom: '1px solid var(--border-light)',
                  background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                }}>
                  <td style={{
                    padding: '5px 10px 5px 0',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                    width: '40%',
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

    // Dump the raw text in a monospace code block
    case 'raw':
      return <pre className="code-block" style={{ fontSize: 11 }}>{text}</pre>;

    // Default text — apply markdown rendering
    default:
      return renderMarkdown(text);
  }
}

// ── Component ──────────────────────────────────────────────────
export default function MessageBubble({ message, onViewSources }: Props) {
  const isUser = message.role === 'user';
  const fmt    = message.outputFormat ?? 'text';

  return (
    <div className={`message-row ${isUser ? 'user' : 'bot'}`}>

      {/* Bot avatar — left side */}
      {!isUser && (
        <div className="message-avatar">
          <Bot size={13} />
        </div>
      )}

      <div style={{ maxWidth: '72%', minWidth: 0 }}>
        {/* Message bubble */}
        <div className={`message-bubble ${isUser ? 'user' : 'bot'}`}>
          {applyOutputFormat(message.text, fmt)}
        </div>

        {/* Footer: timestamp + optional "View Sources" button */}
        <div
          className="message-footer"
          style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}
        >
          <span className="message-timestamp">{message.timestamp}</span>

          {/* Show retrieval button only on bot messages that have chunk data */}
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

          {/* Output format badge — subtle reminder of active format */}
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
          style={{
            background: 'var(--btn-send)',
            color: 'var(--btn-send-text)',
            border: 'none',
          }}
        >
          <User size={13} />
        </div>
      )}
    </div>
  );
}