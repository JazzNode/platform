
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

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Backgrounds
  root.style.setProperty('--background', theme.bg);
  root.style.setProperty('--card', theme.card);

  // Accents
  root.style.setProperty('--color-gold', theme.accent);
  root.style.setProperty('--color-gold-dim', theme.accentDim);
  root.style.setProperty('--color-gold-bright', theme.accentBright);
  root.style.setProperty('--primary', theme.accent);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--ring', theme.accent);

  // Secondary accent
  root.style.setProperty('--color-accent2', theme.accent2);

  // Text
  root.style.setProperty('--foreground', theme.text);
  root.style.setProperty('--muted-foreground', theme.muted);

  // Borders
  root.style.setProperty('--border', theme.border);

  // Glow
  root.style.setProperty('--theme-glow-rgb', theme.glowRgb);
  root.style.setProperty('--theme-glow2-rgb', theme.glow2Rgb);

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
