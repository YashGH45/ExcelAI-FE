// ============================================================
//  ChatInput.tsx
//  The bottom input bar.  Structured in three stacked layers:
//
//  1. Power Controls toggle row (always visible, one line)
//  2. Power Controls panel      (collapsible, opens downward)
//  3. Output format pills       (always visible)
//  4. Textarea + Send button    (the actual input)
//
//  Power controls exposed to parent via the onSend callback so
//  App.tsx can attach them to the message without prop-drilling.
//
//  Props:
//    onSend   — called with (text, currentPowerControls)
//    disabled — true while the bot is generating a reply
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  Send, SlidersHorizontal, ChevronDown, ChevronUp,
  AlignLeft, List, Table, Code, Plus,
} from 'lucide-react';
import type { PowerControls, OutputFormat, SearchMode } from '../types';

interface Props {
  onSend: (text: string, controls: PowerControls) => void;
  disabled: boolean;
}

// ── Default control values ─────────────────────────────────────
const DEFAULT_CONTROLS: PowerControls = {
  topK:         5,
  strictMode:   false,
  searchMode:   'semantic',
  outputFormat: 'text',
};

// ── Output format pill definitions ─────────────────────────────
const FORMAT_OPTIONS: Array<{ id: OutputFormat; label: string; icon: React.ReactNode }> = [
  { id: 'text',    label: 'Text',    icon: <AlignLeft size={11} /> },
  { id: 'bullets', label: 'Bullets', icon: <List      size={11} /> },
  { id: 'table',   label: 'Table',   icon: <Table     size={11} /> },
  { id: 'raw',     label: 'Raw',     icon: <Code      size={11} /> },
];

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText]                 = useState('');
  const [controls, setControls]         = useState<PowerControls>(DEFAULT_CONTROLS);
  const [controlsOpen, setControlsOpen] = useState(false);
  const textareaRef                     = useRef<HTMLTextAreaElement>(null);

  // ── Auto-grow textarea up to 120 px ───────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  // ── Helpers to update a single control field ──────────────────
  const set = <K extends keyof PowerControls>(key: K, val: PowerControls[K]) =>
    setControls(prev => ({ ...prev, [key]: val }));

  // ── Send handler ──────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, controls);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-bar">

      {/* ── 1. Power Controls toggle row ──────────────────────── */}
      <div className="controls-toggle-row">
        <button
          className="controls-toggle-btn"
          onClick={() => setControlsOpen(v => !v)}
          title="Toggle power controls"
        >
          <SlidersHorizontal size={12} />
          Controls
          {controlsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        {/* Quick-glance current settings (shown when panel is closed) */}
        {!controlsOpen && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
            k={controls.topK}
            {' · '}{controls.searchMode}
            {controls.strictMode && ' · strict'}
          </span>
        )}
      </div>

      {/* ── 2. Power Controls panel (collapsible) ─────────────── */}
      {controlsOpen && (
        <div className="power-controls-panel">

          {/* Top-K slider */}
          <div className="control-row">
            <span className="control-label">Top-K</span>
            <input
              type="range"
              className="topk-slider"
              min={1}
              max={20}
              value={controls.topK}
              onChange={e => set('topK', Number(e.target.value))}
            />
            <span className="topk-value">{controls.topK}</span>
          </div>

          {/* Search mode pills */}
          <div className="control-row">
            <span className="control-label">Search</span>
            <div className="mode-pills">
              {(['semantic', 'keyword'] as SearchMode[]).map(mode => (
                <button
                  key={mode}
                  className={`mode-pill ${controls.searchMode === mode ? 'active' : ''}`}
                  onClick={() => set('searchMode', mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Strict mode toggle */}
          <div className="control-row" style={{ gap: 10 }}>
            <span className="control-label">Strict</span>
            {/* CSS toggle switch driven by .on class */}
            <button
              className={`toggle-switch ${controls.strictMode ? 'on' : ''}`}
              role="switch"
              aria-checked={controls.strictMode}
              onClick={() => set('strictMode', !controls.strictMode)}
              title="Strict mode: only answer if exact data is found"
            />
            <span className="strict-label">
              {controls.strictMode
                ? 'Only answer from data — say "Not found" otherwise'
                : 'Answer from context + general knowledge'}
            </span>
          </div>

        </div>
      )}

      {/* ── 3. Output format pills ────────────────────────────── */}
      <div className="format-pills">
        {FORMAT_OPTIONS.map(opt => (
          <button
            key={opt.id}
            className={`format-pill ${controls.outputFormat === opt.id ? 'active' : ''}`}
            onClick={() => set('outputFormat', opt.id)}
            title={`Show response as ${opt.label}`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── 4. Floating Reply container ───────────────────────── */}
      <div className="reply-container">
        {/* '+' icon — far left */}
        <button className="plus-btn" title="Attach file" type="button">
          <Plus size={16} />
        </button>

        {/* Auto-growing textarea — center */}
        <textarea
          ref={textareaRef}
          className="reply-textarea"
          rows={1}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for response…' : 'Reply…'}
          disabled={disabled}
        />

        {/* Circular send button — far right */}
        <button
          className="reply-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          title="Send (Enter)"
        >
          <Send size={15} />
        </button>
      </div>

    </div>
  );
}