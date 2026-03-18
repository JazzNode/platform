'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthProvider';
import {
  REGION_TO_COUNTRY,
  ACTIVE_COUNTRY_CODES,
  GEO_COOKIE,
  REGION_STORAGE_KEY,
} from '@/lib/regions';

interface RegionContextType {
  /** Current country code (e.g. 'TW') or null for world map (no filter) */
  region: string | null;
  /** Update region — persists to localStorage for guests */
  setRegion: (code: string | null) => void;
  /** Whether the region has been resolved from any source yet */
  ready: boolean;
}

const RegionContext = createContext<RegionContextType | null>(null);

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

interface RegionProviderProps {
  children: React.ReactNode;
  /** Country codes that actually have content in the database */
  availableRegions?: string[];
}

export default function RegionProvider({ children, availableRegions }: RegionProviderProps) {
  const { profile } = useAuth();
  const [region, setRegionState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const available = useMemo(
    () => new Set(availableRegions ?? ACTIVE_COUNTRY_CODES),
    [availableRegions],
  );

  // Resolve region on mount + when profile changes
  useEffect(() => {
    let resolved: string | null = null;

    // Priority 1: logged-in user profile
    if (profile?.region) {
      resolved = REGION_TO_COUNTRY[profile.region] ?? null;
    }

    // Priority 2: localStorage (guest manual selection)
    if (!resolved) {
      const stored = localStorage.getItem(REGION_STORAGE_KEY);
      if (stored && ACTIVE_COUNTRY_CODES.includes(stored as typeof ACTIVE_COUNTRY_CODES[number])) {
        resolved = stored;
      }
    }

    // Priority 3: IP detection cookie
    if (!resolved) {
      const geo = getCookie(GEO_COOKIE);
      if (geo && ACTIVE_COUNTRY_CODES.includes(geo as typeof ACTIVE_COUNTRY_CODES[number])) {
        resolved = geo;
      }
    }

    // Fallback: if resolved region has no content, reset to null (world map)
    if (resolved && !available.has(resolved)) {
      resolved = null;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe init from browser APIs (localStorage/cookies)
    setRegionState(resolved);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [profile, available]);

  const setRegion = useCallback((code: string | null) => {
    setRegionState(code);
    if (code) {
      localStorage.setItem(REGION_STORAGE_KEY, code);
    } else {
      localStorage.removeItem(REGION_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => ({ region, setRegion, ready }), [region, setRegion, ready]);

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error('useRegion must be used within RegionProvider');
  return ctx;
}
