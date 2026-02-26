
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Fuse from 'fuse.js';

interface SearchItem {
  type: 'artist' | 'venue' | 'event';
  id: string;
  slug: string;
  title: string;
  sub: string;
  keys: string[];
}

export default function SearchFloating() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [index, setIndex] = useState<SearchItem[]>([]);
  const [isFloating, setIsFloating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const t = useTranslations('common');

  // Load index and setup scroll listener
  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then(data => setIndex(data))
      .catch(() => console.error('Failed to load search index'));

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const shouldFloat = scrollY > 400 && (documentHeight - scrollY - windowHeight > 150);
      setIsFloating(shouldFloat);
    };

    const handleViewportChange = () => {
      if (!window.visualViewport) return;
      const vh = window.innerHeight;
      const vv = window.visualViewport.height;
      const offset = vh - vv;
      setKeyboardHeight(offset > 50 ? offset : 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

  const fuse = useMemo(() => new Fuse(index, {
    keys: ['keys', 'title'],
    threshold: 0.3,
  }), [index]);

  // Handle Search Input directly (avoids useEffect setState warning)
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (val.length > 1) {
      const r = fuse.search(val).map(res => res.item);
      setResults(r.slice(0, 8));
    } else {
      setResults([]);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [open]);

  return (
    <>
      {/* 1. Static Search Bar */}
      <div className="mx-auto max-w-xs mt-8 mb-12 md:hidden">
        <button 
          onClick={() => setOpen(true)}
          className="w-full h-11 px-5 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center gap-3 text-[var(--muted-foreground)] active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs uppercase tracking-widest">{t('search')}</span>
        </button>
      </div>

      {/* 2. Floating Trigger */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 md:hidden ${
        isFloating && !open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}>
        <button 
          onClick={() => setOpen(true)}
          className="h-10 px-5 rounded-full bg-[var(--card)]/60 backdrop-blur-2xl border border-[var(--border)] shadow-2xl flex items-center gap-3 text-[var(--muted-foreground)] hover:border-[var(--color-gold)] transition-all group"
        >
          <svg className="w-4 h-4 group-hover:text-[var(--color-gold)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs uppercase tracking-widest">{t('search')}</span>
        </button>
      </div>

      {/* 3. Search Overlay */}
      <div 
        className={`fixed inset-0 z-[60] flex flex-col justify-end transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ 
          bottom: `${keyboardHeight}px`,
          height: keyboardHeight > 0 ? `calc(100% - ${keyboardHeight}px)` : '100%' 
        }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/90 to-transparent transition-opacity duration-500" 
          onClick={handleClose} 
        />
        
        <div className="relative w-full max-w-2xl mx-auto flex flex-col h-full overflow-hidden">
          <div className="flex-1" onClick={handleClose} />

          <div className="w-full overflow-y-auto px-4 pb-4 custom-scrollbar max-h-[50vh]">
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={`/${locale}/${item.type}s/${item.id}`}
                    onClick={handleClose}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)]/80 backdrop-blur-md border border-[var(--border)] transition-all active:scale-[0.98]"
                  >
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-gold)] mb-1">
                        {item.type}
                      </div>
                      <div className="font-serif text-base">{item.title}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{item.sub}</div>
                    </div>
                    <svg className="w-4 h-4 text-[var(--color-gold)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            ) : query.length > 1 ? (
              <div className="text-center py-10 bg-[var(--card)]/40 backdrop-blur-md rounded-2xl border border-[var(--border)] mx-4">
                <p className="text-[var(--muted-foreground)] font-serif italic text-sm">Searching the coordinates...</p>
              </div>
            ) : null}
          </div>

          <div 
            className="p-4 bg-[var(--background)]"
            style={{ paddingBottom: keyboardHeight > 0 ? '1rem' : 'calc(env(safe-area-inset-bottom, 1rem) + 1rem)' }}
          >
            <div className="relative group">
              <div 
                className="absolute -inset-[1.5px] rounded-full opacity-60 group-focus-within:opacity-100 transition-opacity blur-[0.5px]" 
                style={{ background: `linear-gradient(to right, var(--color-gold), var(--color-gold-bright), var(--border))` }} 
              />
              <div className="relative flex items-center bg-[var(--card)] rounded-full border border-white/5 shadow-2xl">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={t('search')}
                  className="w-full h-12 bg-transparent text-lg px-6 outline-none font-serif text-[var(--foreground)]"
                  enterKeyHint="search"
                />
                <button 
                  onClick={handleClose}
                  className="pr-6 text-[var(--muted-foreground)] uppercase text-[10px] tracking-widest"
                >
                  {t('viewAll') === 'View All' ? 'Close' : '關閉'}
                </button>
              </div>
            </div>
            <div className="h-2 md:hidden" />
          </div>
        </div>
      </div>
    </>
  );
}
