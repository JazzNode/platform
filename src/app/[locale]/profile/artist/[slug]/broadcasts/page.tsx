'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
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

export default function BroadcastsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { user, loading, setShowComingSoon } = useAuth();
  const { previewArtistTier } = useAdmin();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [totalFans, setTotalFans] = useState(0);
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
      .from('artists')
      .select('tier')
      .eq('artist_id', slug)
      .single()
      .then(({ data }) => {
        if (data) setTier(data.tier);
      });

    // Fetch total fans
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'artist')
      .eq('target_id', slug)
      .then(({ count }) => setTotalFans(count || 0));

    // Fetch broadcasts
    supabase
      .from('broadcasts')
      .select('id, title, body, channel, sent_at, created_at')
      .eq('artist_id', slug)
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

    const supabase = createClient();

    // Create broadcast
    const { data: broadcast } = await supabase
      .from('broadcasts')
      .insert({
        artist_id: slug,
        sender_id: user.id,
        title: title.trim(),
        body: body.trim(),
        channel,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (broadcast) {
      // Create delivery records for all fans
      const { data: fans } = await supabase
        .from('follows')
        .select('user_id')
        .eq('target_type', 'artist')
        .eq('target_id', slug);

      if (fans && fans.length > 0) {
        const deliveries = fans.map((f) => ({
          broadcast_id: broadcast.id,
          user_id: f.user_id,
        }));
        await supabase.from('broadcast_deliveries').insert(deliveries);
      }

      setBroadcasts((prev) => [
        {
          ...broadcast,
          delivery_count: fans?.length || 0,
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

    setSending(false);
  }, [title, body, channel, slug, user, sending]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewArtistTier ?? tier;

  // Tier gate
  if (effectiveTier < 2) {
    return (
      <div className="space-y-6">
        <FadeUp>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('broadcastsTitle')}</h1>
        </FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-[var(--color-gold)]/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('broadcastLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">
              {t('broadcastLockedDesc', { count: totalFans })}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">
              {t('broadcastLockedHint')}
            </p>
            <button onClick={() => setShowComingSoon({ x: 0, y: 0 })} className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradePremium')}
            </button>
          </div>
        </FadeUp>
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('broadcastsTitle')}</h1>
          {!composing && (
            <button
              onClick={() => setComposing(true)}
              className="px-4 py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              {t('newBroadcast')}
            </button>
          )}
        </div>
      </FadeUp>

      {/* Compose Form */}
      {composing && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('newBroadcast')}
            </h2>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder={t('broadcastTitlePlaceholder')}
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder={t('broadcastBodyPlaceholder')}
            />

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('broadcastChannel')}
              </label>
              <div className="flex gap-2">
                {['inbox', 'email', 'both'].map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      channel === ch
                        ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30'
                        : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t(`channel_${ch}`)}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--muted-foreground)]">
              {t('broadcastRecipients', { count: totalFans })}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={!title.trim() || !body.trim() || sending}
                className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {sending ? (
                  <div className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                ) : (
                  t('sendBroadcast')
                )}
              </button>
              <button
                onClick={() => setComposing(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {t('cancel')}
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
              <p className="text-sm text-[var(--muted-foreground)]">{t('noBroadcasts')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noBroadcastsHint')}</p>
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
                        <span className="text-[var(--color-gold)]/60">
                          {b.read_count}/{b.delivery_count} {t('read')}
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-400">{t('draft')}</span>
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
