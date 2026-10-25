# Excel UI

A Claude-like chat interface for querying and analysing Excel / CSV spreadsheets and PDF
documents, powered by a FastAPI backend that performs retrieval-augmented generation (RAG).

## Features

- Upload `.xlsx` / `.csv` / `.pdf` files and ask questions in natural language
- **Smart Parser** workflow — guided Q&A that generates richer metadata for a file before chat
- Inline **chart rendering** via Vega-Lite for analytical responses
- **Insights cards** summarising key findings from an analysis
- Excel/CSV table preview and one-click download of files the backend returns
- **Retrieval transparency panel** — shows retrieved source chunks, relevance scores, and SQL
  queries used against spreadsheet data
- **PDF viewer** with page navigation and bounding-box highlight overlay for cited passages
- Power controls: top-k, strict mode, semantic/keyword search mode
- Output format selector (text, bullets, table, raw)
- Dark and light mode with 8 colour themes (sand, sky, mint, rose / midnight, ocean, forest, volcanic)
- Collapsible session sidebar
- Fully responsive layout

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 5 |
| Icons | Lucide React |
| Charting | vega / vega-lite / vega-embed |
| Spreadsheet parsing | SheetJS (xlsx) |
| PDF parsing/rendering | pdfjs-dist |
| Backend (separate) | FastAPI (Python) |

## Getting started

### Prerequisites

- Node.js 18+
- A running FastAPI backend on `http://localhost:8000` (see backend repo)

### Install and run

```bash
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` and proxies `/api/*` requests to
`http://localhost:8000` (hardcoded in `vite.config.ts` — change it there for staging/production).

### Build for production

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

No test runner is configured (no vitest / jest / playwright in `package.json`).

## Project structure

```
src/
  types/index.ts           — shared TypeScript interfaces
  styles/themes.ts         — theme metadata for the picker UI
  context/ThemeContext.tsx — theme state (mode + colour), persists to localStorage
  components/
    Sidebar.tsx            — collapsible session list
    TopBar.tsx             — header: sidebar toggle, title, dark/light toggle, settings
    WelcomeScreen.tsx      — new-chat screen: file drag-drop, Smart Parser toggle, loading overlay
    SmartParserDialog.tsx  — guided Q&A dialog for Smart Parser metadata
    PdfTipsOverlay.tsx     — usage tips overlay shown for PDF uploads
    MessageBubble.tsx      — renders messages: markdown, charts, excel preview, insights, sources
    ChartRenderer.tsx      — renders Vega-Lite chart specs returned by the backend
    PdfViewer.tsx          — in-app PDF viewer with highlight overlay for cited passages
    TypingIndicator.tsx    — animated three-dot indicator
    RetrievalPanel.tsx     — right-side drawer with chunk cards, score bars, SQL/PDF evidence
    ChatInput.tsx          — input bar + output format pills + power controls
    FileContextBadge.tsx   — thin bar showing the attached file name
    SettingsModal.tsx      — appearance modal: light/dark + colour theme grid
  App.tsx                  — root: ThemeProvider wraps ChatApp, manages all session state
  index.css                — CSS variables (8 themes), component classes, animations
  utils/api.ts             — fetch helpers for chat, upload, and Smart Parser endpoints
```

> See `CLAUDE.md` and `.codebase_context/` for a deeper architecture reference.

## Backend API contract

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Send a message, receive `{ reply, vega_spec?, insights?, download_url?, sources?, evidence? }` |
| `/api/upload` | POST | Upload a file (optionally with Smart Parser enabled), receive `{ filename, rows?, col_count? }` |
| `/api/smart-parser/questions` | GET | Fetch the Smart Parser question list for the active session |
| `/api/smart-parser/answers` | POST | Submit Smart Parser answers to trigger metadata generation |

## Licence

MIT