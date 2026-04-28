// ============================================================
//  App.tsx
//  Root component.  Wraps the entire app in ThemeProvider and
//  contains all session / message state.  Rendering is
//  delegated to the component files in src/components/.
//
//  State managed here:
//    sessions        — array of all chat sessions
//    activeId        — which session is currently visible
//    sidebarOpen     — whether the left sidebar is expanded
//    isTyping        — bot is generating a reply
//    showWelcome     — show WelcomeScreen instead of messages
//    settingsOpen    — show SettingsModal
//    openRetrieval   — RetrievalInfo to show in side panel (null = closed)
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bot, ChevronDown } from 'lucide-react';

import { ThemeProvider } from './context/ThemeContext';
import Sidebar          from './components/Sidebar';
import TopBar           from './components/TopBar';
import WelcomeScreen    from './components/WelcomeScreen';
import MessageBubble    from './components/MessageBubble';
import TypingIndicator  from './components/TypingIndicator';
import ChatInput        from './components/ChatInput';
import RetrievalPanel   from './components/RetrievalPanel';
import FileContextBadge from './components/FileContextBadge';
import SettingsModal    from './components/SettingsModal';

import { sendMessage } from './utils/api';
import type {
  Session, Message, FileContext,
  PowerControls, RetrievalInfo, RetrievalChunk, FileAttachment,
} from './types';

// ── Utilities ──────────────────────────────────────────────────

/** Compact unique ID generator — swap for `uuid` in production */
const uid = () => Math.random().toString(36).slice(2, 9);

/** Create a blank session object */
const newSession = (name = 'New Chat'): Session => ({
  id: uid(),
  name,
  messages: [],
  fileContext: null,
});

/**
 * Generate plausible-looking mock retrieval chunks for UI demo.
 * In production these would come from your vector-search backend.
 * Called after every bot reply so the retrieval panel has data.
 */
const makeMockRetrieval = (
  userMsg: string,
  fileCtx: FileContext | null,
  controls: PowerControls,
): RetrievalInfo => {
  // Grab the first 3 words > 3 chars as "matched terms"
  const terms = userMsg
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3);

  const count = Math.min(controls.topK, 4); // cap demo at 4 cards

  const chunks: RetrievalChunk[] = Array.from({ length: count }, (_, i) => ({
    id:           uid(),
    rank:         i + 1,
    source:       fileCtx ? fileCtx.name : 'knowledge_base.txt',
    score:        Math.max(0.45, parseFloat((0.97 - i * 0.13 - Math.random() * 0.04).toFixed(3))),
    matchedTerms: terms,
    text:
      fileCtx
        ? `Row context: ${fileCtx.preview.split('\n').slice(i * 2, i * 2 + 2).join(' | ') || 'No preview available'}`
        : `Passage ${i + 1}: "${userMsg.slice(0, 50)}…" — this is a mock retrieved passage that would come from your vector store.`,
  }));

  return {
    chunks,
    searchMode:    controls.searchMode,
    topK:          controls.topK,
    totalSearched: controls.topK * 5,
  };
};

// ── ChatApp (inner) ────────────────────────────────────────────
// Separated from the ThemeProvider wrapper so context is available.

function ChatApp() {
  // ── Session state ─────────────────────────────────────────────
  const [sessions,    setSessions]    = useState<Session[]>([newSession('Chat 1')]);
  const [activeId,    setActiveId]    = useState(sessions[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping,    setIsTyping]    = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [settingsOpen,setSettingsOpen]= useState(false);
  const [openRetrieval, setOpenRetrieval] = useState<RetrievalInfo | null>(null);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const scrollRef       = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  //
  // ── Derived: active session shortcut ─────────────────────────
  const activeSession = sessions.find(s => s.id === activeId)!;
  // Stabilise with useMemo so the array reference only changes when messages actually do
  const messages      = useMemo(() => activeSession?.messages ?? [], [activeSession]);
  const fileContext   = activeSession?.fileContext ?? null;

  // ── Immutable session helpers ─────────────────────────────────

  /** Replace one session in the array */
  const updateSession = useCallback(
    (id: string, updater: (s: Session) => Session) =>
      setSessions(prev => prev.map(s => s.id === id ? updater(s) : s)),
    [],
  );

  /** Append a message and auto-rename the session from first user msg */
  const appendMessage = useCallback(
    (sessionId: string, msg: Message) =>
      updateSession(sessionId, s => ({
        ...s,
        messages: [...s.messages, msg],
        // Name the session after the first user message (ChatGPT-style)
        name: s.messages.length === 0 && msg.role === 'user'
          ? msg.text.slice(0, 30) + (msg.text.length > 30 ? '…' : '')
          : s.name,
      })),
    [updateSession],
  );

  // ── Auto-scroll to latest message ─────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Track scroll position → show/hide scroll-to-bottom btn ────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distFromBottom > 100);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Event handlers ────────────────────────────────────────────

  /** File successfully uploaded → attach to session, hide welcome */
  const handleFileLoaded = (ctx: FileContext) => {
    updateSession(activeId, s => ({ ...s, fileContext: ctx }));
    setShowWelcome(false);
  };

  /** Remove file attachment from current session */
  const handleRemoveFile = () =>
    updateSession(activeId, s => ({ ...s, fileContext: null }));

  /**
   * Main send handler:
   *   1. Add user message
   *   2. Show typing indicator
   *   3. Call API (your real backend via utils/api.ts)
   *   4. Add bot reply + mock retrieval info
   */
  const handleSend = async (text: string, controls: PowerControls) => {
    const ts               = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const capturedId       = activeId; // snapshot before async gap

    // 1 — User message
    appendMessage(capturedId, { id: uid(), role: 'user', text, timestamp: ts });

    // 2 — Start typing indicator
    setIsTyping(true);

    try {
      // 3 — Real API call (wired to FastAPI backend via Vite proxy)
      const response = await sendMessage(text, fileContext);

      // 4 — Bot reply with attached retrieval info (UI demo data)
      const retrievalInfo = makeMockRetrieval(text, fileContext, controls);

      const fileAttachment: FileAttachment | undefined =
        response.download_url
          ? {
              // Extract filename from the URL path
              name: response.download_url.split('/').pop() ?? 'download',
              url:  response.download_url,
            }
          : undefined;

      const botMsg: Message = {
        id: uid(),
        role: 'bot',
        text:           response.reply,
        timestamp:      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        retrievalInfo,
        outputFormat:   controls.outputFormat,
        vegaSpec:       response.vega_spec,
        insights:       response.insights,
        fileAttachment,
      };
      appendMessage(capturedId, botMsg);
    } catch (err) {
      appendMessage(capturedId, {
        id: uid(), role: 'bot',
        text: `Error: ${(err as Error).message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } finally {
      setIsTyping(false);
    }
  };

  /** Create a new session and switch to it */
  const handleNewChat = () => {
    const s = newSession(`Chat ${sessions.length + 1}`);
    setSessions(prev => [...prev, s]);
    setActiveId(s.id);
    setShowWelcome(true);
    setOpenRetrieval(null);
  };

  /** Switch to a session; show welcome if it's empty */
  const handleSelectSession = (id: string) => {
    setActiveId(id);
    const s = sessions.find(x => x.id === id);
    setShowWelcome(!s?.messages.length && !s?.fileContext);
    setOpenRetrieval(null);
  };

  /** Delete a session (never the last one) */
  const handleDeleteSession = (id: string) => {
    if (sessions.length === 1) return;
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (activeId === id) {
      setActiveId(remaining[0].id);
      setShowWelcome(!remaining[0].messages.length);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="app-shell">

      {/* ── Left: collapsible session sidebar ───────────────── */}
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        isOpen={sidebarOpen}
        onSelect={handleSelectSession}
        onCreate={handleNewChat}
        onDelete={handleDeleteSession}
      />

      {/* ── Right: main content ─────────────────────────────── */}
      <main className="app-main">

        {/* Header bar */}
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          sessionName={activeSession?.name ?? ''}
          fileName={fileContext?.name ?? null}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* File attachment indicator */}
        {fileContext && (
          <FileContextBadge
            fileContext={fileContext}
            onRemove={handleRemoveFile}
          />
        )}

        {/* ── Message area ──────────────────────────────────── */}
        {showWelcome && messages.length === 0 ? (

          /* Welcome / file-upload screen */
          <WelcomeScreen
            onFileLoaded={handleFileLoaded}
            onSkip={() => setShowWelcome(false)}
          />

        ) : (

          /* Relative wrapper holds both the message list and
             the floating scroll-to-bottom button */
          <div className="messages-area">

            {/* Message list */}
            <div ref={scrollRef} className="chat-messages">

              {/* Empty state hint */}
              {messages.length === 0 && (
                <div className="empty-hint">
                  <Bot size={32} style={{ opacity: 0.3 }} />
                  <p>Send a message to get started.</p>
                </div>
              )}

              {/* Render each message */}
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onViewSources={info => setOpenRetrieval(info)}
                />
              ))}

              {/* Typing indicator while bot is thinking */}
              {isTyping && (
                <div className="message-row bot">
                  <div className="message-avatar">
                    <Bot size={13} />
                  </div>
                  <TypingIndicator />
                </div>
              )}

              {/* Invisible scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Floating scroll-to-bottom button */}
            {showScrollBtn && (
              <button
                className="scroll-bottom-btn"
                onClick={scrollToBottom}
                title="Scroll to bottom"
                aria-label="Scroll to bottom"
              >
                <ChevronDown size={20} />
              </button>
            )}

          </div>
        )}

        {/* Input bar — hidden on welcome screen */}
        {!showWelcome && (
          <ChatInput onSend={handleSend} disabled={isTyping} />
        )}

      </main>

      {/* ── Retrieval side panel (slides in from right) ─────── */}
      {openRetrieval && (
        <RetrievalPanel
          info={openRetrieval}
          onClose={() => setOpenRetrieval(null)}
        />
      )}

      {/* ── Appearance settings modal ────────────────────────── */}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}

    </div>
  );
}

// ── Default export — wraps ChatApp in the ThemeProvider ────────
export default function App() {
  return (
    <ThemeProvider>
      <ChatApp />
    </ThemeProvider>
  );
}