'use client';

import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface ContactArtistButtonProps {
  artistId: string;
  artistName: string;
}

export default function ContactArtistButton({ artistId, artistName }: ContactArtistButtonProps) {
  const t = useTranslations('artistStudio');
  const locale = useLocale();
  const router = useRouter();
  const { user, profile, setShowAuthModal } = useAuth();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClick = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Don't allow artist to message themselves
    if (profile?.claimed_artist_ids?.includes(artistId)) return;
    setOpen(true);
  }, [user, profile, artistId, setShowAuthModal]);

  const handleSend = useCallback(async () => {
    if (!user || !message.trim() || sending) return;
    setSending(true);

    const supabase = createClient();

    // Check if conversation already exists
    let { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('artist_id', artistId)
      .eq('fan_user_id', user.id)
      .single();

    // Create conversation if doesn't exist
    if (!convo) {
      const { data: newConvo } = await supabase
        .from('conversations')
        .insert({
          artist_id: artistId,
          fan_user_id: user.id,
        })
        .select('id')
        .single();
      convo = newConvo;
    }

    if (!convo) {
      setSending(false);
      return;
    }

    // Send message
    await supabase.from('messages').insert({
      conversation_id: convo.id,
      sender_id: user.id,
      body: message.trim(),
    });

    // Update last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convo.id);

    setSending(false);
    setSent(true);
    setMessage('');

    // Auto-close after 2s
    setTimeout(() => {
      setOpen(false);
      setSent(false);
    }, 2000);
  }, [user, artistId, message, sending]);

  // Hide for artist themselves
  if (profile?.claimed_artist_ids?.includes(artistId)) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/30 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>{t('contactArtist')}</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !sending && setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold">{t('messageSent')}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('messageSentDesc')}</p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-bold">{t('contactArtistTitle', { name: artistName })}</h3>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{t('contactArtistHint')}</p>
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  autoFocus
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors resize-none"
                  placeholder={t('contactArtistPlaceholder')}
                />

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    className="px-5 py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                    ) : (
                      t('send')
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
