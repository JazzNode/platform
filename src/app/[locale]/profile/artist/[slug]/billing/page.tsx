'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import BillingPanel from '@/components/billing/BillingPanel';
import FadeUp from '@/components/animations/FadeUp';

export default function ArtistBillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { user } = useAuth();
  const [slug, setSlug] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();

    // team_members first
    supabase
      .from('team_members')
      .select('role')
      .eq('entity_type', 'artist')
      .eq('entity_id', slug)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single()
      .then(async ({ data: membership }) => {
        if (membership?.role === 'owner') {
          setRole('owner');
          setChecking(false);
          return;
        }
        // Fallback: claimed_artist_ids
        const { data: profile } = await supabase
          .from('profiles')
          .select('claimed_artist_ids')
          .eq('id', user.id)
          .single();

        setRole(profile?.claimed_artist_ids?.includes(slug) ? 'owner' : null);
        setChecking(false);
      });
  }, [slug, user]);

  if (!slug || checking) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (role === 'owner' || role === 'admin') {
    return <BillingPanel entityType="artist" entityId={slug} t={t} />;
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('billingTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('billingDescription')}</p>
      </FadeUp>
      <FadeUp>
        <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">🎵</p>
          <h2 className="text-lg font-bold mb-2">Coming Soon</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Subscription management will be available here soon.</p>
        </div>
      </FadeUp>
    </div>
  );
}
