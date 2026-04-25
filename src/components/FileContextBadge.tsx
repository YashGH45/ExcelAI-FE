// ============================================================
//  FileContextBadge.tsx
//  Thin info bar shown at the top of the chat area when a
//  spreadsheet file is attached to the current session.
//  Shows: filename, row & column count, and a remove button.
// ============================================================

import { FileSpreadsheet, X } from 'lucide-react';
import type { FileContext } from '../types';

interface Props {
  fileContext: FileContext;
  onRemove: () => void;
}

export default function FileContextBadge({ fileContext, onRemove }: Props) {
  return (
    <div className="file-badge">
      {/* Spreadsheet icon with accent colour */}
      <FileSpreadsheet
        size={13}
        style={{ color: 'var(--accent)', flexShrink: 0 }}
      />

      {/* File metadata */}
      <span className="file-badge-text">
        {fileContext.name}
        {fileContext.rowCount > 0 &&
          ` — ${fileContext.rowCount} rows × ${fileContext.colCount} cols`}
      </span>

      {/* Remove file from session */}
      <button
        className="icon-btn"
        style={{ padding: 3 }}
        onClick={onRemove}
        title="Remove file"
      >
        <X size={12} />
      </button>
    </div>
  );
}