// ============================================================
//  Sidebar.tsx
//  Collapsible left panel listing all chat sessions.
//  Width animates via CSS transition; content is hidden when
//  width === 0 so keyboard focus can't reach invisible items.
//
//  Props:
//    sessions  — all session objects
//    activeId  — currently open session id
//    isOpen    — whether the panel is expanded
//    onSelect  — switch to a session
//    onCreate  — create a new session
//    onDelete  — delete a session by id
// ============================================================

import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import type { Session } from '../types';

interface Props {
  sessions: Session[];
  activeId: string;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export default function Sidebar({
  sessions, activeId, isOpen, onSelect, onCreate, onDelete,
}: Props) {
  return (
    /* Width transition is handled inline so it can be driven by JS state */
    <aside
      className="app-sidebar"
      style={{ width: isOpen ? 240 : 0 }}
      aria-hidden={!isOpen}
    >
      <div className="sidebar-inner">

        {/* ── Header: label + new-chat button ───────────────── */}
        <div className="sidebar-header">
          <span className="sidebar-title">Chats</span>
          <button className="new-chat-btn" onClick={onCreate} title="New chat">
            <Plus size={12} />
            New
          </button>
        </div>

        {/* ── Session list ──────────────────────────────────── */}
        <ul className="session-list">
          {sessions.map((s) => (
            <li key={s.id} className="session-item">

              {/* Session select button */}
              <button
                className={`session-btn ${s.id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(s.id)}
                title={s.name}
              >
                <MessageSquare
                  size={13}
                  style={{ flexShrink: 0, opacity: 0.55 }}
                />
                <span className="session-name">{s.name}</span>
              </button>

              {/* Delete button — hidden via CSS opacity until row hover.
                  Only shown if more than 1 session exists. */}
              {sessions.length > 1 && (
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  title="Delete chat"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}
        </ul>

      </div>
    </aside>
  );
}