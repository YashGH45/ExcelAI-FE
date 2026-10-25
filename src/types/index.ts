// ============================================================
//  types/index.ts
//  All shared TypeScript interfaces and type aliases.
//  Import from here in every component that needs them.
// ============================================================

// ── Chat data structures ──────────────────────────────────

/** Spreadsheet file attached to a bot message */
export interface FileAttachment {
  /** Filename, e.g. "result.csv" — derived from the URL */
  name: string;
  /** Backend download URL, e.g. "/api/download/result.csv" */
  url: string;
}

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
  /** Excel file returned by the backend — triggers preview + download */
  fileAttachment?: FileAttachment;
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
  /** Blob URL for rendering the original PDF — only set for .pdf uploads */
  fileUrl?: string;
  isPdf?: boolean;
}

// ── Retrieval transparency ────────────────────────────────

/** Bounding box in PDF user-space coordinates (origin: bottom-left, y-axis up) */
export interface BoundingBox {
  /** 1-based page number */
  page: number;
  /** Left edge in PDF points */
  x: number;
  /** Bottom edge in PDF points */
  y: number;
  width: number;
  height: number;
}

/** Discriminates how a retrieved chunk should be rendered */
export type SourceType = 'spreadsheet' | 'pdf' | 'generic';

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

  // ── Source-type discriminator ─────────────────────────────
  sourceType?: SourceType;

  // ── Spreadsheet-specific fields ───────────────────────────
  /** Sheet name within the workbook */
  sheetName?: string;
  /** Number of rows returned in this chunk */
  rowsRetrieved?: number;
  /** Total rows in the source sheet */
  totalRows?: number;
  /** Column names that were queried */
  columnsUsed?: string[];
  /** Row data for the mini-table preview */
  tableRows?: Record<string, string | number | null>[];
  /** SQL query the backend executed to retrieve these rows */
  sqlQuery?: string;

  // ── PDF-specific fields ───────────────────────────────────
  /** Page number within the PDF (1-based) */
  pageNumber?: number;
  /** Section or heading the chunk belongs to */
  sectionHeading?: string;
  /** Character-level highlight spans into the `text` string (backend-computed) */
  highlightSpans?: { start: number; end: number }[];
  /** PDF viewer bounding boxes for visual highlight overlay (from evidence array) */
  boundingBoxes?: BoundingBox[];
  /** Character offsets for text-position navigation (from evidence array) */
  characterOffsets?: { start: number; end: number };
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