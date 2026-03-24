'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface EventOption {
  event_id: string;
  title: string;
  date: string;
  venue: string;
}

interface FeaturedItem {
  event_id: string;
  note: string;
}

const MAX_FEATURED = 6;

export default function FeaturedWallPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { previewArtistTier, adminModeEnabled } = useAdmin();
  const { isUnlocked } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pastEvents, setPastEvents] = useState<EventOption[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [originalFeatured, setOriginalFeatured] = useState<FeaturedItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Fetch tier + past events + current featured
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();

      // Get tier
      const { data: artist } = await supabase
        .from('artists')
        .select('tier')
        .eq('artist_id', slug)
        .single();
      if (!cancelled && artist) setTier(artist.tier);

      // Get past events via lineups → events
      const { data: lineups } = await supabase
        .from('lineups')
        .select('event_id')
        .contains('artist_id', [slug]);

      const eventIds = [...new Set((lineups || []).flatMap((l) => l.event_id || []))];
      if (eventIds.length > 0) {
        const { data: events } = await supabase
          .from('events')
          .select('event_id, title_local, title_en, start_at, venue_id')
          .in('event_id', eventIds)
          .lte('start_at', new Date().toISOString())
          .order('start_at', { ascending: false })
          .limit(100);

        if (!cancelled && events) {
          // Resolve venue names
          const venueIds = [...new Set(events.flatMap((e) => e.venue_id || []))];
          const venueMap = new Map<string, string>();
          if (venueIds.length > 0) {
            const { data: venues } = await supabase
              .from('venues')
              .select('venue_id, name_local, name_en')
              .in('venue_id', venueIds);
            for (const v of venues || []) {
              venueMap.set(v.venue_id, v.name_local || v.name_en || '');
            }
          }

          setPastEvents(events.map((e) => ({
            event_id: e.event_id,
            title: e.title_local || e.title_en || e.event_id,
            date: e.start_at ? new Date(e.start_at).toLocaleDateString() : '',
            venue: (e.venue_id || []).map((id: string) => venueMap.get(id) || '').filter(Boolean).join(', '),
          })));
        }
      }

      // Get current featured
      const res = await fetch(`/api/artist/featured-wall?artistId=${slug}`);
      const data = await res.json();
      if (!cancelled && data.items) {
        const items = data.items.map((i: { event_id: string; note?: string }) => ({
          event_id: i.event_id,
          note: i.note || '',
        }));
        setFeatured(items);
        setOriginalFeatured(items);
      }

      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const effectiveTier = previewArtistTier ?? tier;
  const locked = !isUnlocked('artist', 'featured_wall', effectiveTier, adminModeEnabled);

  const dirty = JSON.stringify(featured) !== JSON.stringify(originalFeatured);

  const addEvent = (eventId: string) => {
    if (featured.length >= MAX_FEATURED) return;
    if (featured.some((f) => f.event_id === eventId)) return;
    setFeatured([...featured, { event_id: eventId, note: '' }]);
    setShowPicker(false);
    setSearch('');
    setSaved(false);
  };

  const removeEvent = (eventId: string) => {
    setFeatured(featured.filter((f) => f.event_id !== eventId));
    setSaved(false);
  };

  const updateNote = (eventId: string, note: string) => {
    setFeatured(featured.map((f) => f.event_id === eventId ? { ...f, note } : f));
    setSaved(false);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...featured];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setFeatured(next);
    setSaved(false);
  };

  const moveDown = (index: number) => {
    if (index >= featured.length - 1) return;
    const next = [...featured];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setFeatured(next);
    setSaved(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/artist/featured-wall', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ artistId: slug, items: featured }),
      });
      if (res.ok) {
        setOriginalFeatured([...featured]);
        setSaved(true);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFeatured([...originalFeatured]);
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Tier gate
  if (locked) {
    return (
      <div className="space-y-6">
        <FadeUp>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('featuredWallTitle')}</h1>
        </FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-[var(--color-gold)]/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('featuredWallLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('featuredWallLockedDesc')}</p>
          </div>
        </FadeUp>
      </div>
    );
  }

  const eventMap = new Map(pastEvents.map((e) => [e.event_id, e]));
  const availableEvents = pastEvents.filter((e) => !featured.some((f) => f.event_id === e.event_id));
  const filteredEvents = search
    ? availableEvents.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.venue.toLowerCase().includes(search.toLowerCase()) ||
        e.date.includes(search)
      )
    : availableEvents.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('featuredWallTitle')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('featuredWallDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-all"
              >
                {t('cancel')}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                dirty
                  ? 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'
                  : saved
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
              }`}
            >
              {saving ? '...' : saved ? t('saved') : t('save')}
            </button>
          </div>
        </div>
      </FadeUp>

      {/* Current featured list */}
      <FadeUp>
        <div className="space-y-3">
          {featured.length === 0 ? (
            <div className="bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{t('featuredWallEmpty')}</p>
            </div>
          ) : (
            featured.map((item, index) => {
              const event = eventMap.get(item.event_id);
              return (
                <div
                  key={item.event_id}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-start gap-4"
                >
                  {/* Sort controls */}
                  <div className="flex flex-col gap-1 pt-1">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <span className="text-[10px] text-center text-[var(--muted-foreground)] font-mono">{index + 1}</span>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index >= featured.length - 1}
                      className="w-6 h-6 rounded flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-20 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{event?.title || item.event_id}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {event?.date}{event?.venue ? ` · ${event.venue}` : ''}
                    </p>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateNote(item.event_id, e.target.value)}
                      placeholder={t('featuredWallNotePlaceholder')}
                      maxLength={120}
                      className="mt-2 w-full bg-transparent border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--color-gold)]/50"
                    />
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeEvent(item.event_id)}
                    className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </FadeUp>

      {/* Add button / picker */}
      {featured.length < MAX_FEATURED && (
        <FadeUp>
          {showPicker ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
                  {t('featuredWallPickEvent')}
                </p>
                <button
                  onClick={() => { setShowPicker(false); setSearch(''); }}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {t('cancel')}
                </button>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('featuredWallSearchPlaceholder')}
                autoFocus
                className="w-full bg-transparent border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--color-gold)]/50"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredEvents.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)] text-center py-4">{t('noResults')}</p>
                ) : (
                  filteredEvents.map((event) => (
                    <button
                      key={event.event_id}
                      onClick={() => addEvent(event.event_id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors"
                    >
                      <p className="text-sm font-semibold truncate">{event.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {event.date}{event.venue ? ` · ${event.venue}` : ''}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full py-4 rounded-2xl border border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/30 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t('featuredWallAdd')} ({featured.length}/{MAX_FEATURED})
            </button>
          )}
        </FadeUp>
      )}
    </div>
  );
}
