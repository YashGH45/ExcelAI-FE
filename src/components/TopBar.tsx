// ============================================================
//  TopBar.tsx
//  Header bar that spans the full width of the main content area.
//
//  Left side:  sidebar toggle · app title · active session name
//  Right side: sources panel toggle · dark/light mode · settings
//
//  Props:
//    sidebarOpen     — current sidebar state
//    onToggleSidebar — open/close sidebar
//    sessionName     — name of the active session (shown truncated)
//    fileName        — name of the attached file (shown instead of session name when present)
//    onOpenSettings  — open the appearance settings modal
//    panelOpen       — whether the sources panel is expanded
//    onTogglePanel   — open/close the sources panel
// ============================================================

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Bot, Moon, Sun, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  sessionName: string;
  fileName?: string | null;
  onOpenSettings: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}

export default function TopBar({
  sidebarOpen, onToggleSidebar, sessionName, fileName, onOpenSettings,
  panelOpen, onTogglePanel,
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

        {/* File name or active session name */}
        {(fileName || sessionName) && (
          <span className="top-bar-session">/ {fileName ?? sessionName}</span>
        )}
      </div>

      {/* ── Right cluster ───────────────────────────────────── */}
      <div className="top-bar-right">
        {/* Sources panel toggle */}
        <button
          className="icon-btn"
          onClick={onTogglePanel}
          title={panelOpen ? 'Close sources panel' : 'Open sources panel'}
        >
          {panelOpen
            ? <PanelRightClose size={17} />
            : <PanelRightOpen  size={17} />}
        </button>

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
