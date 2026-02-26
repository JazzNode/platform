'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSearch } from './SearchProvider';
import { search, type SearchResult, type SearchResultType, type SearchableEvent, type SearchableArtist, type SearchableVenue, type SearchableCity } from '@/lib/search';

const CATEGORY_FILTERS: { key: SearchResultType | 'all'; icon: string }[] = [
  { key: 'all', icon: '✦' },
  { key: 'event', icon: '♫' },
  { key: 'artist', icon: '🎤' },
  { key: 'venue', icon: '📍' },
  { key: 'city', icon: '🏙' },
];

const TYPE_LABELS: Record<string, Record<string, string>> = {
  all:    { en: 'All', zh: '全部', ja: 'すべて' },
  event:  { en: 'Events', zh: '活動', ja: 'イベント' },
  artist: { en: 'Artists', zh: '藝人', ja: 'アーティスト' },
  venue:  { en: 'Venues', zh: '場地', ja: '会場' },
  city:   { en: 'Cities', zh: '城市', ja: '都市' },
};

const SECTION_LABELS: Record<string, Record<string, string>> = {
  event:  { en: 'EVENTS', zh: '活動', ja: 'イベント' },
  artist: { en: 'ARTISTS', zh: '藝人', ja: 'アーティスト' },
  venue:  { en: 'VENUES', zh: '場地', ja: '会場' },
  city:   { en: 'CITIES', zh: '城市', ja: '都市' },
};

export default function SearchOverlay() {
  const { isOpen, close, data } = useSearch();
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchResultType | 'all'>('all');
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFilter('all');
      setActiveIndex(-1);
      // Delay focus to allow animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ⌘K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) close();
        else {
          // Need to use the toggle from context — but we only have close here
          // We'll handle open from Header
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  const results = useMemo(() => {
    return search(query, data, filter);
  }, [query, data, filter]);

  // Group results by type for "all" filter
  const grouped = useMemo(() => {
    if (filter !== 'all') return null;
    const map = new Map<SearchResultType, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    // Limit each group
    for (const [k, v] of map) {
      map.set(k, v.slice(0, 4));
    }
    return map;
  }, [results, filter]);

  // Flat list for keyboard nav
  const flatResults = useMemo(() => {
    if (grouped) {
      const flat: SearchResult[] = [];
      for (const type of ['event', 'artist', 'venue', 'city'] as SearchResultType[]) {
        const items = grouped.get(type);
        if (items) flat.push(...items);
      }
      return flat;
    }
    return results.slice(0, 20);
  }, [grouped, results]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && flatResults[activeIndex]) {
      e.preventDefault();
      navigateTo(flatResults[activeIndex]);
    }
  }, [flatResults, activeIndex]);

  function navigateTo(result: SearchResult) {
    const base = `/${locale}`;
    switch (result.type) {
      case 'event':
        router.push(`${base}/events/${result.id}`);
        break;
      case 'artist':
        router.push(`${base}/artists/${result.id}`);
        break;
      case 'venue':
        router.push(`${base}/venues/${result.id}`);
        break;
      case 'city':
        router.push(`${base}/cities`);
        break;
    }
    close();
  }

  function renderResult(result: SearchResult, index: number) {
    const isActive = index === activeIndex;

    switch (result.type) {
      case 'event': {
        const e = result.data as SearchableEvent;
        return (
          <button
            key={`e-${result.id}`}
            onClick={() => navigateTo(result)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors duration-150 rounded-xl ${
              isActive ? 'bg-[var(--color-gold)]/10' : 'hover:bg-[var(--color-gold)]/5'
            }`}
          >
            <div className="shrink-0 w-10 text-center">
              <div className="text-[10px] uppercase tracking-widest text-gold font-bold leading-tight">
                {e.date_display.split(',')[0] || e.date_display.slice(0, 6)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-bold truncate text-[var(--foreground)]">{e.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">
                {e.venue_name}{e.primary_artist_name ? ` · ${e.primary_artist_name}` : ''}
              </p>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] shrink-0">{e.time_display}</div>
          </button>
        );
      }
      case 'artist': {
        const a = result.data as SearchableArtist;
        return (
          <button
            key={`a-${result.id}`}
            onClick={() => navigateTo(result)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors duration-150 rounded-xl ${
              isActive ? 'bg-[var(--color-gold)]/10' : 'hover:bg-[var(--color-gold)]/5'
            }`}
          >
            {a.photoUrl ? (
              <img src={a.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--border)]" loading="lazy" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">♪</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-bold truncate text-[var(--foreground)]">{a.displayName}</p>
              <p className="text-xs text-[var(--muted-foreground)] truncate capitalize">
                {a.type && a.type !== 'person' ? a.type : a.primaryInstrument || ''}
                {a.countryCode ? ` · ${a.countryCode}` : ''}
              </p>
            </div>
          </button>
        );
      }
      case 'venue': {
        const v = result.data as SearchableVenue;
        return (
          <button
            key={`v-${result.id}`}
            onClick={() => navigateTo(result)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors duration-150 rounded-xl ${
              isActive ? 'bg-[var(--color-gold)]/10' : 'hover:bg-[var(--color-gold)]/5'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-bold truncate text-[var(--foreground)]">{v.displayName}</p>
              <p className="text-xs text-[var(--muted-foreground)] truncate">{v.cityName}</p>
            </div>
          </button>
        );
      }
      case 'city': {
        const c = result.data as SearchableCity;
        return (
          <button
            key={`c-${result.id}`}
            onClick={() => navigateTo(result)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`w-full text-left px-4 py-3 flex items-center gap-4 transition-colors duration-150 rounded-xl ${
              isActive ? 'bg-[var(--color-gold)]/10' : 'hover:bg-[var(--color-gold)]/5'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm shrink-0 border border-[var(--border)]">🏙</div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-bold truncate text-[var(--foreground)]">{c.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{c.venueCount} venues</p>
            </div>
          </button>
        );
      }
    }
  }

  // Count flat index across grouped sections
  let flatIndex = 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={close}
      />

      {/* Panel */}
      <div
        className={`fixed inset-0 z-[61] flex items-start justify-center transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <div
          className={`w-full max-w-2xl mx-3 sm:mx-auto mt-4 sm:mt-[8vh] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden transition-transform duration-300 ${
            isOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-[0.98]'
          }`}
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
            maxHeight: 'min(80vh, 600px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
              onKeyDown={handleKeyDown}
              placeholder={locale === 'zh' ? '搜尋活動、藝人、場地...' : locale === 'ja' ? 'イベント、アーティスト、会場を検索...' : 'Search events, artists, venues...'}
              className="flex-1 bg-transparent text-[var(--foreground)] text-base placeholder:text-[var(--muted-foreground)] focus:outline-none font-serif"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            {/* Mobile cancel / Desktop shortcut hint */}
            <button onClick={close} className="sm:hidden text-sm text-[var(--muted-foreground)] shrink-0">
              {locale === 'zh' ? '取消' : locale === 'ja' ? 'キャンセル' : 'Cancel'}
            </button>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] shrink-0">
              ESC
            </kbd>
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[var(--border)] overflow-x-auto scrollbar-none">
            {CATEGORY_FILTERS.map(({ key, icon }) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setActiveIndex(-1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs tracking-wider transition-all duration-200 shrink-0 ${
                  filter === key
                    ? 'bg-[var(--color-gold)]/15 text-gold border border-[var(--color-gold)]/40'
                    : 'text-[var(--muted-foreground)] border border-transparent hover:text-[var(--foreground)] hover:border-[var(--border)]'
                }`}
              >
                <span className="text-[11px]">{icon}</span>
                <span className="uppercase">{TYPE_LABELS[key]?.[locale] || TYPE_LABELS[key]?.en}</span>
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="overflow-y-auto" style={{ maxHeight: 'min(60vh, 440px)' }}>
            {query.length === 0 ? (
              /* Empty state — keyboard hint */
              <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
                <p className="text-sm">
                  {locale === 'zh' ? '輸入關鍵字開始搜尋' : locale === 'ja' ? 'キーワードを入力して検索' : 'Start typing to search'}
                </p>
                <div className="hidden sm:flex items-center gap-2 mt-3 text-xs">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">↑↓</kbd>
                  <span>{locale === 'zh' ? '瀏覽' : locale === 'ja' ? 'ナビゲート' : 'Navigate'}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">↵</kbd>
                  <span>{locale === 'zh' ? '前往' : locale === 'ja' ? '開く' : 'Open'}</span>
                </div>
              </div>
            ) : flatResults.length === 0 ? (
              /* No results */
              <div className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
                <p className="text-sm">
                  {locale === 'zh' ? '找不到相關結果' : locale === 'ja' ? '結果が見つかりません' : 'No results found'}
                </p>
              </div>
            ) : grouped ? (
              /* Grouped results */
              <div className="py-2">
                {(['event', 'artist', 'venue', 'city'] as SearchResultType[]).map((type) => {
                  const items = grouped.get(type);
                  if (!items || items.length === 0) return null;
                  const sectionStart = flatIndex;
                  const rendered = items.map((r, i) => {
                    const idx = sectionStart + i;
                    return renderResult(r, idx);
                  });
                  flatIndex += items.length;
                  return (
                    <div key={type} className="mb-1">
                      <div className="px-5 pt-3 pb-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] font-bold">
                          {SECTION_LABELS[type]?.[locale] || SECTION_LABELS[type]?.en}
                        </p>
                      </div>
                      {rendered}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Flat filtered results */
              <div className="py-2">
                {flatResults.map((r, i) => renderResult(r, i))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
