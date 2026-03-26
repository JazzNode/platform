'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { themes, getThemeById, type Theme } from '@/lib/themes';

interface VenueThemeScopeProps {
  themeId?: string | null;
  accentColor?: string | null;
  tier?: number;
  children: React.ReactNode;
}

/**
 * Scoped theme wrapper for Elite venue pages.
 * On mount: saves the user's current theme → applies the venue's brand theme.
 * On unmount: restores the user's original theme.
 *
 * Only activates for tier 3 (Elite) venues with a brand_theme_id set.
 */
export default function VenueThemeScope({ themeId, accentColor, tier, children }: VenueThemeScopeProps) {
  const { themeId: userThemeId, setTheme } = useTheme();
  const savedThemeRef = useRef<string | null>(null);
  const appliedRef = useRef(false);

  const shouldApply = (tier ?? 0) >= 3 && !!themeId && themeId !== userThemeId;

  useEffect(() => {
    if (!shouldApply || appliedRef.current) return;

    // Save user's current theme
    savedThemeRef.current = userThemeId;
    appliedRef.current = true;

    // Apply venue brand theme
    setTheme(themeId!);

    // If custom accent color, override the accent-related CSS variables
    if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
      requestAnimationFrame(() => {
        applyAccentOverride(accentColor);
      });
    }

    return () => {
      // Restore user's theme when leaving the venue page
      if (savedThemeRef.current) {
        setTheme(savedThemeRef.current);
      }
      appliedRef.current = false;
    };
  }, [shouldApply, themeId, accentColor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle accent override when theme changes
  useEffect(() => {
    if (!appliedRef.current || !accentColor || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) return;
    applyAccentOverride(accentColor);
  }, [accentColor]);

  return <>{children}</>;
}

/** Convert hex to RGB string */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

/** Lighten a hex color */
function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Dim a hex color */
function dimHex(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Override accent CSS variables with custom brand color */
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
