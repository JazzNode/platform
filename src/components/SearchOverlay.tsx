'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useSearch } from './SearchProvider';
import { search, type SearchResult, type SearchResultType, type SearchableEvent, type SearchableArtist, type SearchableVenue, type SearchableCity } from '@/lib/search';

const FILTER_KEYS: { key: SearchResultType | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'searchAll' },
  { key: 'event', labelKey: 'events' },
  { key: 'artist', labelKey: 'artists' },
  { key: 'venue', labelKey: 'venues' },
  { key: 'city', labelKey: 'cities' },
];

const MAX_RESULTS_PER_TYPE = 5;
const MAX_TOTAL = 15;

export default function SearchOverlay() {
  const { isOpen, close, data } = useSearch();
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchResultType | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Small delay to ensure overlay is rendered before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    }
    document.body.style.overflow = '';
  }, [isOpen]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFilter('all');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const all = search(query, data, filter);
    if (filter !== 'all') return all.slice(0, MAX_TOTAL);
    return all.slice(0, MAX_TOTAL);
  }, [query, data, filter]);

  // Group results by type for "all" view
  const groupedResults = useMemo(() => {
    if (filter !== 'all') return null;
    const groups: Partial<Record<SearchResultType, SearchResult[]>> = {};
    for (const r of results) {
      if (!groups[r.type]) groups[r.type] = [];
      if (groups[r.type]!.length < MAX_RESULTS_PER_TYPE) {
        groups[r.type]!.push(r);
      }
    }
    return groups;
  }, [results, filter]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    if (filter !== 'all') return results;
    if (!groupedResults) return [];
    const flat: SearchResult[] = [];
    const order: SearchResultType[] = ['event', 'artist', 'venue', 'city'];
    for (const type of order) {
      if (groupedResults[type]) flat.push(...groupedResults[type]!);
    }
    return flat;
  }, [results, filter, groupedResults]);

  // Reset selection on query/filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filter]);

  const navigate = useCallback((result: SearchResult) => {
    close();
    const prefix = `/${locale}`;
    switch (result.type) {
      case 'event':
        router.push(`${prefix}/events/${result.id}`);
        break;
      case 'artist':
        router.push(`${prefix}/artists/${result.id}`);
        break;
      case 'venue':
        router.push(`${prefix}/venues/${result.id}`);
        break;
      case 'city':
        router.push(`${prefix}/cities`);
        break;
    }
  }, [close, locale, router]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) navigate(flatResults[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  }, [flatResults, selectedIndex, navigate, close]);

  if (!isOpen) return null;

  const typeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'event': return '🎵';
      case 'artist': return '🎤';
      case 'venue': return '📍';
      case 'city': return '🏙';
    }
  };

  const typeLabel = (type: SearchResultType) => {
    switch (type) {
      case 'event': return t('events');
      case 'artist': return t('artists');
      case 'venue': return t('venues');
      case 'city': return t('cities');
    }
  };

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          background: 'color-mix(in srgb, var(--background) 94%, transparent)',
          backdropFilter: 'blur(32px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.2)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full max-w-2xl mx-auto w-full px-4 sm:px-6 pt-[env(safe-area-inset-top)]">

        {/* Search input area */}
        <div className="pt-6 sm:pt-20 pb-4">
          <div className="relative group">
            {/* Magnifying glass icon */}
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)] transition-colors duration-300 group-focus-within:text-[var(--color-gold)]"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full h-14 sm:h-16 pl-12 pr-20 rounded-2xl text-lg sm:text-xl font-serif bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] border border-[var(--border)] focus:border-[var(--color-gold)]/40 focus:outline-none transition-all duration-300 focus:shadow-[0_0_30px_rgba(var(--theme-glow-rgb),0.08)]"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />

            {/* ⌘K badge (desktop) / Cancel (mobile) */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-2 py-1"
                >
                  ✕
                </button>
              ) : (
                <kbd className="text-[10px] text-[var(--muted-foreground)] bg-[rgba(240,237,230,0.06)] border border-[var(--border)] rounded-md px-1.5 py-0.5 font-mono">
                  ESC
                </kbd>
              )}
            </div>
            <button
              onClick={close}
              className="absolute right-3 top-1/2 -translate-y-1/2 sm:hidden text-sm text-[var(--color-gold)] font-medium px-2 py-1"
            >
              {t('searchCancel')}
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 pb-4 overflow-x-auto scrollbar-hide">
          {FILTER_KEYS.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest whitespace-nowrap transition-all duration-200 border ${
                filter === key
                  ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)]/60 text-[var(--color-gold)]'
                  : 'bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:border-[rgba(240,237,230,0.2)]'
              }`}
            >
              {t(labelKey as never)}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto pb-8 overscroll-contain">
          {query && flatResults.length === 0 && (
            <div className="text-center pt-16">
              <p className="text-[var(--muted-foreground)] text-sm">{t('searchNoResults')}</p>
            </div>
          )}

          {!query && (
            <div className="text-center pt-16">
              <p className="text-[var(--muted-foreground)] text-sm opacity-60">{t('searchHint')}</p>
            </div>
          )}

          {query && filter === 'all' && groupedResults && (
            <div className="space-y-6">
              {(['event', 'artist', 'venue', 'city'] as SearchResultType[]).map((type) => {
                const group = groupedResults[type];
                if (!group || group.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="text-sm">{typeIcon(type)}</span>
                      <span className="text-xs uppercase tracking-widest text-[var(--color-gold)] font-medium">{typeLabel(type)}</span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                    <div className="space-y-1">
                      {group.map((result) => {
                        const idx = flatIndex++;
                        return (
                          <ResultRow
                            key={result.id}
                            result={result}
                            selected={idx === selectedIndex}
                            locale={locale}
                            onClick={() => navigate(result)}
                            onHover={() => setSelectedIndex(idx)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {query && filter !== 'all' && flatResults.length > 0 && (
            <div className="space-y-1">
              {flatResults.map((result, idx) => (
                <ResultRow
                  key={result.id}
                  result={result}
                  selected={idx === selectedIndex}
                  locale={locale}
                  onClick={() => navigate(result)}
                  onHover={() => setSelectedIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom hint */}
        {query && flatResults.length > 0 && (
          <div className="hidden sm:flex items-center justify-center gap-4 pb-6 text-[10px] text-[var(--muted-foreground)]">
            <span><kbd className="bg-[rgba(240,237,230,0.06)] border border-[var(--border)] rounded px-1 py-0.5 font-mono">↑↓</kbd> {t('searchNavigate')}</span>
            <span><kbd className="bg-[rgba(240,237,230,0.06)] border border-[var(--border)] rounded px-1 py-0.5 font-mono">↵</kbd> {t('searchOpen')}</span>
            <span><kbd className="bg-[rgba(240,237,230,0.06)] border border-[var(--border)] rounded px-1 py-0.5 font-mono">esc</kbd> {t('searchClose')}</span>
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Result Row ─── */

function ResultRow({
  result,
  selected,
  locale,
  onClick,
  onHover,
}: {
  result: SearchResult;
  selected: boolean;
  locale: string;
  onClick: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  // Scroll selected into view
  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selected]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseEnter={onHover}
      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-4 group ${
        selected
          ? 'bg-[var(--color-gold)]/8 border border-[var(--color-gold)]/20'
          : 'border border-transparent hover:bg-[var(--card)]'
      }`}
    >
      {result.type === 'event' && <EventRow data={result.data as SearchableEvent} selected={selected} />}
      {result.type === 'artist' && <ArtistRow data={result.data as SearchableArtist} selected={selected} />}
      {result.type === 'venue' && <VenueRow data={result.data as SearchableVenue} selected={selected} />}
      {result.type === 'city' && <CityRow data={result.data as SearchableCity} selected={selected} />}

      {/* Arrow indicator */}
      <svg
        className={`w-4 h-4 shrink-0 transition-all duration-200 ${
          selected ? 'text-[var(--color-gold)] translate-x-0 opacity-100' : 'text-[var(--muted-foreground)] -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-50'
        }`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

function EventRow({ data, selected }: { data: SearchableEvent; selected: boolean }) {
  return (
    <>
      <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg ${selected ? 'bg-[var(--color-gold)]/15' : 'bg-[var(--card)]'} border border-[var(--border)]`}>
        🎵
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-serif text-sm font-bold truncate transition-colors duration-200 ${selected ? 'text-[var(--color-gold)]' : 'text-[var(--foreground)]'}`}>
          {data.title}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">
          {data.date_display} · {data.venue_name}
          {data.primary_artist_name && ` · ♪ ${data.primary_artist_name}`}
        </p>
      </div>
    </>
  );
}

function ArtistRow({ data, selected }: { data: SearchableArtist; selected: boolean }) {
  return (
    <>
      {data.photoUrl ? (
        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden border border-[var(--border)]">
          <img src={data.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-lg ${selected ? 'bg-[var(--color-gold)]/15' : 'bg-[var(--card)]'} border border-[var(--border)]`}>
          ♪
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`font-serif text-sm font-bold truncate transition-colors duration-200 ${selected ? 'text-[var(--color-gold)]' : 'text-[var(--foreground)]'}`}>
          {data.displayName}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">
          {data.type && data.type !== 'person' ? data.type : data.primaryInstrument || ''}
          {data.countryCode && ` · ${data.countryCode}`}
        </p>
      </div>
    </>
  );
}

function VenueRow({ data, selected }: { data: SearchableVenue; selected: boolean }) {
  return (
    <>
      <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg ${selected ? 'bg-[var(--color-gold)]/15' : 'bg-[var(--card)]'} border border-[var(--border)]`}>
        📍
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-serif text-sm font-bold truncate transition-colors duration-200 ${selected ? 'text-[var(--color-gold)]' : 'text-[var(--foreground)]'}`}>
          {data.displayName}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">
          {data.cityName}
          {data.jazz_frequency && ` · ${data.jazz_frequency}`}
        </p>
      </div>
    </>
  );
}

function CityRow({ data, selected }: { data: SearchableCity; selected: boolean }) {
  return (
    <>
      <div className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg ${selected ? 'bg-[var(--color-gold)]/15' : 'bg-[var(--card)]'} border border-[var(--border)]`}>
        🏙
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-serif text-sm font-bold truncate transition-colors duration-200 ${selected ? 'text-[var(--color-gold)]' : 'text-[var(--foreground)]'}`}>
          {data.name}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">
          {data.venueCount} venues
        </p>
      </div>
    </>
  );
}
