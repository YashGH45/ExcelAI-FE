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
import type { BackendSource, BackendEvidence } from './utils/api';
import type {
  Session, Message, FileContext,
  PowerControls, RetrievalInfo, RetrievalChunk, FileAttachment, BoundingBox,
} from './types';
import PdfViewer from './components/PdfViewer';

// ── Utilities ──────────────────────────────────────────────────

/** Compact unique ID generator — swap for `uuid` in production */
const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Normalise backend source objects into the frontend RetrievalChunk shape.
 * Handles snake_case → camelCase and fills in safe defaults.
 * `evidence` maps 1:1 to `sources` and carries bounding boxes for the PDF viewer.
 */
function mapSources(
  sources: BackendSource[],
  evidence: (BackendEvidence | null)[] | undefined,
  searchMode: PowerControls['searchMode'],
  topK: number,
): RetrievalInfo {
  const chunks: RetrievalChunk[] = sources.map((s, i) => {
    const ev = evidence?.[i];
    return {
      id:              uid(),
      rank:            i + 1,
      source:          s.file_name,
      text:            s.text ?? '',
      score:           s.score ?? 0,
      matchedTerms:    [],
      sourceType:      s.type,
      sheetName:       s.sheet_name,
      rowsRetrieved:   s.retrieved_row_count,
      totalRows:       s.total_row_count,
      columnsUsed:     s.columns_used,
      tableRows:       s.rows,
      sqlQuery:        s.sql,
      pageNumber:      s.page_number,
      sectionHeading:  s.section_heading,
      highlightSpans:  s.highlight_spans,
      boundingBoxes:   ev?.bounding_boxes,
      characterOffsets: ev?.character_offsets,
    };
  });
  return { chunks, searchMode, topK, totalSearched: sources.length };
}

/** Create a blank session object */
const newSession = (name = 'New Chat'): Session => ({
  id: uid(),
  name,
  messages: [],
  fileContext: null,
});

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
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [activeRetrievalMsgId, setActiveRetrievalMsgId] = useState<string | null>(null);

  // ── PDF viewer state ──────────────────────────────────────
  const [pdfViewerOpen,   setPdfViewerOpen]   = useState(false);
  const [pdfTargetPage,   setPdfTargetPage]   = useState(1);
  const [pdfHighlights,   setPdfHighlights]   = useState<BoundingBox[]>([]);

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
   *   4. Add bot reply with real retrieval info from backend
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

      // 4 — Bot reply with real retrieval info from backend
      const retrievalInfo = response.sources?.length
        ? mapSources(response.sources, response.evidence, controls.searchMode, controls.topK)
        : undefined;

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

  /** Open PDF viewer at the page/highlights for a source chunk */
  const handleOpenInPdf = useCallback((chunk: RetrievalChunk) => {
    setPdfTargetPage(chunk.pageNumber ?? 1);
    setPdfHighlights(chunk.boundingBoxes ?? []);
    setPdfViewerOpen(true);
  }, []);

  /** Create a new session and switch to it */
  const handleNewChat = () => {
    const s = newSession(`Chat ${sessions.length + 1}`);
    setSessions(prev => [...prev, s]);
    setActiveId(s.id);
    setShowWelcome(true);
    setOpenRetrieval(null);
    setPanelOpen(false);
    setActiveRetrievalMsgId(null);
    setPdfViewerOpen(false);
  };

  /** Switch to a session; show welcome if it's empty */
  const handleSelectSession = (id: string) => {
    setActiveId(id);
    const s = sessions.find(x => x.id === id);
    setShowWelcome(!s?.messages.length && !s?.fileContext);
    setOpenRetrieval(null);
    setPanelOpen(false);
    setActiveRetrievalMsgId(null);
    setPdfViewerOpen(false);
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
          panelOpen={panelOpen}
          onTogglePanel={() => setPanelOpen(v => !v)}
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
                  isSourceActive={activeRetrievalMsgId === msg.id && panelOpen}
                  onViewSources={info => {
                    setOpenRetrieval(info);
                    setActiveRetrievalMsgId(msg.id);
                    setPanelOpen(true);
                  }}
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

      {/* ── Sources panel — always in flex row, width animates ── */}
      <RetrievalPanel
        info={openRetrieval}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onOpenInPdf={fileContext?.isPdf ? handleOpenInPdf : undefined}
      />

      {/* ── PDF viewer — opens to the right of the sources panel ── */}
      <PdfViewer
        url={fileContext?.fileUrl ?? ''}
        targetPage={pdfTargetPage}
        highlights={pdfHighlights}
        isOpen={pdfViewerOpen && !!fileContext?.fileUrl}
        onClose={() => setPdfViewerOpen(false)}
      />

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