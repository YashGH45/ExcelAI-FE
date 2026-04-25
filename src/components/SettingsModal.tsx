// ============================================================
//  SettingsModal.tsx
//  Appearance settings modal.
//
//  Sections:
//    1. Mode — light / dark toggle switch
//    2. Colour theme — swatch grid for the active mode's themes
//       (light themes when light mode is on, dark when dark)
//
//  Clicking the backdrop or the X button closes the modal.
//  Theme changes take effect instantly via ThemeContext.
// ============================================================

import { X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { LIGHT_THEMES, DARK_THEMES } from '../styles/themes';
import type { ColorTheme } from '../types';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { isDark, colorTheme, toggleMode, setColorTheme } = useTheme();

  // Show the theme options that match the current mode
  const themeOptions = isDark ? DARK_THEMES : LIGHT_THEMES;

  return (
    /* Backdrop — clicking it closes the modal */
    <div className="modal-backdrop" onClick={onClose}>

      {/* Modal card — stopPropagation prevents backdrop click */}
      <div className="modal-card" onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="modal-header">
          <span className="modal-title">Appearance</span>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* ── Section 1: Light / Dark mode ────────────────────── */}
        <div className="settings-section">
          <p className="settings-section-label">Mode</p>

          <div className="mode-toggle-row">
            <span className="mode-toggle-label">
              {isDark
                ? <><Moon size={15} style={{ color: 'var(--accent)' }} /> Dark mode</>
                : <><Sun  size={15} style={{ color: 'var(--accent)' }} /> Light mode</>}
            </span>
            {/* CSS toggle switch — class 'on' activates the accent colour */}
            <button
              className={`toggle-switch ${isDark ? 'on' : ''}`}
              role="switch"
              aria-checked={isDark}
              onClick={toggleMode}
              style={{ width: 44, height: 24 }} /* override to wider size for mode toggle */
              title="Toggle dark mode"
            />
          </div>
        </div>

        {/* ── Section 2: Colour themes ────────────────────────── */}
        <div className="settings-section">
          <p className="settings-section-label">
            {isDark ? 'Dark' : 'Light'} Colour Theme
          </p>

          <div className="theme-grid">
            {themeOptions.map(theme => (
              <div key={theme.id} className="theme-swatch-wrap">
                {/* Clickable colour swatch */}
                <button
                  className={`theme-swatch ${colorTheme === theme.id ? 'active' : ''}`}
                  onClick={() => setColorTheme(theme.id as ColorTheme)}
                  title={theme.label}
                >
                  {/* Top half = background colour */}
                  <div
                    className="swatch-bg"
                    style={{ background: theme.swatchBg }}
                  />
                  {/* Bottom strip = accent colour */}
                  <div
                    className="swatch-accent"
                    style={{ background: theme.swatchAccent }}
                  />
                </button>

                {/* Label below swatch */}
                <span className={`swatch-name ${colorTheme === theme.id ? 'active' : ''}`}>
                  {theme.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tip ─────────────────────────────────────────────── */}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Your preference is saved automatically and persists between sessions.
        </p>

      </div>
    </div>
  );
}