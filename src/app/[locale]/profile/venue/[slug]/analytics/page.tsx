'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

export default function VenueAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const { previewVenueTier } = useAdmin();
  const { theme } = useTheme();

  const GOLD = theme.accent;

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');
  const [data, setData] = useState<{
    totalViews: number;
    viewsByDay: { date: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('venues').select('tier').eq('venue_id', slug).single()
      .then(({ data: d }) => { if (d) setTier(d.tier); });
  }, [slug]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/venue/analytics?venueId=${slug}&range=${range}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setData(json);
    } else {
      setData({ totalViews: 0, viewsByDay: [] });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!slug) return;
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, range]);

  const effectiveTier = previewVenueTier ?? tier;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('analytics')}</h1>
          <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1">
            {['7d', '30d', '90d'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  range === r
                    ? 'bg-[var(--card)] text-[var(--color-gold)] font-semibold shadow-sm'
                    : 'text-[var(--muted-foreground)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* Total Views */}
      <FadeUp>
        <div className="bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 border border-[var(--color-gold)]/20 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">{t('pageViews')}</p>
          <p className="text-4xl font-bold text-[var(--color-gold)]">{(data?.totalViews || 0).toLocaleString()}</p>
        </div>
      </FadeUp>

      {/* Views by Day Chart */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
            {t('viewsByDay')}
          </h2>
          {data?.viewsByDay && data.viewsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.viewsByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#999' }} width={30} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card, #111111)', border: '1px solid var(--border, #333)', borderRadius: 12, fontSize: 12, color: 'var(--foreground, #F0EDE6)' }}
                  labelStyle={{ color: 'var(--muted-foreground, #8A8578)' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </div>
      </FadeUp>

      {/* Premium Analytics Teaser (Tier < 2) */}
      {effectiveTier < 2 && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
              {t('referrerSources')} & {t('cityDistribution')}
            </h2>
            {/* Blurred placeholder */}
            <div className="blur-[6px] select-none pointer-events-none space-y-3">
              {['Direct', 'Google', 'Instagram', 'Facebook'].map((s, i) => (
                <div key={s} className="flex justify-between text-sm">
                  <span>{s}</span>
                  <span className="text-[var(--muted-foreground)]">{[42, 28, 15, 9][i]}</span>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-[var(--card)]/80 to-transparent flex items-end justify-center pb-8">
              <div className="text-center">
                <p className="text-sm font-semibold mb-2">{t('unlockInsights')}</p>
                <button className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
                  {t('upgradePremium')}
                </button>
              </div>
            </div>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
