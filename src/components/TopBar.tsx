// ============================================================
//  TopBar.tsx
//  Header bar that spans the full width of the main content area.
//
//  Left side:  sidebar toggle · app title · active session name
//  Right side: dark/light mode toggle · settings gear
//
//  Props:
//    sidebarOpen     — current sidebar state
//    onToggleSidebar — open/close sidebar
//    sessionName     — name of the active session (shown truncated)
//    onOpenSettings  — open the appearance settings modal
// ============================================================

import { PanelLeftClose, PanelLeftOpen, Bot, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  sessionName: string;
  onOpenSettings: () => void;
}

export default function TopBar({
  sidebarOpen, onToggleSidebar, sessionName, onOpenSettings,
}: Props) {
  const { isDark, toggleMode } = useTheme();

  return (
    <header className="top-bar">

      {/* ── Left cluster ────────────────────────────────────── */}
      <div className="top-bar-left">
        {/* Sidebar toggle */}
        <button
          className="icon-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen
            ? <PanelLeftClose size={17} />
            : <PanelLeftOpen  size={17} />}
        </button>

        {/* App logo + title */}
        <Bot size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="top-bar-title">Data Assistant</span>

        {/* Active session name — truncated if long */}
        {sessionName && (
          <span className="top-bar-session">/ {sessionName}</span>
        )}
      </div>

      {/* ── Right cluster ───────────────────────────────────── */}
      <div className="top-bar-right">
        {/* Dark / light mode quick toggle */}
        <button
          className="icon-btn"
          onClick={toggleMode}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Full appearance settings */}
        <button
          className="icon-btn"
          onClick={onOpenSettings}
          title="Appearance settings"
        >
          <Settings size={16} />
        </button>
      </div>

    </header>
  );
}