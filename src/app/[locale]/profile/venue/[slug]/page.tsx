'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import VenueBadgeShowcase from '@/components/VenueBadgeShowcase';

export default function VenueOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();

  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pageViews: 0, followers: 0, eventsThisMonth: 0 });

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();

    const fetchStats = async () => {
      // Page views (total)
      const { count: viewCount } = await supabase
        .from('venue_page_views')
        .select('id', { count: 'exact', head: true })
        .eq('venue_id', slug);

      // Followers
      const { count: followerCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('target_type', 'venue')
        .eq('target_id', slug);

      // Events this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      const { count: eventCount } = await supabase
        .from('events')
        .select('event_id', { count: 'exact', head: true })
        .eq('venue_id', slug)
        .gte('start_at', startOfMonth)
        .lte('start_at', endOfMonth);

      setStats({
        pageViews: viewCount || 0,
        followers: followerCount || 0,
        eventsThisMonth: eventCount || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, [slug]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const basePath = `/${locale}/profile/venue/${slug}`;

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('overviewTitle')}</h1>
      </FadeUp>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 border border-[var(--color-gold)]/20 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('totalPageViews')}</p>
            <p className="text-3xl font-bold text-[var(--color-gold)]">{stats.pageViews.toLocaleString()}</p>
          </div>
        </FadeUp>
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('followerCount')}</p>
            <p className="text-3xl font-bold">{stats.followers.toLocaleString()}</p>
          </div>
        </FadeUp>
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
            <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('eventsThisMonth')}</p>
            <p className="text-3xl font-bold">{stats.eventsThisMonth.toLocaleString()}</p>
          </div>
        </FadeUp>
      </div>

      {/* Badge Overview */}
      <FadeUp>
        <VenueBadgeShowcase venueId={slug} />
      </FadeUp>

      {/* Quick Actions */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
            {t('quickActions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href={`${basePath}/edit`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-all"
            >
              <svg className="w-5 h-5 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="text-sm font-medium">{t('editProfile')}</span>
            </Link>
            <Link
              href={`${basePath}/analytics`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-all"
            >
              <svg className="w-5 h-5 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 21H4.6c-.56 0-.84 0-1.05-.11a1 1 0 0 1-.44-.44C3 20.24 3 19.96 3 19.4V3" />
                <path d="M7 14l4-4 4 4 6-6" />
              </svg>
              <span className="text-sm font-medium">{t('viewAnalytics')}</span>
            </Link>
            <Link
              href={`${basePath}/premium`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/5 transition-all"
            >
              <svg className="w-5 h-5 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="text-sm font-medium">{t('managePremium')}</span>
            </Link>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
