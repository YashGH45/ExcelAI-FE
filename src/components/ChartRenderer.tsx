// ============================================================
//  ChartRenderer.tsx
//  Renders a Vega-Lite spec returned by the backend using
//  vega-embed.  Automatically re-renders when the spec or
//  the app colour-mode changes.
//
//  Props:
//    spec  — a valid Vega-Lite top-level specification object
// ============================================================

import { useEffect, useRef } from 'react';
import embed from 'vega-embed';
import { useTheme } from '../context/ThemeContext';

interface Props {
  spec: Record<string, unknown>;
}

export default function ChartRenderer({ spec }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark }   = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Read live CSS-variable values so the chart blends with the active theme
    const style      = getComputedStyle(document.documentElement);
    const bg         = style.getPropertyValue('--bg-card').trim();
    const textColor  = style.getPropertyValue('--text-primary').trim();
    const mutedColor = style.getPropertyValue('--text-muted').trim();
    const gridColor  = style.getPropertyValue('--border-light').trim();

    let active = true;
    let vegaResult: { finalize: () => void } | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    embed(el, spec as any, {
      // Show only the PNG-export action; hide source / editor links
      actions: { export: true, source: false, compiled: false, editor: false },
      renderer: 'svg',
      config: {
        background: bg,
        font: "'DM Sans', sans-serif",
        title: {
          color:    textColor,
          font:     "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
        },
        axis: {
          labelColor:  mutedColor,
          titleColor:  textColor,
          gridColor,
          tickColor:   gridColor,
          domainColor: gridColor,
          labelFont:   "'DM Sans', sans-serif",
          titleFont:   "'DM Sans', sans-serif",
          labelFontSize: 11,
          titleFontSize: 12,
        },
        legend: {
          labelColor:    textColor,
          titleColor:    textColor,
          labelFont:     "'DM Sans', sans-serif",
          titleFont:     "'DM Sans', sans-serif",
          labelFontSize: 11,
          titleFontSize: 12,
        },
        header: {
          labelColor: textColor,
          titleColor: textColor,
        },
        view: { stroke: 'transparent' },
      },
    }).then(result => {
      if (active) vegaResult = result;
    }).catch(console.error);

    return () => {
      active = false;
      vegaResult?.finalize();
      // Clear the container so the next render starts fresh
      if (el) el.innerHTML = '';
    };
  }, [spec, isDark]);

  return <div ref={containerRef} className="chart-container" />;
}