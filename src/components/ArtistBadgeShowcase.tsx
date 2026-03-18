'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { BADGE_ICONS } from '@/components/BadgeCard';

interface BadgeSummaryData {
  total: number;
  earned: number;
  recent: { badge_id: string; name: string }[];
}

export default function ArtistBadgeShowcase({ artistId }: { artistId: string }) {
  const t = useTranslations('artistStudio');
  const locale = useLocale();
  const [data, setData] = useState<BadgeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artistId) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        const { data: allBadges } = await supabase
          .from('badges')
          .select('*')
          .eq('target_type', 'artist')
          .order('sort_order');

        if (!allBadges) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Lightweight check: fetch artist + lineups for basic progress
        const [{ data: artist }, { data: lineups }] = await Promise.all([
          supabase.from('artists').select('tier, accepting_students, is_master, country_code, instrument_list').eq('artist_id', artistId).maybeSingle(),
          supabase.from('lineups').select('role').eq('artist_id', artistId).limit(200),
        ]);

        const { count: followerCount } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('target_type', 'artist')
          .eq('target_id', artistId);

        const nameKey = `name_${locale === 'zh' ? 'zh' : locale}`;

        // Quick earned check per badge
        const earned: BadgeSummaryData['recent'] = [];
        for (const badge of allBadges) {
          const bid = badge.badge_id as string;
          let isEarned = false;

          switch (bid) {
            case 'art_in_the_house':
              isEarned = !!(artist?.tier && artist.tier >= 1); break;
            case 'art_accepting_students':
              isEarned = artist?.accepting_students === true; break;
            case 'art_fan_favorite':
              isEarned = (followerCount || 0) > 0; break;
            case 'art_multi_instrumentalist':
              isEarned = (artist?.instrument_list || []).length >= (badge.criteria_target || 3); break;
            case 'art_versatile':
              isEarned = new Set((lineups || []).map(l => l.role).filter(Boolean)).size >= (badge.criteria_target || 3); break;
            case 'art_bandleader':
              isEarned = (lineups || []).filter(l => l.role === 'bandleader').length >= (badge.criteria_target || 3); break;
            case 'art_local_hero':
              isEarned = artist?.is_master === true && artist?.country_code === 'TW'; break;
          }

          if (isEarned) {
            earned.push({
              badge_id: bid,
              name: (badge[nameKey] as string) || (badge.name_en as string) || bid,
            });
          }
        }

        if (!cancelled) {
          setData({
            total: allBadges.length,
            earned: earned.length,
            recent: earned.slice(0, 3),
          });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [artistId, locale]);

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 animate-pulse">
        <div className="h-4 w-24 bg-[var(--muted)] rounded mb-3" />
        <div className="h-8 w-16 bg-[var(--muted)] rounded" />
      </div>
    );
  }

  const pct = data.total > 0 ? Math.round((data.earned / data.total) * 100) : 0;

  return (
    <Link
      href={`/${locale}/profile/artist/${artistId}/badges`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--color-gold)]/30 transition-all group"
    >
      {/* Header: title + progress on right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
          <span className="text-sm font-semibold">{t('badges')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums">
              <span className="font-bold text-[var(--color-gold)]">{data.earned}</span>
              <span className="text-[var(--muted-foreground)]"> / {data.total}</span>
            </span>
            <div className="w-16 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-gold)] transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--color-gold)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Earned badges */}
      {data.recent.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.recent.map((b) => {
            const icon = BADGE_ICONS[b.badge_id];
            return (
              <span
                key={b.badge_id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs font-medium"
              >
                {icon ? (
                  <span className="w-4 h-4 flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
                    {icon}
                  </span>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                  </svg>
                )}
                {b.name}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
}
