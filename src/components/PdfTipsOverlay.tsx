// ============================================================
//  PdfTipsOverlay.tsx
//  Full-screen modal overlay shown while a PDF is uploading
//  and being parsed by the backend.
//
//  Displays a rotating carousel of tips about the app's
//  capabilities, auto-advancing every 4 seconds.
// ============================================================

import { useState, useEffect } from 'react';
import { FileText, Sparkles } from 'lucide-react';

const TIPS = [
  {
    emoji: '📊',
    title: 'Visualize Your Data',
    body:  'Ask me to generate charts or graphs from any data in your document.',
  },
  {
    emoji: '📋',
    title: 'Extract Tables',
    body:  'I can pull structured tables from your PDF so you can analyse them directly.',
  },
  {
    emoji: '⬇️',
    title: 'Export Your Results',
    body:  'Ask for a downloadable Excel or CSV file with any data I extract from the document.',
  },
  {
    emoji: '💡',
    title: 'Smart Summaries',
    body:  'Request an executive summary, key insights, or bullet-point takeaways in seconds.',
  },
  {
    emoji: '🔍',
    title: 'Natural Language Queries',
    body:  'Just ask in plain English — "What were the top expenses in Q3?"',
  },
  {
    emoji: '📁',
    title: 'Multi-Format Support',
    body:  'Upload Excel, CSV, or PDF files at any time — even mid-conversation.',
  },
];

const INTERVAL_MS   = 4000;
const FADE_DURATION = 300;

export default function PdfTipsOverlay() {
  const [currentTip, setCurrentTip] = useState(0);
  const [visible,    setVisible]    = useState(true); // false = mid-fade

  useEffect(() => {
    const timer = setInterval(() => {
      // Fade out → swap tip → fade in
      setVisible(false);
      const swap = setTimeout(() => {
        setCurrentTip(i => (i + 1) % TIPS.length);
        setVisible(true);
      }, FADE_DURATION);
      return () => clearTimeout(swap);
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const tip = TIPS[currentTip];

  return (
    <div className="modal-backdrop">
      <div className="modal-card pdf-tips-card">

        {/* Animated progress bar along the top */}
        <div className="pdf-tips-progress-bar">
          <div className="pdf-tips-progress-fill" />
        </div>

        {/* Icon + title */}
        <div className="pdf-tips-header">
          <div className="pdf-tips-icon-wrap">
            <FileText size={22} style={{ color: 'var(--accent)' }} />
            <div className="pdf-tips-ring" />
          </div>
          <div>
            <h2 className="modal-title" style={{ marginBottom: 3 }}>
              Parsing your PDF…
            </h2>
            <p className="pdf-tips-subhead">
              This may take a moment for larger files
            </p>
          </div>
        </div>

        <div className="pdf-tips-divider" />

        {/* Rotating tip */}
        <div
          className="pdf-tip-body"
          style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_DURATION}ms ease` }}
        >
          <div className="pdf-tip-label">
            <Sparkles size={11} style={{ color: 'var(--accent)' }} />
            Did you know?
          </div>
          <div className="pdf-tip-emoji">{tip.emoji}</div>
          <p className="pdf-tip-title">{tip.title}</p>
          <p className="pdf-tip-desc">{tip.body}</p>
        </div>

        {/* Progress dots */}
        <div className="pdf-tips-dots">
          {TIPS.map((_, i) => (
            <span
              key={i}
              className={`pdf-tips-dot${i === currentTip ? ' active' : ''}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}