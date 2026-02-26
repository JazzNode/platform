'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { SearchableEvent, SearchableArtist, SearchableVenue, SearchableCity } from '@/lib/search';

interface SearchData {
  events: SearchableEvent[];
  artists: SearchableArtist[];
  venues: SearchableVenue[];
  cities: SearchableCity[];
}

interface SearchContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  data: SearchData;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}

interface Props {
  children: ReactNode;
  data: SearchData;
}

export default function SearchProvider({ children, data }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <SearchContext.Provider value={{ isOpen, open, close, toggle, data }}>
      {children}
    </SearchContext.Provider>
  );
}
