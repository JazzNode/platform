'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from './AuthProvider';
import { useFollows } from './FollowsProvider';
import type { SearchableVenue, SearchableArtist } from '@/lib/search';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/** Map user profile region → country_code for filtering */
const REGION_TO_COUNTRY: Record<string, string> = {
  taiwan: 'TW', hong_kong: 'HK', singapore: 'SG', malaysia: 'MY',
  japan: 'JP', south_korea: 'KR', thailand: 'TH', indonesia: 'ID', philippines: 'PH',
};

interface RecommendItem {
  type: 'venue' | 'artist';
  id: string;
  name: string;
  subtitle: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SKELETON_COUNT = 5;

export default function FollowGuideModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations('followGuide');
  const locale = useLocale();
  const { user, profile } = useAuth();
  const { isFollowing, toggleFollow, hasAnyFollows, loading: followsLoading } = useFollows();

  const [show, setShow] = useState(false);
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const hasShownThisSession = useRef(false);
  const prefetchedRef = useRef<Promise<RecommendItem[]> | null>(null);

  /** Build recommendations from raw search-data response */
  const buildRecs = useCallback((data: { venues: SearchableVenue[]; artists: SearchableArtist[] }) => {
    const userCountry = profile?.region ? REGION_TO_COUNTRY[profile.region] : null;
    const recs: RecommendItem[] = [];

    const venuesSorted = [...data.venues].sort((a, b) => {
      const aMatch = userCountry && a.cityName?.includes(userCountry) ? 1 : 0;
      const bMatch = userCountry && b.cityName?.includes(userCountry) ? 1 : 0;
      return bMatch - aMatch;
    });
    for (const v of venuesSorted.slice(0, 4)) {
      recs.push({ type: 'venue', id: v.id, name: v.displayName, subtitle: v.cityName || '' });
    }

    const artistsSorted = [...data.artists].filter((a) => a.displayName).sort((a, b) => {
      const aMatch = userCountry && a.countryCode === userCountry ? 1 : 0;
      const bMatch = userCountry && b.countryCode === userCountry ? 1 : 0;
      return bMatch - aMatch;
    });
    for (const a of artistsSorted.slice(0, 4)) {
      recs.push({
        type: 'artist', id: a.id, name: a.displayName,
        subtitle: [a.primaryInstrument, a.countryCode].filter(Boolean).join(' · '),
      });
    }
    return recs;
  }, [profile?.region]);

  /** Start prefetching immediately — returns a shared promise */
  const startPrefetch = useCallback(() => {
    if (prefetchedRef.current) return prefetchedRef.current;
    const p = fetch(`/api/search-data?locale=${locale}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => (data ? buildRecs(data) : []));
    prefetchedRef.current = p;
    return p;
  }, [locale, buildRecs]);

  // Show modal: fan user — first time immediately, second time only after 24h if no follows
  // KEY CHANGE: prefetch data immediately, then show modal after the delay
  useEffect(() => {
    if (!profile || profile.user_type !== 'fan' || !user || followsLoading || hasShownThisSession.current) return;

    const storageKey = `followGuide:${user.id}`;
    let state: { shownCount: number; firstShownAt: string | null };
    try {
      const stored = localStorage.getItem(storageKey);
      state = stored ? JSON.parse(stored) : { shownCount: 0, firstShownAt: null };
    } catch {
      state = { shownCount: 0, firstShownAt: null };
    }

    if (state.shownCount >= 2) return;

    // Second-time guard
    if (state.shownCount === 1) {
      if (hasAnyFollows) return;
      const firstShown = new Date(state.firstShownAt!).getTime();
      if (Date.now() - firstShown < ONE_DAY_MS) return;
    }

    // Start fetching NOW, before the delay
    const prefetchPromise = startPrefetch();

    const timer = setTimeout(() => {
      hasShownThisSession.current = true;
      if (state.shownCount === 0) {
        localStorage.setItem(storageKey, JSON.stringify({ shownCount: 1, firstShownAt: new Date().toISOString() }));
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ ...state, shownCount: 2 }));
      }
      setShow(true);

      // Resolve prefetch and populate items
      prefetchPromise.then((recs) => { if (recs.length > 0) setItems(recs); });
    }, 600);
    return () => clearTimeout(timer);
  }, [profile, user, followsLoading, hasAnyFollows, startPrefetch]);

  // Fallback: if modal is shown but prefetch didn't populate items (edge case), fetch now
  useEffect(() => {
    if (!show || items.length > 0) return;
    startPrefetch().then((recs) => { if (recs.length > 0) setItems(recs); });
  }, [show, items.length, startPrefetch]);

  const handleToggle = async (type: 'venue' | 'artist', id: string) => {
    await toggleFollow(type, id);
    setFollowedIds((prev) => {
      const next = new Set(prev);
      const key = `${type}:${id}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDone = () => setShow(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!mounted || !show) return null;

  return createPortal(
    <>
      {/* Keyframes for skeleton shimmer + item fade-in */}
      <style>{`
        @keyframes followGuide-shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes followGuide-fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80]"
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleDone}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[81] flex items-center justify-center" onClick={handleDone}>
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

            {/* Recommendations grid */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {items.length === 0
                ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                    <div
                      key={i}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent"
                    >
                      <span
                        className="w-6 h-4 shrink-0 rounded bg-[var(--foreground)]/[0.06]"
                        style={{ animation: `followGuide-shimmer 1.2s ease-in-out ${i * 0.1}s infinite` }}
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <span
                          className="block h-3.5 rounded bg-[var(--foreground)]/[0.08]"
                          style={{
                            width: `${60 + (i * 13) % 30}%`,
                            animation: `followGuide-shimmer 1.2s ease-in-out ${i * 0.1}s infinite`,
                          }}
                        />
                        <span
                          className="block h-2.5 rounded bg-[var(--foreground)]/[0.05]"
                          style={{
                            width: `${35 + (i * 17) % 25}%`,
                            animation: `followGuide-shimmer 1.2s ease-in-out ${i * 0.1 + 0.05}s infinite`,
                          }}
                        />
                      </div>
                      <span
                        className="w-3 h-3 shrink-0 rounded-full bg-[var(--foreground)]/[0.06]"
                        style={{ animation: `followGuide-shimmer 1.2s ease-in-out ${i * 0.1}s infinite` }}
                      />
                    </div>
                  ))
                : items.map((item, i) => {
                    const key = `${item.type}:${item.id}`;
                    const followed = followedIds.has(key) || isFollowing(item.type, item.id);

                    return (
                      <button
                        key={key}
                        onClick={() => handleToggle(item.type, item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 border ${
                          followed
                            ? 'border-[var(--color-gold)]/30 bg-[var(--color-gold)]/8'
                            : 'border-transparent hover:bg-[rgba(240,237,230,0.06)]'
                        }`}
                        style={{
                          animation: `followGuide-fadeIn 0.3s ease-out ${i * 0.05}s both`,
                        }}
                      >
                        <span className="text-xs text-[var(--color-gold)]/60 uppercase tracking-wider w-6 shrink-0">
                          {item.type === 'venue' ? '⌂' : '♪'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">{item.name}</p>
                          {item.subtitle && (
                            <p className="text-xs text-[var(--muted-foreground)] truncate">{item.subtitle}</p>
                          )}
                        </div>
                        <span className={`text-xs shrink-0 transition-colors ${
                          followed ? 'text-[var(--color-gold)]' : 'text-[var(--muted-foreground)]'
                        }`}>
                          {followed ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })
              }
            </div>

            {/* Done button */}
            <button
              onClick={handleDone}
              className="w-full h-10 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold tracking-wide transition-opacity hover:opacity-90"
            >
              {followedIds.size > 0 ? t('done') : t('skip')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
