// ============================================================
//  styles/themes.ts
//  Metadata for each theme variant — used to render the colour
//  picker grid inside SettingsModal.
//
//  Actual token values live in index.css as CSS custom props.
//  Switching themes = setting data-theme on <html>; no JS
//  colour math required at runtime.
// ============================================================

import type { LightTheme, DarkTheme } from '../types';

export interface ThemeOption<T extends string> {
  id: T;
  label: string;
  /** Background swatch shown in the picker grid */
  swatchBg: string;
  /** Accent swatch shown in the picker grid */
  swatchAccent: string;
}

/** Available light-mode colour themes */
export const LIGHT_THEMES: ThemeOption<LightTheme>[] = [
  { id: 'sand',  label: 'Sand',  swatchBg: '#F7F6F2', swatchAccent: '#C07040' },
  { id: 'sky',   label: 'Sky',   swatchBg: '#EEF4FB', swatchAccent: '#2563EB' },
  { id: 'mint',  label: 'Mint',  swatchBg: '#EDF5EE', swatchAccent: '#16A34A' },
  { id: 'rose',  label: 'Rose',  swatchBg: '#F5EDEF', swatchAccent: '#E11D48' },
];

/** Available dark-mode colour themes */
export const DARK_THEMES: ThemeOption<DarkTheme>[] = [
  { id: 'midnight', label: 'Midnight', swatchBg: '#0F1117', swatchAccent: '#6366F1' },
  { id: 'ocean',    label: 'Ocean',    swatchBg: '#091828', swatchAccent: '#0EA5E9' },
  { id: 'forest',   label: 'Forest',   swatchBg: '#0A1410', swatchAccent: '#22C55E' },
  { id: 'volcanic', label: 'Volcanic', swatchBg: '#180D08', swatchAccent: '#F97316' },
];

/**
 * Build the CSS data-theme key from mode + colour name.
 * e.g. buildThemeKey('light', 'sand') → 'light-sand'
 */
export const buildThemeKey = (mode: string, color: string): string =>
  `${mode}-${color}`;