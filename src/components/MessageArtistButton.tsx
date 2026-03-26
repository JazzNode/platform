'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import MessageIntentSelector from '@/components/MessageIntentSelector';

interface MessageArtistButtonProps {
  artistId: string;
  claimed?: boolean;
  availableForHire?: boolean;
  acceptingStudents?: boolean;
  artistName?: string;
}

export default function MessageArtistButton({
  artistId,
  claimed,
  availableForHire = false,
  acceptingStudents = false,
  artistName = '',
}: MessageArtistButtonProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const { user, setShowAuthModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showIntentSelector, setShowIntentSelector] = useState(false);

  const handleClick = useCallback(async () => {
    if (!claimed) return;
    if (!user) {
      setShowAuthModal?.(true);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // Find existing artist_fan conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'artist_fan')
        .eq('artist_id', artistId)
        .eq('fan_user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Existing conversation — go directly to inbox
        window.location.href = `/${locale}/profile/inbox?convo=${existing.id}`;
        return;
      }

      // No existing conversation — show intent selector
      setLoading(false);
      setShowIntentSelector(true);
    } catch {
      setLoading(false);
      // Fallback: navigate to inbox on error
      window.location.href = `/${locale}/profile/inbox`;
    }
  }, [claimed, user, artistId, locale, setShowAuthModal]);

  const handleIntentSelect = useCallback(async (intentType: string | null, prefillMessage: string) => {
    if (!user) return;

    setShowIntentSelector(false);
    setLoading(true);

    try {
      const supabase = createClient();

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({
          type: 'artist_fan',
          artist_id: artistId,
          fan_user_id: user.id,
        })
        .select('id')
        .single();

      let convoId = newConvo?.id;

      // Insert failed (e.g. unique constraint) — retry finding it
      if (error && !convoId) {
        const { data: retry } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'artist_fan')
          .eq('artist_id', artistId)
          .eq('fan_user_id', user.id)
          .maybeSingle();
        convoId = retry?.id;
      }

      // Create first message with intent_type if we have a conversation
      if (convoId && prefillMessage) {
        await supabase.from('messages').insert({
          conversation_id: convoId,
          sender_id: user.id,
          body: prefillMessage,
          ...(intentType ? { intent_type: intentType } : {}),
        });
      }

      if (convoId) {
        window.location.href = `/${locale}/profile/inbox?convo=${convoId}`;
      } else {
        window.location.href = `/${locale}/profile/inbox`;
      }
    } catch {
      window.location.href = `/${locale}/profile/inbox`;
    }
  }, [user, artistId, locale]);

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
          aria-label={t('messageArtistDisabledLabel')}
        >
          {icon}
          <span className="hidden sm:inline">{t('messageArtist')}</span>
        </button>
        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 text-center transition-opacity duration-200 z-50 shadow-lg ${showTip ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover/msg:opacity-100'}`}>
          {t('messageArtistDisabled')}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-700" />
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
        title={t('messageArtist')}
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        ) : (
          icon
        )}
        <span className="hidden sm:inline">{t('messageArtist')}</span>
      </button>

      <MessageIntentSelector
        artistName={artistName}
        availableForHire={availableForHire}
        acceptingStudents={acceptingStudents}
        isOpen={showIntentSelector}
        onSelect={handleIntentSelect}
        onClose={() => setShowIntentSelector(false)}
      />
    </>
  );
}
