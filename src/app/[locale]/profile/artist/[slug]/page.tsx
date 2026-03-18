'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface FanStats {
  totalFans: number;
  newFansThisMonth: number;
  cityBreakdown: { city: string; count: number; pct: number }[];
  dailyTrend: { date: string; count: number }[];
}

interface UnreadStats {
  unreadMessages: number;
  unreadBroadcasts: number;
}

export default function ArtistOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { user, loading } = useAuth();
  const { previewArtistTier, adminModeEnabled } = useAdmin();
  const { isUnlocked } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [fanStats, setFanStats] = useState<FanStats | null>(null);
  const [unread, setUnread] = useState<UnreadStats>({ unreadMessages: 0, unreadBroadcasts: 0 });
  const [pageViews, setPageViews] = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Fetch artist tier + page views
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase
      .from('artists')
      .select('tier')
      .eq('artist_id', slug)
      .single()
      .then(({ data }) => {
        if (data) setTier(data.tier);
      });
    supabase
      .from('artist_page_views')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', slug)
      .then(({ count }) => {
        setPageViews(count || 0);
      });
  }, [slug]);

  // Fetch fan stats from follows
  useEffect(() => {
    if (!slug) return;

    const supabase = createClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all followers of this artist
    supabase
      .from('follows')
      .select('user_id, created_at')
      .eq('target_type', 'artist')
      .eq('target_id', slug)
      .then(async ({ data: follows }) => {
        if (!follows) {
          setFanStats({ totalFans: 0, newFansThisMonth: 0, cityBreakdown: [], dailyTrend: [] });
          setFetching(false);
          return;
        }

        const totalFans = follows.length;
        const newFansThisMonth = follows.filter(
          (f) => new Date(f.created_at) >= thirtyDaysAgo
        ).length;

        // Daily trend (last 30 days)
        const dailyMap = new Map<string, number>();
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dailyMap.set(d.toISOString().slice(0, 10), 0);
        }
        follows.forEach((f) => {
          const day = f.created_at.slice(0, 10);
          if (dailyMap.has(day)) {
            dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
          }
        });
        const dailyTrend = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

        // City breakdown from profiles (best-effort: use country or region if available)
        // For now, just show total — city data requires user location tracking later
        setFanStats({
          totalFans,
          newFansThisMonth,
          cityBreakdown: [], // future: aggregate from user profile data
          dailyTrend,
        });
        setFetching(false);
      });

    // Fetch unread message count
    if (user) {
      supabase
        .from('conversations')
        .select('id')
        .eq('artist_id', slug)
        .then(async ({ data: convos }) => {
          if (!convos || convos.length === 0) {
            setUnread({ unreadMessages: 0, unreadBroadcasts: 0 });
            return;
          }
          const convoIds = convos.map((c) => c.id);
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', convoIds)
            .neq('sender_id', user.id)
            .is('read_at', null);
          setUnread((prev) => ({ ...prev, unreadMessages: count || 0 }));
        });
    }
  }, [slug, user]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewArtistTier ?? tier;
  const analyticsLocked = !isUnlocked('artist', 'analytics_basic', effectiveTier, adminModeEnabled);
  const stats = fanStats || { totalFans: 0, newFansThisMonth: 0, cityBreakdown: [], dailyTrend: [] };

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('overviewTitle')}</h1>
      </FadeUp>

      {/* ─── Stat Cards ─── */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={t('totalFans')}
            value={stats.totalFans}
            icon="fans"
            highlight
          />
          <StatCard
            label={t('newFansMonth')}
            value={stats.newFansThisMonth}
            icon="trending"
            suffix={t('thisMonth')}
          />
          <StatCard
            label={t('unreadMessages')}
            value={unread.unreadMessages}
            icon="mail"
          />
          <StatCard
            label={t('pageViews')}
            value={pageViews}
            icon="views"
          />
        </div>
      </FadeUp>

      {/* ─── Fan Growth Trend (Mini Chart) ─── */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
            {t('fanGrowth')}
          </h2>
          <MiniBarChart data={stats.dailyTrend} />
          <p className="text-xs text-[var(--muted-foreground)] mt-3">
            {t('last30Days')}
          </p>
        </div>
      </FadeUp>

      {/* ─── Fan Insights (Tier-gated) ─── */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
            {t('fanInsights')}
          </h2>

          {stats.totalFans > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* City distribution placeholder */}
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">{t('topCities')}</p>
                <div className="space-y-2">
                  {stats.cityBreakdown.length > 0 ? (
                    stats.cityBreakdown.slice(0, 5).map((c) => (
                      <CityBar key={c.city} city={c.city} pct={c.pct} count={c.count} />
                    ))
                  ) : (
                    <div className="space-y-2">
                      {/* Placeholder bars with blur for teasing */}
                      {['Taipei', 'Hong Kong', 'Tokyo', 'Osaka', 'Bangkok'].map((city, i) => (
                        <CityBar key={city} city={city} pct={[45, 22, 15, 10, 8][i]} count={0} blurred={analyticsLocked} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Fan activity summary */}
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">{t('fanActivity')}</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('activeFans')}</span>
                    <span className={`text-sm font-bold ${analyticsLocked ? 'blur-sm select-none' : ''}`}>
                      {analyticsLocked ? '128' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('avgEngagement')}</span>
                    <span className={`text-sm font-bold ${analyticsLocked ? 'blur-sm select-none' : ''}`}>
                      {analyticsLocked ? '73%' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('topFan')}</span>
                    <span className={`text-sm font-bold ${analyticsLocked ? 'blur-sm select-none' : ''}`}>
                      {analyticsLocked ? 'jazz_lover_tw' : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">{t('noFansYet')}</p>
          )}

          {/* Premium upgrade overlay for tier < 2 */}
          {analyticsLocked && stats.totalFans > 0 && (
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-[var(--card)]/80 to-transparent flex items-end justify-center pb-8">
              <div className="text-center">
                <p className="text-sm font-semibold mb-2">{t('unlockInsights')}</p>
                <button disabled className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
                  {t('upgradePremium')}
                </button>
              </div>
            </div>
          )}
        </div>
      </FadeUp>

      {/* ─── Quick Actions ─── */}
      <FadeUp>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/artist/epk?artistId=${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] text-sm hover:border-[var(--color-gold)]/40 transition-colors"
          >
            <svg className="w-4 h-4 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            {t('downloadEpk')}
          </a>
        </div>
      </FadeUp>

      {/* ─── Premium Features Teaser ─── */}
      {analyticsLocked && (
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[var(--color-gold)] mb-3">{t('premiumFeatures')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: 'broadcast', label: t('featureBroadcast') },
                { icon: 'analytics', label: t('featureAnalytics') },
                { icon: 'priority', label: t('featurePriority') },
                { icon: 'badge', label: t('featureBadge') },
              ].map((f) => (
                <div key={f.icon} className="flex items-center gap-2 text-sm text-[var(--foreground)]/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
                  {f.label}
                </div>
              ))}
            </div>
            <button disabled className="mt-4 px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradePremium')}
            </button>
          </div>
        </FadeUp>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function StatCard({
  label,
  value,
  icon,
  highlight,
  suffix,
}: {
  label: string;
  value: number;
  icon: string;
  highlight?: boolean;
  suffix?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 ${
        highlight
          ? 'bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 border-[var(--color-gold)]/20'
          : 'bg-[var(--card)] border-[var(--border)]'
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">{label}</p>
      <p className={`text-2xl sm:text-3xl font-bold ${highlight ? 'text-[var(--color-gold)]' : ''}`}>
        {value.toLocaleString()}
      </p>
      {suffix && <p className="text-xs text-[var(--muted-foreground)] mt-1">{suffix}</p>}
    </div>
  );
}

function MiniBarChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-px h-16">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 bg-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/60 rounded-t transition-colors"
          style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
          title={`${d.date}: +${d.count}`}
        />
      ))}
    </div>
  );
}

function CityBar({
  city,
  pct,
  count,
  blurred,
}: {
  city: string;
  pct: number;
  count: number;
  blurred?: boolean;
}) {
  return (
    <div className={blurred ? 'blur-[3px] select-none pointer-events-none' : ''}>
      <div className="flex justify-between text-xs mb-0.5">
        <span>{city}</span>
        <span className="text-[var(--muted-foreground)]">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-gold)]/60 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
