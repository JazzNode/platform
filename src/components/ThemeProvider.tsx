'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, type CityTheme } from '@/lib/themes';

interface ThemeContextType {
  theme: CityTheme;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.default,
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(theme: CityTheme) {
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

  // Data attribute for potential CSS selectors
  root.dataset.theme = theme.id;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<CityTheme>(themes.default);

  const setTheme = useCallback((id: string) => {
    const t = themes[id] || themes.default;
    setThemeState(t);
    applyTheme(t);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
