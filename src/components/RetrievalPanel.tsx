// ============================================================
//  RetrievalPanel.tsx
//  Right-side drawer showing retrieved source chunks for the
//  last inspected bot message.  Opens when the user clicks
//  "View Sources" on any bot bubble that has retrievalInfo.
//
//  What it shows:
//    • Search mode (Semantic / Keyword) and Top-K used
//    • Each chunk: rank badge, source name, similarity score
//      with a visual bar, matched-term highlights, text excerpt
//
//  Props:
//    info    — RetrievalInfo object from the message
//    onClose — close the panel
// ============================================================

import { X, Database, Zap, Search } from 'lucide-react';
import type { RetrievalInfo, RetrievalChunk } from '../types';

interface Props {
  info: RetrievalInfo;
  onClose: () => void;
}

// ── Score helpers ──────────────────────────────────────────────

/** Map a 0–1 score to a CSS class for colour-coding */
function scoreClass(score: number): string {
  if (score >= 0.75) return 'score-high';
  if (score >= 0.50) return 'score-mid';
  return 'score-low';
}

/** Format score as a percentage string */
const pct = (score: number) => `${Math.round(score * 100)}%`;

// ── Highlight matched terms inside chunk text ─────────────────
// Wraps every occurrence of a matched term with a <mark> element.
function HighlightedText({
  text, terms,
}: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;

  // Build a case-insensitive regex matching any of the terms
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex   = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts   = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i}>{part}</mark>
          : part
      )}
    </>
  );
}

// ── Single chunk card ──────────────────────────────────────────
function ChunkCard({ chunk }: { chunk: RetrievalChunk }) {
  const cls = scoreClass(chunk.score);
  return (
    <div className="chunk-card">
      {/* Header row: source file + score badge */}
      <div className="chunk-header">
        <span className="rank-badge">#{chunk.rank}</span>
        <span className="chunk-source" title={chunk.source}>
          {chunk.source}
        </span>
        <span className={`chunk-score ${cls}`}>
          {pct(chunk.score)}
        </span>
      </div>

      {/* Visual score bar */}
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: pct(chunk.score),
            // Colour matches the badge class via direct CSS vars
            background: cls === 'score-high'
              ? 'var(--score-high)'
              : cls === 'score-mid'
              ? 'var(--score-mid)'
              : 'var(--score-low)',
          }}
        />
      </div>

      {/* Chunk text with term highlights */}
      <p className="chunk-text">
        <HighlightedText text={chunk.text} terms={chunk.matchedTerms} />
      </p>

      {/* Show matched keyword terms if present */}
      {chunk.matchedTerms.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {chunk.matchedTerms.map((term, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panel component ────────────────────────────────────────────
export default function RetrievalPanel({ info, onClose }: Props) {
  const modeIcon = info.searchMode === 'semantic'
    ? <Zap size={11} />
    : <Search size={11} />;

  return (
    <div className="retrieval-panel">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="retrieval-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Database size={14} style={{ color: 'var(--accent)' }} />
          <span className="retrieval-title">Sources &amp; Context</span>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close panel">
          <X size={15} />
        </button>
      </div>

      {/* ── Metadata badges ─────────────────────────────────── */}
      <div className="retrieval-meta">
        <span className="meta-badge" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {modeIcon}
          {info.searchMode === 'semantic' ? 'Semantic search' : 'Keyword search'}
        </span>
        <span className="meta-badge">
          Top-{info.topK} of {info.totalSearched}
        </span>
        <span className="meta-badge">
          {info.chunks.length} chunk{info.chunks.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      {/* ── Chunk cards list ─────────────────────────────────── */}
      <div className="retrieval-chunks">
        {info.chunks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>
            No chunks retrieved
          </p>
        ) : (
          info.chunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} />
          ))
        )}
      </div>

    </div>
  );
}