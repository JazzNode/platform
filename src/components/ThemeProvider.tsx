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
  root.style.setProperty('--color-gold', theme.accent);
  root.style.setProperty('--color-gold-dim', theme.accentDim);
  root.style.setProperty('--color-gold-bright', theme.accentBright);
  root.style.setProperty('--theme-glow-rgb', theme.glowRgb);
  // Also update shadcn accent vars
  root.style.setProperty('--primary', theme.accent);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--ring', theme.accent);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<CityTheme>(themes.default);

  const setTheme = useCallback((id: string) => {
    const t = themes[id] || themes.default;
    setThemeState(t);
    applyTheme(t);
  }, []);

  // Apply default on mount
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
