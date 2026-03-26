'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface Announcement {
  id: string;
  venue_id: string;
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export default function VenueAnnouncementsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked, minTier } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [fetching, setFetching] = useState(true);

  // Compose state
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalFollowers, setTotalFollowers] = useState(0);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();

    supabase
      .from('venues')
      .select('tier')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) setTier(data.tier);
      });

    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'venue')
      .eq('target_id', slug)
      .then(({ count }) => setTotalFollowers(count || 0));

    fetch(`/api/venue/announcements?venueId=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements(data.announcements || []);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [slug, user]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPinned(false);
    setNotify(true);
    setEditingId(null);
    setComposing(false);
  };

  const handleSave = useCallback(async () => {
    if (!title.trim() || !body.trim() || !slug || !user || saving) return;
    setSaving(true);

    try {
      if (editingId) {
        // Update
        const res = await fetch('/api/venue/announcements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            venueId: slug,
            title: title.trim(),
            body: body.trim(),
            pinned,
          }),
        });
        if (res.ok) {
          setAnnouncements((prev) =>
            prev.map((a) =>
              a.id === editingId
                ? { ...a, title: title.trim(), body: body.trim(), pinned, updated_at: new Date().toISOString() }
                : a,
            ),
          );
          resetForm();
        }
      } else {
        // Create
        const res = await fetch('/api/venue/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venueId: slug,
            title: title.trim(),
            body: body.trim(),
            pinned,
            notify,
          }),
        });
        const data = await res.json();
        if (res.ok && data.id) {
          setAnnouncements((prev) => [
            {
              id: data.id,
              venue_id: slug,
              title: title.trim(),
              body: body.trim(),
              pinned,
              published: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              expires_at: null,
            },
            ...prev,
          ]);
          resetForm();
        }
      }
    } catch {}

    setSaving(false);
  }, [title, body, pinned, notify, slug, user, saving, editingId]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch('/api/venue/announcements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, venueId: slug }),
    });
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  }, [slug]);

  const handleTogglePin = useCallback(async (a: Announcement) => {
    const res = await fetch('/api/venue/announcements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, venueId: slug, pinned: !a.pinned }),
    });
    if (res.ok) {
      setAnnouncements((prev) =>
        prev.map((x) => (x.id === a.id ? { ...x, pinned: !x.pinned } : x)),
      );
    }
  }, [slug]);

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setPinned(a.pinned);
    setComposing(true);
  };

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  const announcementMinTier = minTier('venue', 'announcements');

  // Tier gate
  if (!isUnlocked('venue', 'announcements', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('announcementsTitle')}</h1>
        </FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-amber-400/5 to-amber-400/10 border border-amber-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-amber-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 4v6a6 6 0 0 1-6 6H7" />
              <path d="M7 16l-4-4 4-4" />
              <path d="M21 20c0-3.87-3.13-7-7-7" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('announcementsLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">
              {t('announcementsLockedDesc')}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">
              {t('premiumLockedHint')}
            </p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {announcementMinTier <= 2 ? t('upgradePremium') : t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-amber-400/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('announcementsTitle')}</h1>
          {!composing && (
            <button
              onClick={() => { resetForm(); setComposing(true); }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              {t('newAnnouncement')}
            </button>
          )}
        </div>
      </FadeUp>

      {/* Compose / Edit Form */}
      {composing && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {editingId ? t('editAnnouncement') : t('newAnnouncement')}
            </h2>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder={t('announcementTitlePlaceholder')}
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className={`${inputClass} resize-none`}
              placeholder={t('announcementBodyPlaceholder')}
            />

            <div className="flex flex-wrap items-center gap-4">
              {/* Pin toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] accent-amber-500"
                />
                <span className="text-sm text-[var(--muted-foreground)]">{t('pinAnnouncement')}</span>
              </label>

              {/* Notify toggle (only for new) */}
              {!editingId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] accent-amber-500"
                  />
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {t('notifyFollowers')} ({totalFollowers})
                  </span>
                </label>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!title.trim() || !body.trim() || saving}
                className="px-6 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : editingId ? (
                  t('saveChanges')
                ) : (
                  t('publishAnnouncement')
                )}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Announcements List */}
      <FadeUp>
        <div className="space-y-3">
          {announcements.length === 0 && !composing ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{t('noAnnouncements')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noAnnouncementsHint')}</p>
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className={`bg-[var(--card)] border rounded-2xl p-5 ${
                  a.pinned ? 'border-amber-400/30' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {a.pinned && (
                      <span className="text-amber-400 text-xs">📌</span>
                    )}
                    <h3 className="text-sm font-semibold">{a.title}</h3>
                    {!a.published && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {t('draft')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleTogglePin(a)}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${
                        a.pinned
                          ? 'text-amber-400 hover:bg-amber-400/10'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                      }`}
                      title={a.pinned ? t('unpinAnnouncement') : t('pinAnnouncement')}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={a.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 17v5M9 2h6l-1 7h4l-7 8-1-5H6l3-10z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => startEdit(a)}
                      className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] line-clamp-3 whitespace-pre-line">{a.body}</p>
                <p className="text-xs text-[var(--muted-foreground)]/50 mt-2">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </FadeUp>
    </div>
  );
}
