'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import { useTheme } from '@/components/ThemeProvider';
import Image from 'next/image';
import Link from 'next/link';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CollabStats {
  totalCollaborators: number;
  totalGigs: number;
  mostFrequent: { id: string; name: string; count: number } | null;
  gigsThisYear: number;
}

interface TopCollaborator {
  artistId: string;
  name: string;
  photoUrl: string | null;
  sharedGigs: number;
  lastGigDate: string;
  venuesTogether: string[];
}

interface SuggestedCollaborator {
  artistId: string;
  name: string;
  photoUrl: string | null;
  mutualCount: number;
  mutualNames: string[];
}

interface CollabData {
  stats: CollabStats;
  topCollaborators: TopCollaborator[];
  timeline: { quarter: string; count: number }[];
  suggestedCollaborators: SuggestedCollaborator[];
}

export default function ArtistCollaborationsPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const t = useTranslations('artistStudio');
  const { previewArtistTier } = useAdmin();
  const { theme } = useTheme();
  const GOLD = theme.accent;

  const [slug, setSlug] = useState('');
  const [locale, setLocale] = useState('en');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CollabData | null>(null);

  useEffect(() => {
    params.then((p) => {
      setSlug(decodeURIComponent(p.slug));
      setLocale(p.locale || 'en');
    });
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('artists').select('tier').eq('artist_id', slug).single()
      .then(({ data: d }) => { if (d) setTier(d.tier); });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/artist/collaboration-insights?artistId=${slug}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  const effectiveTier = previewArtistTier ?? tier;

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
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('collabInsights')}</h1>
      </FadeUp>

      {effectiveTier >= 2 ? (
        <>
          {/* Stats Cards */}
          <FadeUp>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 border border-[var(--color-gold)]/20 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('totalCollaborators')}</p>
                <p className="text-3xl font-bold text-[var(--color-gold)]">{data?.stats.totalCollaborators || 0}</p>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('totalGigs')}</p>
                <p className="text-3xl font-bold">{data?.stats.totalGigs || 0}</p>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('mostFrequent')}</p>
                <p className="text-lg font-bold truncate">{data?.stats.mostFrequent?.name || '—'}</p>
                {data?.stats.mostFrequent && (
                  <p className="text-xs text-[var(--muted-foreground)]">{data.stats.mostFrequent.count} {t('sharedGigs').toLowerCase()}</p>
                )}
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('gigsThisYear')}</p>
                <p className="text-3xl font-bold">{data?.stats.gigsThisYear || 0}</p>
              </div>
            </div>
          </FadeUp>

          {/* Two-column: Top Collaborators + Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Collaborators */}
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
                  {t('topCollaborators')}
                </h2>
                {data?.topCollaborators && data.topCollaborators.length > 0 ? (
                  <div className="space-y-3">
                    {data.topCollaborators.slice(0, 10).map((collab, i) => (
                      <div key={collab.artistId} className="flex items-center gap-3">
                        {/* Rank */}
                        <span className="text-sm font-bold text-[var(--color-gold)] w-6 text-right">{i + 1}</span>

                        {/* Avatar */}
                        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0">
                          {collab.photoUrl ? (
                            <Image src={collab.photoUrl} alt={collab.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)]">
                              {collab.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Name + Venues */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/${locale}/artist/${collab.artistId}`}
                            className="text-sm font-semibold hover:text-[var(--color-gold)] transition-colors truncate block"
                          >
                            {collab.name}
                          </Link>
                          {collab.venuesTogether.length > 0 && (
                            <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                              {collab.venuesTogether.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </div>

                        {/* Shared Gigs + Last Date */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">{collab.sharedGigs}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">{collab.lastGigDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noCollabData')}</p>
                )}
              </div>
            </FadeUp>

            {/* Collaboration Timeline */}
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
                  {t('collabTimeline')}
                </h2>
                {data?.timeline && data.timeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.timeline}>
                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="quarter"
                        tick={{ fontSize: 10, fill: '#999' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#999' }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--card, #111111)',
                          border: '1px solid var(--border, #333)',
                          borderRadius: 12,
                          fontSize: 12,
                          color: 'var(--foreground, #F0EDE6)',
                        }}
                        labelStyle={{ color: 'var(--muted-foreground, #8A8578)' }}
                        cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={GOLD}
                        strokeWidth={2}
                        fill="url(#goldGradient)"
                        name={t('gigsPerQuarter')}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noCollabData')}</p>
                )}
              </div>
            </FadeUp>
          </div>

          {/* Suggested Collaborators */}
          {data?.suggestedCollaborators && data.suggestedCollaborators.length > 0 && (
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
                  {t('suggestedCollaborators')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.suggestedCollaborators.map((s) => (
                    <Link
                      key={s.artistId}
                      href={`/${locale}/artist/${s.artistId}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/40 transition-colors"
                    >
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0">
                        {s.photoUrl ? (
                          <Image src={s.photoUrl} alt={s.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--muted-foreground)]">
                            {s.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{s.name}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {s.mutualCount} {t('mutualConnections')}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] truncate">
                          {s.mutualNames.join(', ')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </FadeUp>
          )}
        </>
      ) : (
        /* Blurred Teaser for Tier < 2 */
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden">
            <div className="blur-[6px] select-none pointer-events-none space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {['Collaborators: 28', 'Total Gigs: 142', 'Most Frequent: 藝人名', 'This Year: 15'].map((s) => (
                  <div key={s} className="p-4 bg-[var(--muted)] rounded-xl text-sm">{s}</div>
                ))}
              </div>
              <div className="h-48 bg-[var(--muted)] rounded-xl" />
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
