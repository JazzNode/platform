'use client';

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { search, type SearchableArtist, type SearchableVenue, type SearchResult } from '@/lib/search';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ClaimGuideModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations('claimGuide');
  const locale = useLocale();
  const router = useRouter();
  const { profile } = useAuth();

  const [show, setShow] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchData, setSearchData] = useState<{
    artists: SearchableArtist[];
    venues: SearchableVenue[];
  } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasShown = useRef(false);

  // Show modal when: industry user + no claims yet + hasn't been shown this session
  useEffect(() => {
    if (
      profile &&
      profile.user_type === 'industry' &&
      profile.claimed_artist_ids.length === 0 &&
      profile.claimed_venue_ids.length === 0 &&
      !hasShown.current
    ) {
      // Small delay to let onboarding modal close first
      const timer = setTimeout(() => {
        hasShown.current = true;
        setShow(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Fetch search data on mount
  useEffect(() => {
    if (!show || searchData) return;
    setLoadingData(true);
    fetch(`/api/search-data?locale=${locale}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setSearchData({ artists: data.artists, venues: data.venues });
      })
      .finally(() => setLoadingData(false));
  }, [show, locale, searchData]);

  // Focus input when shown
  useEffect(() => {
    if (show) setTimeout(() => inputRef.current?.focus(), 100);
  }, [show]);

  // Search on query change
  useEffect(() => {
    if (!query.trim() || !searchData) {
      setResults([]);
      return;
    }
    const allResults = search(
      query,
      { events: [], artists: searchData.artists, venues: searchData.venues, cities: [], members: [] },
      'all',
    );
    setResults(allResults.slice(0, 6));
  }, [query, searchData]);

  const handleNavigate = useCallback((type: string, id: string) => {
    setShow(false);
    router.push(`/${locale}/${type === 'artist' ? 'artists' : 'venues'}/${id}`);
  }, [locale, router]);

  const handleSkip = useCallback(() => setShow(false), []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!mounted || !show) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[81] flex items-center justify-center" onClick={handleSkip}>
        <div
          className="relative w-full max-w-md mx-4 rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] py-3.5 text-center">
            <span className="text-sm font-semibold tracking-wide text-[var(--color-gold)]">
              {t('title')}
            </span>
          </div>

          <div className="p-6 space-y-5">
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              {t('subtitle_1')}
              <br />
              {t('subtitle_2')}
            </p>

            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent pl-10 pr-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50"
              />
            </div>

            {/* Results */}
            {query.trim() && (
              <div className="space-y-1 max-h-[240px] overflow-y-auto">
                {loadingData ? (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-4">...</p>
                ) : results.length > 0 ? (
                  results.map((r) => {
                    const isArtist = r.type === 'artist';
                    const item = r.data as SearchableArtist | SearchableVenue;
                    const name = isArtist
                      ? (item as SearchableArtist).displayName
                      : (item as SearchableVenue).displayName;
                    const subtitle = isArtist
                      ? [(item as SearchableArtist).primaryInstrument, (item as SearchableArtist).countryCode].filter(Boolean).join(' · ')
                      : (item as SearchableVenue).cityName;

                    return (
                      <button
                        key={`${r.type}-${r.id}`}
                        onClick={() => handleNavigate(r.type, r.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-[rgba(240,237,230,0.06)] transition-colors group"
                      >
                        <span className="text-xs text-[var(--color-gold)]/60 uppercase tracking-wider w-6 shrink-0">
                          {isArtist ? '♪' : '⌂'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">{name}</p>
                          {subtitle && (
                            <p className="text-xs text-[var(--muted-foreground)] truncate">{subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--color-gold)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          {t('goToClaim')} →
                        </span>
                      </button>
                    );
                  })
                ) : (
                  /* Not found */
                  <div className="py-4 text-center">
                    <p className="text-sm text-[var(--muted-foreground)]">{t('notFoundTitle')}</p>
                    <p className="text-xs text-[var(--muted-foreground)]/70 mt-2 leading-relaxed">
                      {t('notFoundDesc')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Learn more link */}
            <a
              href={`/${locale}/tiers`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center text-xs text-[var(--color-gold)]/70 hover:text-[var(--color-gold)] transition-colors"
            >
              {t('learnMore')}
            </a>

            {/* Skip */}
            <button
              onClick={handleSkip}
              className="w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors py-2"
            >
              {t('skip')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
