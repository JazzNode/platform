'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
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

export default function FollowGuideModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations('followGuide');
  const locale = useLocale();
  const { profile } = useAuth();
  const { isFollowing, toggleFollow } = useFollows();

  const [show, setShow] = useState(false);
  const [items, setItems] = useState<RecommendItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const hasShown = useRef(false);

  // Show modal: fan user with no follows
  useEffect(() => {
    if (
      profile &&
      profile.user_type === 'fan' &&
      !hasShown.current
    ) {
      const timer = setTimeout(() => {
        hasShown.current = true;
        setShow(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  // Fetch recommendations
  useEffect(() => {
    if (!show || items.length > 0) return;
    setLoadingData(true);
    fetch(`/api/search-data?locale=${locale}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const userCountry = profile?.region ? REGION_TO_COUNTRY[profile.region] : null;
        const recs: RecommendItem[] = [];

        // Prioritize venues from user's region
        const venuesSorted = [...(data.venues as SearchableVenue[])].sort((a, b) => {
          const aMatch = userCountry && a.cityName?.includes(userCountry) ? 1 : 0;
          const bMatch = userCountry && b.cityName?.includes(userCountry) ? 1 : 0;
          return bMatch - aMatch;
        });

        for (const v of venuesSorted.slice(0, 4)) {
          recs.push({
            type: 'venue',
            id: v.id,
            name: v.displayName,
            subtitle: v.cityName || '',
          });
        }

        // Add top artists (prioritize those with country matching user's region)
        const artistsSorted = [...(data.artists as SearchableArtist[])]
          .filter((a) => a.displayName)
          .sort((a, b) => {
            const aMatch = userCountry && a.countryCode === userCountry ? 1 : 0;
            const bMatch = userCountry && b.countryCode === userCountry ? 1 : 0;
            return bMatch - aMatch;
          });

        for (const a of artistsSorted.slice(0, 4)) {
          recs.push({
            type: 'artist',
            id: a.id,
            name: a.displayName,
            subtitle: [a.primaryInstrument, a.countryCode].filter(Boolean).join(' · '),
          });
        }

        setItems(recs);
      })
      .finally(() => setLoadingData(false));
  }, [show, locale, profile?.region, items.length]);

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
            {loadingData ? (
              <p className="text-xs text-[var(--muted-foreground)] text-center py-4">...</p>
            ) : (
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto">
                {items.map((item) => {
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
                })}
              </div>
            )}

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
