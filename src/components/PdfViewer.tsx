// ============================================================
//  PdfViewer.tsx
//  Right-side drawer that renders a PDF and overlays highlights.
//
//  Features:
//    • Lazy page rendering via IntersectionObserver (only renders
//      pages within 400 px of the viewport — never reloads the doc)
//    • Zoom in / out (50 % – 300 %, step 25 %)
//    • Page navigation: prev / next buttons + jump-to-page input
//    • Scroll to targetPage when it changes
//    • Bounding-box highlight overlay (PDF user-space coords)
//    • Flash animation on the active highlight
//    • Graceful degradation on missing / invalid evidence
//
//  Props:
//    url         — blob URL (or backend URL) of the PDF
//    targetPage  — 1-based page number to navigate to
//    highlights  — bounding boxes to draw on the PDF
//    isOpen      — controls the CSS slide-in animation
//    onClose     — callback to close the viewer
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import type { BoundingBox } from '../types';

// Worker is resolved by Vite at build time via the new URL() pattern
GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

interface Props {
  url: string;
  targetPage: number;
  highlights: BoundingBox[];
  isOpen: boolean;
  onClose: () => void;
}

const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 3.0;
const ZOOM_STEP = 0.25;

export default function PdfViewer({ url, targetPage, highlights, isOpen, onClose }: Props) {
  const [pdfDoc,    setPdfDoc]    = useState<PDFDocumentProxy | null>(null);
  const [numPages,  setNumPages]  = useState(0);
  const [zoom,      setZoom]      = useState(1.0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [curPage,   setCurPage]   = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Canvas logical dimensions per page — drives highlight rect computation.
  // Updated after each page render so highlights stay aligned.
  const [dims, setDims] = useState<Map<number, { w: number; h: number }>>(new Map());

  // Flash key — incremented whenever target/highlights change so the
  // CSS animation replays on remount even for the same page.
  const [flashKey, setFlashKey] = useState(0);

  // ── Refs (mutable, never trigger re-renders) ───────────────
  const bodyRef    = useRef<HTMLDivElement>(null);
  const pageRefs   = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const docRef     = useRef<PDFDocumentProxy | null>(null);
  const zoomRef    = useRef(zoom);
  const rendering  = useRef(new Set<number>());
  const renderedAt = useRef(new Map<number, number>()); // page → zoom it was rendered at

  // Keep zoomRef in sync on every render (no useEffect needed)
  zoomRef.current = zoom;

  // ── Load PDF once per url ──────────────────────────────────
  useEffect(() => {
    if (!url || !isOpen) return;
    let dead = false;
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPdfDoc(null);
    setDims(new Map());
    rendering.current.clear();
    renderedAt.current.clear();

    getDocument({ url }).promise
      .then(doc => {
        if (dead) { doc.destroy(); return; }
        docRef.current?.destroy();
        docRef.current = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurPage(1);
        setPageInput('1');
      })
      .catch(() => { if (!dead) setError('Could not load PDF.'); })
      .finally(() => { if (!dead) setLoading(false); });

    return () => { dead = true; };
  }, [url, isOpen]);

  // ── Stable render function — reads latest zoom via ref ─────
  const renderPage = useCallback(async (pageNum: number) => {
    const doc    = docRef.current;
    const canvas = canvasRefs.current.get(pageNum);
    if (!doc || !canvas || rendering.current.has(pageNum)) return;

    const z = zoomRef.current;
    if (renderedAt.current.get(pageNum) === z) return; // already up-to-date

    rendering.current.add(pageNum);
    try {
      const page     = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: z });

      canvas.width  = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;
      renderedAt.current.set(pageNum, z);
      page.cleanup();

      // Push new dimensions into state so highlight layer re-positions
      setDims(prev => {
        const m = new Map(prev);
        m.set(pageNum, { w: canvas.width, h: canvas.height });
        return m;
      });
    } catch {
      // Phase 8: silently ignore per-page render failures
    } finally {
      rendering.current.delete(pageNum);
      // If zoom changed while we were rendering, queue another render pass
      if (renderedAt.current.get(pageNum) !== zoomRef.current) {
        renderPage(pageNum);
      }
    }
  }, []); // intentionally empty — all values accessed via refs

  // ── IntersectionObserver: lazy-render pages as they appear ─
  useEffect(() => {
    const root = bodyRef.current;
    if (!pdfDoc || !root || numPages === 0) return;

    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const n = parseInt((e.target as HTMLElement).dataset.page ?? '0', 10);
          if (n > 0) renderPage(n);
        }
      },
      { root, rootMargin: '400px 0px' },
    );

    pageRefs.current.forEach(el => { if (el) io.observe(el); });
    return () => io.disconnect();
  }, [pdfDoc, numPages, renderPage]);

  // ── Re-render visible pages when zoom changes ──────────────
  useEffect(() => {
    if (!pdfDoc || !bodyRef.current) return;
    const body = bodyRef.current;
    const { top: bt, bottom: bb } = body.getBoundingClientRect();
    pageRefs.current.forEach((el, n) => {
      const { top, bottom } = el.getBoundingClientRect();
      if (bottom > bt - 400 && top < bb + 400) renderPage(n);
    });
  }, [zoom, pdfDoc, renderPage]);

  // ── Scroll to targetPage when prop changes ─────────────────
  useEffect(() => {
    if (!pdfDoc || !targetPage) return;
    setCurPage(targetPage);
    setPageInput(String(targetPage));
    setFlashKey(k => k + 1);
    pageRefs.current.get(targetPage)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [targetPage, pdfDoc]);

  // ── Track current page from scroll position ────────────────
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const onScroll = () => {
      const { top: bt, bottom: bb } = body.getBoundingClientRect();
      let best = curPage;
      let bestOverlap = -1;
      pageRefs.current.forEach((el, n) => {
        const { top, bottom } = el.getBoundingClientRect();
        const overlap = Math.min(bottom, bb) - Math.max(top, bt);
        if (overlap > bestOverlap) { bestOverlap = overlap; best = n; }
      });
      if (best !== curPage) {
        setCurPage(best);
        setPageInput(String(best));
      }
    };
    body.addEventListener('scroll', onScroll, { passive: true });
    return () => body.removeEventListener('scroll', onScroll);
  }, [pdfDoc, curPage]);

  // ── Navigation ─────────────────────────────────────────────
  const goToPage = (n: number) => {
    const p = Math.max(1, Math.min(numPages, n || 1));
    setCurPage(p);
    setPageInput(String(p));
    pageRefs.current.get(p)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ── Highlight rectangle in CSS pixels ─────────────────────
  // PDF user-space: origin bottom-left, y increases upward.
  // Canvas pixel-space: origin top-left, y increases downward.
  // Conversion: canvasTop = canvasHeight − (pdfY + pdfHeight) × zoom
  const hlStyle = (bbox: BoundingBox, pageNum: number) => {
    const d = dims.get(pageNum);
    if (!d || d.h === 0) return null;
    const left   = bbox.x                   * zoom;
    const top    = d.h - (bbox.y + bbox.height) * zoom;
    const width  = bbox.width               * zoom;
    const height = bbox.height              * zoom;
    // Guard against out-of-bounds boxes (e.g., from OCR imprecision)
    if (width <= 0 || height <= 0 || top < 0 || left < 0) return null;
    return { left, top, width, height } as const;
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className={`pdf-viewer-panel${isOpen ? ' open' : ''}`}>
      <div className="pdf-viewer-inner">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="pdf-viewer-header">

          {/* Title */}
          <div className="pdf-viewer-title">
            <FileText size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            PDF Viewer
          </div>

          {/* Zoom controls */}
          <div className="pdf-ctrl-group">
            <button
              className="icon-btn"
              onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
              disabled={zoom <= ZOOM_MIN}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="pdf-zoom-label">{Math.round(zoom * 100)}%</span>
            <button
              className="icon-btn"
              onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
              disabled={zoom >= ZOOM_MAX}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Page navigation */}
          {numPages > 0 && (
            <div className="pdf-ctrl-group">
              <button
                className="icon-btn"
                onClick={() => goToPage(curPage - 1)}
                disabled={curPage <= 1}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <input
                className="pdf-page-input"
                type="number"
                min={1}
                max={numPages}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onBlur={() => goToPage(parseInt(pageInput) || 1)}
                onKeyDown={e => { if (e.key === 'Enter') goToPage(parseInt(pageInput) || 1); }}
              />
              <span className="pdf-page-of">/ {numPages}</span>
              <button
                className="icon-btn"
                onClick={() => goToPage(curPage + 1)}
                disabled={curPage >= numPages}
                title="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <button className="icon-btn" onClick={onClose} title="Close PDF viewer">
            <X size={15} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div className="pdf-viewer-body" ref={bodyRef}>

          {loading && (
            <div className="pdf-status">Loading PDF…</div>
          )}
          {error && (
            <div className="pdf-status pdf-status-error">{error}</div>
          )}
          {!loading && !error && !pdfDoc && !url && (
            <div className="pdf-status">No PDF available for this session.</div>
          )}

          {!loading && !error && pdfDoc && (
            <div className="pdf-pages">
              {Array.from({ length: numPages }, (_, i) => i + 1).map(n => {
                const pageHl = highlights.filter(h => h.page === n);
                return (
                  <div
                    key={n}
                    className="pdf-page-wrap"
                    data-page={n}
                    ref={el => {
                      if (el) pageRefs.current.set(n, el);
                      else    pageRefs.current.delete(n);
                    }}
                  >
                    <div className="pdf-page-label">Page {n}</div>

                    <div className="pdf-canvas-wrap">
                      {/* PDF page canvas */}
                      <canvas
                        className="pdf-canvas"
                        ref={el => {
                          if (el) canvasRefs.current.set(n, el);
                          else    canvasRefs.current.delete(n);
                        }}
                      />

                      {/* Highlight overlay — only rendered when dims are known */}
                      {pageHl.length > 0 && dims.has(n) && (
                        <div className="pdf-hl-layer">
                          {pageHl.map((bbox, hi) => {
                            const s = hlStyle(bbox, n);
                            if (!s) return null;
                            const isActive = n === targetPage;
                            return (
                              <div
                                key={`${flashKey}-${hi}`}
                                className={`pdf-hl-box${isActive ? ' pdf-hl-flash' : ''}`}
                                style={s}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}