// ============================================================
//  context/ThemeContext.tsx
//  Provides theme state (light/dark mode + colour variant) to
//  the entire app via React context.
//
//  How it works:
//    • Reads saved preference from localStorage on mount.
//    • Falls back to the OS prefers-color-scheme if no saved pref.
//    • Writes [data-theme="light-sand"] (etc.) onto <html>.
//    • CSS variable blocks in index.css activate automatically.
//    • No prop-drilling — any component can call useTheme().
//
//  Usage:
//    const { isDark, colorTheme, toggleMode, setColorTheme } = useTheme();
// ============================================================

import {
  createContext, useContext, useEffect, useState,
  type ReactNode,
} from 'react';
import type { ThemeMode, ColorTheme, LightTheme, DarkTheme } from '../types';
import { buildThemeKey } from '../styles/themes';

interface ThemeContextValue {
  mode: ThemeMode;
  colorTheme: ColorTheme;
  isDark: boolean;
  toggleMode: () => void;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// localStorage keys
const LS_MODE  = 'chat-theme-mode';
const LS_COLOR = 'chat-theme-color';

const DEFAULT_LIGHT: LightTheme = 'sand';
const DEFAULT_DARK: DarkTheme   = 'midnight';

export function ThemeProvider({ children }: { children: ReactNode }) {
  // ── Read saved or system preference ─────────────────────────
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LS_MODE);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem(LS_COLOR) as ColorTheme | null;
    return saved ?? DEFAULT_LIGHT;
  });

  // ── Apply [data-theme] attribute whenever state changes ──────
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      buildThemeKey(mode, colorTheme),
    );
  }, [mode, colorTheme]);

  // ── Toggle light ↔ dark, reset colour to that mode's default ─
  const toggleMode = () => {
    setMode(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      const nextColor: ColorTheme = next === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT;
      localStorage.setItem(LS_MODE, next);
      localStorage.setItem(LS_COLOR, nextColor);
      setColorThemeState(nextColor);
      return next;
    });
  };

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(LS_COLOR, theme);
  };

  return (
    <ThemeContext.Provider value={{
      mode, colorTheme,
      isDark: mode === 'dark',
      toggleMode, setColorTheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Hook — access theme state from any child component */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}