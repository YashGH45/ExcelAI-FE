// ============================================================
//  types/index.ts
//  All shared TypeScript interfaces and type aliases.
//  Import from here in every component that needs them.
// ============================================================

// ── Chat data structures ──────────────────────────────────

/** A single chat message in a conversation */
export interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  /** Retrieval context attached to bot messages (drives the transparency panel) */
  retrievalInfo?: RetrievalInfo;
  /** The output format active when this message was generated */
  outputFormat?: OutputFormat;
  /** Vega-Lite spec returned by the backend — triggers chart rendering */
  vegaSpec?: Record<string, unknown>;
  /** Key insights extracted from the data analysis */
  insights?: string[];
}

/** A named chat session / conversation thread */
export interface Session {
  id: string;
  name: string;
  messages: Message[];
  /** Spreadsheet data attached to this session */
  fileContext: FileContext | null;
}

/** Parsed spreadsheet metadata + first-row preview */
export interface FileContext {
  name: string;
  rowCount: number;
  colCount: number;
  preview: string;
  raw: unknown[][];
}

// ── Retrieval transparency ────────────────────────────────

/** One retrieved text chunk from the knowledge / vector store */
export interface RetrievalChunk {
  id: string;
  /** Full text of the retrieved passage */
  text: string;
  /** Source file, sheet, or section label */
  source: string;
  /** Cosine / BM25 similarity score, 0.0 – 1.0 */
  score: number;
  /** 1-based rank (1 = highest relevance) */
  rank: number;
  /** Terms that matched during keyword search (used for highlight overlay) */
  matchedTerms: string[];
}

/** Retrieval metadata bundled with a bot response */
export interface RetrievalInfo {
  chunks: RetrievalChunk[];
  searchMode: SearchMode;
  topK: number;
  /** Candidate pool size before top-k was applied */
  totalSearched: number;
}

// ── Power controls ────────────────────────────────────────

/** All user-configurable retrieval & generation controls */
export interface PowerControls {
  topK: number;               // chunks to retrieve (1–20)
  strictMode: boolean;        // refuse if no exact match found in data
  searchMode: SearchMode;     // semantic embedding vs keyword BM25
  outputFormat: OutputFormat; // how the response should be rendered
}

// ── Primitive types ───────────────────────────────────────

export type SearchMode   = 'semantic' | 'keyword';
export type OutputFormat = 'text' | 'bullets' | 'table' | 'raw';
export type ThemeMode    = 'light' | 'dark';
export type LightTheme   = 'sand' | 'sky' | 'mint' | 'rose';
export type DarkTheme    = 'midnight' | 'ocean' | 'forest' | 'volcanic';
export type ColorTheme   = LightTheme | DarkTheme;