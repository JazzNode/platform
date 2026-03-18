'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7" />
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
          </svg>
          <span className="text-sm font-semibold">{t('nav_badges')}</span>
        </div>
        <svg className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--color-gold)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      {/* Progress ring + count */}
      <div className="flex items-center gap-4">
        {/* Mini progress ring */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="var(--muted)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="var(--color-gold)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${pct * 0.942} 100`}
              className="transition-all duration-700"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--color-gold)]">
            {pct}%
          </span>
        </div>

        <div>
          <p className="text-2xl font-bold tabular-nums">
            <span className="text-[var(--color-gold)]">{data.earned}</span>
            <span className="text-[var(--muted-foreground)] text-base font-normal"> / {data.total}</span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">{t('badgesEarned')}</p>
        </div>
      </div>

      {/* Recent badges */}
      {data.recent.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
          {data.recent.map((b) => (
            <span
              key={b.badge_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-[10px] font-medium"
            >
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              {b.name}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
