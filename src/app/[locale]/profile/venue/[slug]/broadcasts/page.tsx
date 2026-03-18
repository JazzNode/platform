'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface Broadcast {
  id: string;
  title: string;
  body: string;
  channel: string;
  sent_at: string | null;
  created_at: string;
  delivery_count?: number;
  read_count?: number;
}

export default function VenueBroadcastsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const tBroadcast = useTranslations('artistStudio');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked, minTier } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [totalFollowers, setTotalFollowers] = useState(0);
  const [fetching, setFetching] = useState(true);

  // Compose state
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('inbox');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();

    // Fetch tier
    supabase
      .from('venues')
      .select('tier')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) setTier(data.tier);
      });

    // Fetch total followers
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'venue')
      .eq('target_id', slug)
      .then(({ count }) => setTotalFollowers(count || 0));

    // Fetch broadcasts
    supabase
      .from('broadcasts')
      .select('id, title, body, channel, sent_at, created_at')
      .eq('venue_id', slug)
      .order('created_at', { ascending: false })
      .then(async ({ data: items }) => {
        if (!items) {
          setBroadcasts([]);
          setFetching(false);
          return;
        }

        // Enrich with delivery stats
        const enriched = await Promise.all(
          items.map(async (b) => {
            if (!b.sent_at) return { ...b, delivery_count: 0, read_count: 0 };
            const { count: deliveryCount } = await supabase
              .from('broadcast_deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('broadcast_id', b.id);
            const { count: readCount } = await supabase
              .from('broadcast_deliveries')
              .select('id', { count: 'exact', head: true })
              .eq('broadcast_id', b.id)
              .not('read_at', 'is', null);
            return { ...b, delivery_count: deliveryCount || 0, read_count: readCount || 0 };
          })
        );

        setBroadcasts(enriched);
        setFetching(false);
      });
  }, [slug, user]);

  const handleSend = useCallback(async () => {
    if (!title.trim() || !body.trim() || !slug || !user || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/broadcasts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId: slug,
          title: title.trim(),
          body: body.trim(),
          channel,
        }),
      });

      const data = await res.json();

      if (res.ok && data.broadcastId) {
        setBroadcasts((prev) => [
          {
            id: data.broadcastId,
            title: title.trim(),
            body: body.trim(),
            channel,
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            delivery_count: data.deliveryCount || 0,
            read_count: 0,
          },
          ...prev,
        ]);

        // Reset form
        setTitle('');
        setBody('');
        setChannel('inbox');
        setComposing(false);
      }
    } catch {}

    setSending(false);
  }, [title, body, channel, slug, user, sending]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  const broadcastMinTier = minTier('venue', 'broadcasts');

  // Tier gate
  if (!isUnlocked('venue', 'broadcasts', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('broadcastsTitle')}</h1>
        </FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-emerald-400/5 to-emerald-400/10 border border-emerald-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-emerald-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('broadcastsLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">
              {t('broadcastsLockedDesc')}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">
              {t('premiumLockedHint')}
            </p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {broadcastMinTier <= 2 ? t('upgradePremium') : t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-emerald-400/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('broadcastsTitle')}</h1>
          {!composing && (
            <button
              onClick={() => setComposing(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              {tBroadcast('newBroadcast')}
            </button>
          )}
        </div>
      </FadeUp>

      {/* Compose Form */}
      {composing && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {tBroadcast('newBroadcast')}
            </h2>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder={tBroadcast('broadcastTitlePlaceholder')}
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder={tBroadcast('broadcastBodyPlaceholder')}
            />

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {tBroadcast('broadcastChannel')}
              </label>
              <div className="flex gap-2">
                {['inbox', 'email', 'both'].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      channel === ch
                        ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent hover:text-[var(--foreground)]'
                    }`}
                  >
                    {tBroadcast(`channel_${ch}`)}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              {tBroadcast('broadcastRecipients', { count: totalFollowers })}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={!title.trim() || !body.trim() || sending}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  tBroadcast('sendBroadcast')
                )}
              </button>
              <button
                onClick={() => setComposing(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {tBroadcast('cancel')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Past Broadcasts */}
      <FadeUp>
        <div className="space-y-3">
          {broadcasts.length === 0 && !composing ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{tBroadcast('noBroadcasts')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{tBroadcast('noBroadcastsHint')}</p>
            </div>
          ) : (
            broadcasts.map((b) => (
              <div
                key={b.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold">{b.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] shrink-0">
                    {b.sent_at ? (
                      <>
                        <span>{new Date(b.sent_at).toLocaleDateString()}</span>
                        <span className="text-emerald-400/60">
                          {b.read_count}/{b.delivery_count} {tBroadcast('read')}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400">{tBroadcast('draft')}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{b.body}</p>
              </div>
            ))
          )}
        </div>
      </FadeUp>
    </div>
  );
}
