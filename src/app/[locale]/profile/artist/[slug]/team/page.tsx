'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import TeamManagementPanel from '@/components/team/TeamManagementPanel';

export default function ArtistTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { user, loading } = useAuth();
  const { previewArtistTier, adminModeEnabled } = useAdmin();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();
    supabase.from('artists').select('tier').eq('artist_id', slug).single()
      .then(({ data }) => { if (data) setTier(data.tier); });
  }, [slug, user]);

  if (loading || !slug) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewArtistTier ?? tier;

  // Tier 1+ required (claimed)
  if (effectiveTier < 1 && !adminModeEnabled) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('teamTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-blue-400/5 to-blue-400/10 border border-blue-400/20 rounded-2xl p-8 text-center">
            <h2 className="text-lg font-bold mb-2">{t('teamLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">{t('teamLockedDesc')}</p>
          </div>
        </FadeUp>
      </div>
    );
  }

  return <TeamManagementPanel entityType="artist" entityId={slug} t={t} />;
}
