
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
  const [viewportStyle, setViewportStyle] = useState<React.CSSProperties>({ display: 'none' });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const locale = useLocale();
  const t = useTranslations('common');

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

    const updateViewport = () => {
      if (!window.visualViewport) return;
      const { height, offsetTop, width, scale } = window.visualViewport;
      
      // We use absolute positioning within a fixed container that follows the visual viewport
      setViewportStyle({
        position: 'fixed',
        left: 0,
        top: offsetTop,
        width: width,
        height: height,
        display: open ? 'flex' : 'none',
        flexDirection: 'column',
        justifyContent: 'end',
        zIndex: 60,
        overflow: 'hidden',
        transition: 'opacity 0.3s ease-out',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);

    if (open) updateViewport();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.visualViewport?.removeEventListener('resize', updateViewport);
      window.visualViewport?.removeEventListener('scroll', updateViewport);
    };
  }, [open]);

  const fuse = useMemo(() => new Fuse(index, {
    keys: ['keys', 'title'],
    threshold: 0.3,
  }), [index]);

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
    setTimeout(() => {
      setQuery('');
      setResults([]);
    }, 300);
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

      {/* 3. Search Overlay - Anchored to Visual Viewport */}
      <div style={viewportStyle}>
        {/* Full screen blur backdrop */}
        <div 
          className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-2xl" 
          onClick={handleClose} 
        />
        
        <div className="relative w-full max-w-2xl mx-auto flex flex-col h-full overflow-hidden">
          <div className="flex-1" onClick={handleClose} />

          {/* Results List */}
          <div className={`w-full overflow-y-auto px-4 pb-2 custom-scrollbar transition-all duration-300 ${
            open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ maxHeight: '60%' }}>
            {results.length > 0 && (
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
            )}
          </div>

          {/* Bottom Search Input Bar - Truly pinned to bottom */}
          <div 
            className="p-4 relative"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 1rem) + 0.5rem)' }}
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
                  className="pr-6 text-[var(--muted-foreground)] uppercase text-[10px] tracking-widest active:text-gold"
                >
                  {t('viewAll') === 'View All' ? 'Close' : '關閉'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
