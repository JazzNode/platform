'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface MessageVenueButtonProps {
  venueId: string;
}

export default function MessageVenueButton({ venueId }: MessageVenueButtonProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user, setShowAuth } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (!user) {
      setShowAuth?.(true);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Find or create venue_fan conversation
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'venue_fan')
      .eq('venue_id', venueId)
      .eq('fan_user_id', user.id)
      .maybeSingle();

    if (existing) {
      router.push(`/${locale}/profile/inbox?convo=${existing.id}`);
      setLoading(false);
      return;
    }

    // Create new conversation
    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({
        type: 'venue_fan',
        venue_id: venueId,
        fan_user_id: user.id,
      })
      .select('id')
      .single();

    if (newConvo) {
      router.push(`/${locale}/profile/inbox?convo=${newConvo.id}`);
    }

    setLoading(false);
  }, [user, venueId, locale, router, setShowAuth]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
      title={t('messageVenue')}
    >
      {loading ? (
        <div className="w-3.5 h-3.5 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
      <span className="hidden sm:inline">{t('messageVenue')}</span>
    </button>
  );
}
