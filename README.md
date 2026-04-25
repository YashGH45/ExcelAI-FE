<<<<<<< HEAD
# Excel UI

A Claude-like chat interface for querying and analysing Excel / CSV spreadsheets, powered by a FastAPI backend.

## Features

- Upload `.xlsx` / `.csv` files and ask questions in natural language
- Dark and light mode with 8 colour themes (sand, sky, mint, rose / midnight, ocean, forest, volcanic)
- Retrieval transparency panel — shows source chunks and relevance scores
- Power controls: top-k, strict mode, search mode
- Output format selector (auto, table, bullet, prose)
- Collapsible session sidebar
- Fully responsive layout

## Tech stack

| Layer | Library |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 5 |
| Icons | Lucide React |
| Spreadsheet parsing | SheetJS (xlsx) |
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

The dev server starts on `http://localhost:5173` and proxies `/api/*` requests to `http://localhost:8000`.

### Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  types/index.ts           — shared TypeScript interfaces
  styles/themes.ts         — theme metadata for the picker UI
  context/ThemeContext.tsx — theme state (mode + colour), writes data-theme on <html>
  components/
    Sidebar.tsx            — collapsible session list
    TopBar.tsx             — header: sidebar toggle, title, dark/light toggle, settings
    WelcomeScreen.tsx      — new-chat screen with upload / skip cards
    MessageBubble.tsx      — renders messages with markdown, output format, sources button
    TypingIndicator.tsx    — animated three-dot indicator
    RetrievalPanel.tsx     — right-side drawer with chunk cards and score bars
    ChatInput.tsx          — input bar + output format pills + power controls
    FileContextBadge.tsx   — thin bar showing the attached spreadsheet name
    SettingsModal.tsx      — appearance modal: light/dark + colour theme grid
  App.tsx                  — root: ThemeProvider wraps ChatApp, manages session state
  index.css                — CSS variables (8 themes), component classes, animations
  utils/api.ts             — fetch helpers for /api/chat and /api/upload
```

## Backend API contract

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Send a message, receive `{ reply: string }` |
| `/api/upload` | POST | Upload a file, receive `{ filename, size }` |

## Licence

MIT
=======
# ExcelAI-Frontend-
>>>>>>> 20995ce1e0c6242096b23a9f8088a159bcf67709
