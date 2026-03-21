
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, DEFAULT_THEME, type Theme } from '@/lib/themes';

const STORAGE_KEY = 'jazznode-theme';

interface ThemeContextType {
  theme: Theme;
  themeId: string;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[DEFAULT_THEME],
  themeId: DEFAULT_THEME,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/** Lighten a hex color by a fixed amount per channel */
function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Derived surface color (slightly lighter than card)
  const secondary = lightenHex(theme.card, 10);

  // Backgrounds
  root.style.setProperty('--background', theme.bg);
  root.style.setProperty('--card', theme.card);
  root.style.setProperty('--popover', theme.card);

  // Accents
  root.style.setProperty('--color-gold', theme.accent);
  root.style.setProperty('--color-gold-dim', theme.accentDim);
  root.style.setProperty('--color-gold-bright', theme.accentBright);
  root.style.setProperty('--primary', theme.accent);
  root.style.setProperty('--primary-foreground', theme.bg);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-foreground', theme.bg);
  root.style.setProperty('--ring', theme.accent);

  // Secondary accent
  root.style.setProperty('--color-accent2', theme.accent2);

  // Text
  root.style.setProperty('--foreground', theme.text);
  root.style.setProperty('--card-foreground', theme.text);
  root.style.setProperty('--popover-foreground', theme.text);
  root.style.setProperty('--muted-foreground', theme.muted);

  // Derived surfaces
  root.style.setProperty('--secondary', secondary);
  root.style.setProperty('--secondary-foreground', theme.text);
  root.style.setProperty('--muted', secondary);

  // Borders & inputs
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--input', `rgba(${theme.glowRgb}, 0.14)`);

  // Glow
  root.style.setProperty('--theme-glow-rgb', theme.glowRgb);
  root.style.setProperty('--theme-glow2-rgb', theme.glow2Rgb);

  // Sidebar
  root.style.setProperty('--sidebar', theme.bg);
  root.style.setProperty('--sidebar-foreground', theme.text);
  root.style.setProperty('--sidebar-primary', theme.accent);
  root.style.setProperty('--sidebar-primary-foreground', theme.bg);
  root.style.setProperty('--sidebar-accent', secondary);
  root.style.setProperty('--sidebar-accent-foreground', theme.text);
  root.style.setProperty('--sidebar-border', theme.border);
  root.style.setProperty('--sidebar-ring', theme.accent);

  // Charts
  root.style.setProperty('--chart-1', theme.accent);
  root.style.setProperty('--chart-2', theme.accent2);
  root.style.setProperty('--chart-3', theme.accentBright);
  root.style.setProperty('--chart-4', theme.muted);
  root.style.setProperty('--chart-5', theme.text);

  // Data attribute
  root.dataset.theme = theme.id;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME);
  const theme = themes[themeId] || themes[DEFAULT_THEME];

  const setTheme = useCallback((id: string) => {
    const resolved = themes[id] ? id : DEFAULT_THEME;
    setThemeId(resolved);
    applyTheme(themes[resolved]);
    try { localStorage.setItem(STORAGE_KEY, resolved); } catch {}
  }, []);

  // Load saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && themes[saved]) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setThemeId(saved);
        applyTheme(themes[saved]);
      } else {
        applyTheme(theme);
      }
    } catch {
      applyTheme(theme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
