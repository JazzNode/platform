'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { themes } from '@/lib/themes';
import { getFontPair, googleFontsUrl } from '@/lib/brand-fonts';

interface VenueThemeScopeProps {
  themeId?: string | null;
  accentColor?: string | null;
  fontPairId?: string | null;
  faviconUrl?: string | null;
  tier?: number;
  children: React.ReactNode;
}

/**
 * Scoped brand wrapper for Elite venue pages.
 * On mount: saves user's theme → applies venue brand (theme + accent + fonts + favicon).
 * On unmount: restores everything.
 */
export default function VenueThemeScope({
  themeId, accentColor, fontPairId, faviconUrl, tier, children,
}: VenueThemeScopeProps) {
  const { themeId: userThemeId, setTheme } = useTheme();
  const savedThemeRef = useRef<string | null>(null);
  const savedFontsRef = useRef<{ heading: string; body: string } | null>(null);
  const savedFaviconRef = useRef<string | null>(null);
  const appliedRef = useRef(false);
  const fontLinkRef = useRef<HTMLLinkElement | null>(null);

  const isElite = (tier ?? 0) >= 3;
  const hasCustomization = !!(themeId || accentColor || fontPairId || faviconUrl);
  const shouldApply = isElite && hasCustomization;

  useEffect(() => {
    if (!shouldApply || appliedRef.current) return;
    appliedRef.current = true;

    const root = document.documentElement;

    // ── Save current state ──
    savedThemeRef.current = userThemeId;
    savedFontsRef.current = {
      heading: root.style.getPropertyValue('--font-heading') || '',
      body: root.style.getPropertyValue('--font-body') || '',
    };
    const currentFavicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    savedFaviconRef.current = currentFavicon?.href || null;

    // ── Apply theme ──
    if (themeId && themes[themeId]) {
      setTheme(themeId);
    }

    // ── Apply accent override ──
    if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      requestAnimationFrame(() => applyAccentOverride(accentColor));
    }

    // ── Apply fonts ──
    if (fontPairId && fontPairId !== 'default') {
      const pair = getFontPair(fontPairId);
      const url = googleFontsUrl(pair);
      if (url) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
        fontLinkRef.current = link;
      }
      root.style.setProperty('--font-heading', pair.heading);
      root.style.setProperty('--font-body', pair.body);
    }

    // ── Apply favicon ──
    if (faviconUrl) {
      let faviconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!faviconEl) {
        faviconEl = document.createElement('link');
        faviconEl.rel = 'icon';
        document.head.appendChild(faviconEl);
      }
      faviconEl.href = faviconUrl;
    }

    return () => {
      // ── Restore everything ──
      if (savedThemeRef.current) setTheme(savedThemeRef.current);

      if (savedFontsRef.current) {
        if (savedFontsRef.current.heading) {
          root.style.setProperty('--font-heading', savedFontsRef.current.heading);
        } else {
          root.style.removeProperty('--font-heading');
        }
        if (savedFontsRef.current.body) {
          root.style.setProperty('--font-body', savedFontsRef.current.body);
        } else {
          root.style.removeProperty('--font-body');
        }
      }

      if (fontLinkRef.current) {
        fontLinkRef.current.remove();
        fontLinkRef.current = null;
      }

      if (savedFaviconRef.current) {
        const faviconEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (faviconEl) faviconEl.href = savedFaviconRef.current;
      }

      appliedRef.current = false;
    };
  }, [shouldApply, themeId, accentColor, fontPairId, faviconUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

/** Convert hex to RGB string */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function dimHex(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function applyAccentOverride(hex: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dim = dimHex(hex, 30);
  const bright = lightenHex(hex, 40);
  const rgb = hexToRgb(hex);

  root.style.setProperty('--color-gold', hex);
  root.style.setProperty('--color-gold-dim', dim);
  root.style.setProperty('--color-gold-bright', bright);
  root.style.setProperty('--primary', hex);
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--ring', hex);
  root.style.setProperty('--theme-glow-rgb', rgb);
  root.style.setProperty('--input', `rgba(${rgb}, 0.14)`);
  root.style.setProperty('--border', `rgba(${rgb}, 0.10)`);
  root.style.setProperty('--chart-1', hex);
}
