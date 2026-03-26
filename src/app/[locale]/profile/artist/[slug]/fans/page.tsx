'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import Image from 'next/image';

interface FanData {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  followedAt: string;
  notificationLevel: string;
  shoutoutCount: number;
  messageCount: number;
  engagementScore: number;
  lastActivity: string | null;
}

interface CRMData {
  summary: {
    totalFollowers: number;
    newThisMonth: number;
    avgEngagement: number;
  };
  fans: FanData[];
}

export default function ArtistFanCRMPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { previewArtistTier } = useAdmin();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'new'>('all');
  const [data, setData] = useState<CRMData | null>(null);

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
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/artist/fan-crm?artistId=${slug}&filter=${filter}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    };
    fetchData();
  }, [slug, filter]);

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
      {/* Header + Filter */}
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('fanCRM')}</h1>
          <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1">
            {(['all', 'active', 'new'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  filter === f
                    ? 'bg-[var(--card)] text-[var(--color-gold)] font-semibold shadow-sm'
                    : 'text-[var(--muted-foreground)]'
                }`}
              >
                {t(f === 'all' ? 'filterAllFans' : f === 'active' ? 'filterActiveFans' : 'filterNewFans')}
              </button>
            ))}
          </div>
        </div>
      </FadeUp>

      {effectiveTier >= 2 ? (
        <>
          {/* Summary Cards */}
          <FadeUp>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[var(--color-gold)]/8 to-[var(--color-gold)]/3 border border-[var(--color-gold)]/20 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('totalFollowers')}</p>
                <p className="text-3xl font-bold text-[var(--color-gold)]">{data?.summary.totalFollowers || 0}</p>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('newThisMonth')}</p>
                <p className="text-3xl font-bold">{data?.summary.newThisMonth || 0}</p>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{t('avgEngagement')}</p>
                <p className="text-3xl font-bold">{data?.summary.avgEngagement || 0}</p>
              </div>
            </div>
          </FadeUp>

          {/* Fan List */}
          {data?.fans && data.fans.length > 0 ? (
            <div className="space-y-3">
              {data.fans.map((fan, i) => (
                <FadeUp key={fan.userId} delay={i * 0.03}>
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0">
                      {fan.photoUrl ? (
                        <Image src={fan.photoUrl} alt={fan.displayName} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--muted-foreground)]">
                          {fan.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name & Date */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{fan.displayName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {t('since')} {new Date(fan.followedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Activity Badges */}
                    <div className="hidden sm:flex items-center gap-2">
                      {fan.shoutoutCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs">
                          📣 {fan.shoutoutCount}
                        </span>
                      )}
                      {fan.messageCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                          💬 {fan.messageCount}
                        </span>
                      )}
                      {/* Notification level */}
                      {fan.notificationLevel === 'All' && (
                        <span className="text-xs" title="All notifications">🔔</span>
                      )}
                      {fan.notificationLevel === 'Important' && (
                        <span className="text-xs" title="Important notifications">🔕</span>
                      )}
                    </div>

                    {/* Engagement Score */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-[var(--color-gold)]">{fan.engagementScore}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('engagementScore')}</p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          ) : (
            <FadeUp>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">{t('noFanData')}</p>
              </div>
            </FadeUp>
          )}
        </>
      ) : (
        /* Blurred Teaser for Tier < 2 */
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 relative overflow-hidden">
            <div className="blur-[6px] select-none pointer-events-none space-y-3">
              {['Sarah Chen — Score: 15', 'Mike Jazz — Score: 12', 'Fan User — Score: 8', 'Music Lover — Score: 5'].map((s) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-full bg-[var(--muted)]" />
                  <span className="flex-1">{s}</span>
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
