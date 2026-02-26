
'use client';

import { useState, useEffect, useRef } from 'react';
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  const locale = useLocale();
  const t = useTranslations('common');

  // Load index and setup scroll listener
  useEffect(() => {
    fetch('/search-index.json')
      .then(res => res.json())
      .then(data => setIndex(data));

    const handleScroll = () => {
      // Logic: If we've scrolled past 400px (roughly stats section), enable floating
      // But if we're near the bottom (footer), hide it.
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      const shouldFloat = scrollY > 400 && (documentHeight - scrollY - windowHeight > 150);
      setIsFloating(shouldFloat);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fuse = new Fuse(index, {
    keys: ['keys', 'title'],
    threshold: 0.3,
  });

  useEffect(() => {
    if (query.length > 1) {
      const r = fuse.search(query).map(res => res.item);
      setResults(r.slice(0, 8));
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
  }, [open]);

  return (
    <>
      {/* 1. Static Search Bar (Only shown on top of pages, before scroll) */}
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

      {/* 2. Floating Trigger - Shown when scrolled past threshold, hidden at footer */}
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

      {/* Fullscreen Overlay - Safari Style (Bottom Focused) */}
      <div className={`fixed inset-0 z-[60] flex flex-col justify-end transition-all duration-500 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-3xl" onClick={() => setOpen(false)} />
        
        <div className="relative w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]">
          {/* Results List - Floats above the input */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={`/${locale}/${item.type}s/${item.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--card)]/60 border border-[var(--border)] transition-all active:scale-[0.98]"
                  >
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--color-gold)] mb-1 opacity-60">
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
              <div className="text-center py-10 text-[var(--muted-foreground)] font-serif italic text-sm opacity-40">
                Searching the coordinates...
              </div>
            ) : null}
          </div>

          {/* Bottom Search Input Bar (Safari Position) */}
          <div className="p-4 pb-8 sm:pb-10 bg-gradient-to-t from-[var(--background)] to-transparent">
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search')}
                  className="w-full h-12 bg-transparent text-lg px-6 outline-none font-serif text-[var(--foreground)]"
                />
                <button 
                  onClick={() => setOpen(false)}
                  className="pr-6 text-[var(--muted-foreground)] uppercase text-[10px] tracking-widest"
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
