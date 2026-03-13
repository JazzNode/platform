'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const GOLD = '#C8A84E';
const COLORS = ['#C8A84E', '#8B7355', '#6B5B3E', '#4B3F2B', '#2B2519'];

export default function ArtistAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');
  const [data, setData] = useState<{
    totalViews: number;
    viewsByDay: { date: string; count: number }[];
    referrerBreakdown?: { source: string; count: number }[];
    cityBreakdown?: { city: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('artists').select('tier').eq('artist_id', slug).single()
      .then(({ data: d }) => { if (d) setTier(d.tier); });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    fetchAnalytics();
  }, [slug, range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/artist/analytics?artistId=${slug}&range=${range}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

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
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#999' }}
                />
                <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </div>
      </FadeUp>

      {/* Premium Analytics (Tier 2+) */}
      {tier >= 2 ? (
        <>
          {/* Referrer Sources */}
          {data?.referrerBreakdown && data.referrerBreakdown.length > 0 && (
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
                  {t('referrerSources')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={data.referrerBreakdown.slice(0, 5)}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                      >
                        {data.referrerBreakdown.slice(0, 5).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {data.referrerBreakdown.slice(0, 5).map((r, i) => (
                      <div key={r.source} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                        <span className="flex-1 truncate">{r.source}</span>
                        <span className="text-[var(--muted-foreground)]">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeUp>
          )}

          {/* City Distribution */}
          {data?.cityBreakdown && data.cityBreakdown.length > 0 && (
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
                  {t('cityDistribution')}
                </h2>
                <div className="space-y-2">
                  {data.cityBreakdown.slice(0, 8).map((c) => {
                    const maxCount = data.cityBreakdown![0].count;
                    const pct = Math.round((c.count / maxCount) * 100);
                    return (
                      <div key={c.city}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span>{c.city}</span>
                          <span className="text-[var(--muted-foreground)]">{c.count}</span>
                        </div>
                        <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-gold)]/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeUp>
          )}
        </>
      ) : (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
              {t('referrerSources')} & {t('cityDistribution')}
            </h2>
            {/* Blurred placeholder */}
            <div className="blur-[6px] select-none pointer-events-none space-y-3">
              {['Direct', 'Google', 'Instagram', 'Facebook'].map((s) => (
                <div key={s} className="flex justify-between text-sm">
                  <span>{s}</span>
                  <span className="text-[var(--muted-foreground)]">{Math.floor(Math.random() * 100)}</span>
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
