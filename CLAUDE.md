# CLAUDE.md — excel-ui

> Token Shield context file. Read this before opening any source file.
> Generated: 2026-06-24 | Stack snapshot reflects current `package.json`.
> **Before opening any source file, read `.codebase_context/INDEX.meta` first.**

---

## Project Overview

**excel-ui** is a React + Vite chat application for querying uploaded Excel/CSV/PDF files
via a FastAPI backend. Users upload a file, optionally run a Smart Parser workflow, then
chat with the document. The backend performs retrieval-augmented generation (RAG); the
frontend renders markdown, Vega-Lite charts, and Excel previews inline.

---

## Stack

| Layer | Library / Version |
|---|---|
| UI framework | React 19.2.4 |
| Build tool | Vite 5.4.0 |
| Language | TypeScript ~6.0.2 |
| Charting | vega-embed 7.x + vega-lite 6.x |
| Spreadsheet parsing | xlsx 0.18.5 |
| Icons | lucide-react 1.8.0 |
| Styling | Pure CSS (index.css) with CSS custom properties |
| No routing library | State-driven navigation only |
| No state library | Local React state + one Context |

---

## Entry Point

```
src/main.tsx  →  <App />  (wrapped in React.StrictMode)
src/App.tsx   →  <ThemeProvider> → <ChatApp>
```

`ChatApp` in `App.tsx` is the only stateful root. It owns:
- `sessions[]` / `activeId` — chat history
- `messages[]` / `isTyping` — current session messages
- `showWelcome` / `settingsOpen` / `openRetrieval` — view flags
- `fileContext` — attached file metadata

---

## Navigation (no router)

There is **no React Router**. All "pages" are conditional renders inside `App.tsx`:

| State | View shown |
|---|---|
| `showWelcome === true` | `<WelcomeScreen>` |
| `showWelcome === false` | Message list + `<ChatInput>` |
| `settingsOpen === true` | `<SettingsModal>` overlay |
| `openRetrieval !== null` | `<RetrievalPanel>` side drawer |
| Sidebar `isOpen` | `<Sidebar>` (session list) |

---

## Key Directories

```
src/
  App.tsx               Root + all session state
  main.tsx              React entry point
  index.css             ALL styles (theme tokens, layout, components)
  App.css               Empty legacy file — ignore
  components/           All UI components (see below)
  context/
    ThemeContext.tsx     Light/dark + colour theme provider
  styles/
    themes.ts           Theme metadata arrays + CSS key builder
  types/
    index.ts            Every shared TypeScript type/interface
  utils/
    api.ts              All backend fetch calls

graphify-out/
  graph.json            Knowledge graph (20 nodes, 31 edges)

.codebase_context/
  INDEX.meta            One-line index of every source file
  ROUTES.meta           Navigation model explanation
  metadata/             Per-file .meta files (19 files)
```

---

## The 5 Most Important Components

### 1. `src/App.tsx`
Root; owns 100% of app state. Both `App` (ThemeProvider wrapper) and `ChatApp`
(the actual app) are defined here.
Key state: `sessions`, `messages`, `isTyping`, `showWelcome`, `fileContext`, `settingsOpen`.
Calls `sendMessage` and `uploadFile` from `api.ts`.

### 2. `src/components/WelcomeScreen.tsx`
Entry for new sessions. Manages file drag-drop, Smart Parser toggle, and loading overlay.
Renders `<SmartParserDialog>` and `<PdfTipsOverlay>` conditionally.
Props: `onFileLoaded(ctx, sessionId)`, `onSkip()`.

### 3. `src/components/MessageBubble.tsx`
Renders every chat message. Handles markdown, inline `<ChartRenderer>`, Excel table
preview (`<ExcelPreview>`), insights cards, and a "View Sources" button.
Props: `message`, `onViewSources(info)`.

### 4. `src/components/ChatInput.tsx`
Bottom bar with auto-growing textarea, power controls panel (search mode, filters),
and output format pills (table / text / chart / insights).
Props: `onSend(text, controls, format)`, `disabled`.

### 5. `src/context/ThemeContext.tsx`
Single global context. Exposes `{ mode, colorTheme, isDark, toggleMode, setColorTheme }`.
Persists to `localStorage`. Consumed via `useTheme()` hook in `TopBar`, `SettingsModal`,
`ChartRenderer`.

---

## State Management

**No Redux / Zustand / Jotai.** All state is local React `useState` in `App.tsx`, passed
down as props. The only shared state is theme — via `ThemeContext`.

```
ThemeContext  →  useTheme()  →  TopBar, SettingsModal, ChartRenderer
All other state  →  props from App.tsx
```

---

## API / Backend

| Item | Value |
|---|---|
| Dev proxy | `/api/*` → `http://localhost:8000` (Vite config) |
| Backend | FastAPI (external, not in this repo) |
| Base path | `/api` (all calls in `src/utils/api.ts`) |

Key functions in `src/utils/api.ts`:
- `sendMessage(payload)` — POST `/api/chat`
- `uploadFile(file, smartParser, sessionId)` — POST `/api/upload`
- `fetchSmartParserQuestions(fileName)` — GET `/api/smart-parser/questions`
- `submitSmartParserAnswers(fileName, answers)` — POST `/api/smart-parser/submit`

No `.env.example` found. The proxy target `http://localhost:8000` is hardcoded in
`vite.config.ts`. Change it there for staging/production.

---

## Shared Types (`src/types/index.ts`)

All interfaces live here. Key ones:
- `Message` — chat message (role, content, chartSpec, excelData, retrievalInfo, …)
- `Session` — chat session (id, name, fileContext)
- `FileContext` — attached file info (name, rows, cols, sessionId)
- `RetrievalInfo` / `RetrievalChunk` — RAG source data
- `PowerControls` — search mode + filter flags
- `OutputFormat` — `"table" | "text" | "chart" | "insights"`
- `ThemeMode` — `"light" | "dark"`
- `ColorTheme` / `LightTheme` / `DarkTheme`

---

## Theming

CSS custom properties drive all colours. `ThemeContext` writes a class on `document.body`
(e.g. `theme-dark-ocean`) which activates a block of CSS variables in `src/index.css`.

Theme metadata (display names, CSS keys) lives in `src/styles/themes.ts`:
- `LIGHT_THEMES[]` — array of `ThemeOption`
- `DARK_THEMES[]` — array of `ThemeOption`
- `buildThemeKey(mode, name)` → CSS class string

---

## Commands

```bash
npm run dev       # Start Vite dev server (port 5173 by default)
npm run build     # tsc -b && vite build  →  dist/
npm run preview   # Preview production build
npm run lint      # ESLint
```

No test runner configured (no vitest / jest / playwright in package.json).

---

## Context Compression Artefacts

| File | Purpose |
|---|---|
| `graphify-out/graph.json` | Full knowledge graph — 20 nodes, 31 edges |
| `.codebase_context/INDEX.meta` | One-line index of all source files (~3.2 KB) |
| `.codebase_context/ROUTES.meta` | Navigation model |
| `.codebase_context/metadata/**/*.meta` | Per-file detailed metadata (19 files) |

Start a new session by reading `INDEX.meta` and the relevant `.meta` files
instead of opening source files cold.
