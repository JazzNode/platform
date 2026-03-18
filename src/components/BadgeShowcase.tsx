'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import { BADGE_ICONS } from '@/components/BadgeCard';

interface BadgeSummaryData {
  total: number;
  earned: number;
  recent: { badge_id: string; name: string; earned_at: string }[];
}

export default function BadgeShowcase() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { user } = useAuth();
  const [data, setData] = useState<BadgeSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        // Fetch badge count + recent earned
        const [{ data: allBadges }, { data: userBadges }] = await Promise.all([
          supabase.from('badges').select('badge_id').eq('target_type', 'user'),
          supabase.from('user_badges')
            .select('badge_id, earned_at')
            .eq('user_id', user.id)
            .order('earned_at', { ascending: false })
            .limit(3),
        ]);

        const total = (allBadges || []).length;
        const earned = (userBadges || []).length;

        // Fetch names for recent badges
        const recentIds = (userBadges || []).map(ub => ub.badge_id);
        let recent: BadgeSummaryData['recent'] = [];
        if (recentIds.length > 0) {
          const { data: badgeRows } = await supabase
            .from('badges')
            .select('*')
            .in('badge_id', recentIds);

          const nameKey = `name_${locale === 'zh' ? 'zh' : locale}`;
          recent = (userBadges || []).map(ub => {
            const row = (badgeRows || []).find((b: Record<string, unknown>) => b.badge_id === ub.badge_id) as Record<string, unknown> | undefined;
            return {
              badge_id: ub.badge_id,
              name: (row?.[nameKey] as string) || (row?.name_en as string) || ub.badge_id,
              earned_at: ub.earned_at,
            };
          });
        }

        if (!cancelled) {
          setData({ total, earned, recent });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, locale]);

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
      href={`/${locale}/profile/badges`}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 hover:border-[var(--color-gold)]/30 transition-all group"
    >
      {/* Header: title + progress on right */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
          <span className="text-sm font-semibold">{t('nav_badges')}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm tabular-nums">
              <span className="font-bold text-[var(--color-gold)]">{data.earned}</span>
              <span className="text-[var(--muted-foreground)]"> / {data.total}</span>
            </span>
            {/* Mini progress bar */}
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

      {/* Earned badges — larger with icons */}
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
