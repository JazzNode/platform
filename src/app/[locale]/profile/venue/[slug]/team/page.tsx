'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface Manager {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
}

export default function VenueTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [fetching, setFetching] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  const fetchTeam = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/venue/team?venueId=${slug}`);
      const data = await res.json();
      setManagers(data.managers || []);
    } catch {}
    setFetching(false);
  }, [slug]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();
    supabase.from('venues').select('tier').eq('venue_id', slug).single()
      .then(({ data }) => { if (data) setTier(data.tier); });
    fetchTeam();
  }, [slug, user, fetchTeam]);

  const handleAdd = useCallback(async () => {
    if (!email.trim() || !slug || adding) return;
    setAdding(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/venue/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: slug, email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmail('');
        setSuccess(t('managerAdded'));
        setTimeout(() => setSuccess(''), 3000);
        fetchTeam();
      } else {
        setError(data.error || 'Failed');
      }
    } catch { setError('Network error'); }
    setAdding(false);
  }, [email, slug, adding, fetchTeam, t]);

  const handleRemove = useCallback(async (userId: string) => {
    const res = await fetch('/api/venue/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venueId: slug, userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setManagers((prev) => prev.filter((m) => m.id !== userId));
    } else {
      setError(data.error || 'Failed');
      setTimeout(() => setError(''), 3000);
    }
  }, [slug]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;

  if (!isUnlocked('venue', 'custom_theme', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('teamTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-indigo-400/5 to-indigo-400/10 border border-indigo-400/20 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-bold mb-2">{t('teamLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">{t('teamLockedDesc')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('teamTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('teamDescription')}</p>
      </FadeUp>

      {/* Add manager */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">{t('addManager')}</h2>
          <div className="flex gap-3">
            <input
              type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className={inputClass} placeholder={t('managerEmailPlaceholder')}
            />
            <button onClick={handleAdd} disabled={!email.trim() || adding}
              className="px-6 py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0">
              {adding ? '...' : t('addBtn')}
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
        </div>
      </FadeUp>

      {/* Manager list */}
      <FadeUp>
        <div className="space-y-3">
          {managers.map((m) => (
            <div key={m.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center gap-4">
              {m.avatar_url ? (
                <Image src={m.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)] shrink-0">
                  {(m.display_name || m.email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.display_name || m.username || 'Unknown'}</p>
                {m.email && <p className="text-xs text-[var(--muted-foreground)] truncate">{m.email}</p>}
              </div>
              {m.id === user?.id ? (
                <span className="text-xs text-[var(--muted-foreground)]">{t('you')}</span>
              ) : (
                <button onClick={() => handleRemove(m.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-400/10">
                  {t('removeManager')}
                </button>
              )}
            </div>
          ))}
        </div>
      </FadeUp>
    </div>
  );
}
