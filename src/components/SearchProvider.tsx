'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { SearchableEvent, SearchableArtist, SearchableVenue, SearchableCity, SearchableMember } from '@/lib/search';

interface SearchData {
  events: SearchableEvent[];
  artists: SearchableArtist[];
  venues: SearchableVenue[];
  cities: SearchableCity[];
  members: SearchableMember[];
}

const EMPTY_DATA: SearchData = { events: [], artists: [], venues: [], cities: [], members: [] };

interface SearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  data: SearchData;
  loading: boolean;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}

interface Props {
  children: ReactNode;
  locale: string;
}

export default function SearchProvider({ children, locale }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<SearchData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const fetched = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetched.current) return;
    fetched.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/search-data?locale=${locale}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // allow retry on next open
      fetched.current = false;
    } finally {
      setLoading(false);
    }
  }, [locale]);

  const open = useCallback(() => {
    setIsOpen(true);
    fetchData();
  }, [fetchData]);

  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => {
    setIsOpen((v) => {
      if (!v) fetchData();
      return !v;
    });
  }, [fetchData]);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => {
          if (!v) fetchData();
          return !v;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fetchData]);

  return (
    <SearchContext.Provider value={{ isOpen, open, close, toggle, data, loading }}>
      {children}
    </SearchContext.Provider>
  );
}
