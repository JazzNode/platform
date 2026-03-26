'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface MessageVenueButtonProps {
  venueId: string;
  claimed?: boolean;
  label?: string;
}

export default function MessageVenueButton({ venueId, claimed, label }: MessageVenueButtonProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const { user, setShowAuthModal } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (!claimed) return;
    if (!user) {
      setShowAuthModal?.(true);
      return;
    }

    setLoading(true);
    try {
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
        window.location.href = `/${locale}/profile/inbox?convo=${existing.id}`;
        return;
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({
          type: 'venue_fan',
          venue_id: venueId,
          fan_user_id: user.id,
        })
        .select('id')
        .single();

      if (newConvo) {
        window.location.href = `/${locale}/profile/inbox?convo=${newConvo.id}`;
        return;
      }

      // Insert failed (e.g. unique constraint) — retry finding it
      if (error) {
        const { data: retry } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'venue_fan')
          .eq('venue_id', venueId)
          .eq('fan_user_id', user.id)
          .maybeSingle();
        if (retry) {
          window.location.href = `/${locale}/profile/inbox?convo=${retry.id}`;
          return;
        }
      }

      // Fallback: navigate to inbox even if conversation creation failed
      window.location.href = `/${locale}/profile/inbox`;
    } catch {
      // Fallback: navigate to inbox on error
      window.location.href = `/${locale}/profile/inbox`;
    }
  }, [claimed, user, venueId, locale, setShowAuthModal]);

  const icon = (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );

  // Unclaimed: show faded button with tooltip (hover on desktop, tap on mobile)
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTip) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setShowTip(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showTip]);

  if (!claimed) {
    return (
      <div ref={tipRef} className="relative group/msg inline-flex">
        <button
          type="button"
          onClick={() => setShowTip(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-600/30 bg-zinc-700/10 text-zinc-500 text-xs font-semibold opacity-50"
          aria-label={t('messageVenueDisabledLabel')}
        >
          {icon}
          <span className="hidden sm:inline">{t('messageVenue')}</span>
        </button>
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 text-center transition-opacity duration-200 z-50 shadow-lg ${showTip ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover/msg:opacity-100'}`}>
          {t('messageVenueDisabled')}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-700" />
        </div>
      </div>
    );
  }

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
        icon
      )}
      <span className={label ? '' : 'hidden sm:inline'}>{label || t('messageVenue')}</span>
    </button>
  );
}
