'use client';

import { useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';

interface EpkDownloadButtonProps {
  artistId: string;
}

const ROLE_OPTIONS = [
  { value: 'venue', icon: '🏠', labelKey: 'epkRoleVenue' },
  { value: 'media', icon: '📰', labelKey: 'epkRoleMedia' },
  { value: 'promoter', icon: '🎪', labelKey: 'epkRolePromoter' },
  { value: 'musician', icon: '🎵', labelKey: 'epkRoleMusician' },
  { value: 'other', icon: '👤', labelKey: 'epkRoleOther' },
] as const;

export default function EpkDownloadButton({ artistId }: EpkDownloadButtonProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestRole, setGuestRole] = useState('');

  const triggerDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = `/api/artist/epk/public?artistId=${artistId}&locale=${locale}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [artistId]);

  const logDownload = useCallback(async (opts?: { guestName?: string; guestEmail?: string; guestRole?: string }) => {
    try {
      await fetch('/api/artist/epk/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          guestName: opts?.guestName || undefined,
          guestEmail: opts?.guestEmail || undefined,
          guestRole: opts?.guestRole || undefined,
        }),
      });
    } catch {
      // Non-blocking — download still works
    }
  }, [artistId]);

  const handleClick = useCallback(() => {
    if (user) {
      // Logged-in: download immediately + log
      setDownloading(true);
      triggerDownload();
      logDownload().finally(() => setDownloading(false));
    } else {
      // Guest: show optional contact form
      setShowModal(true);
    }
  }, [user, triggerDownload, logDownload]);

  const handleGuestDownload = useCallback(async () => {
    setDownloading(true);
    triggerDownload();
    await logDownload({
      guestName: guestName.trim() || undefined,
      guestEmail: guestEmail.trim() || undefined,
      guestRole: guestRole || undefined,
    });
    setDownloading(false);
    setShowModal(false);
    setGuestName('');
    setGuestEmail('');
    setGuestRole('');
  }, [triggerDownload, logDownload, guestName, guestEmail, guestRole]);

  const handleSkip = useCallback(() => {
    triggerDownload();
    logDownload();
    setShowModal(false);
  }, [triggerDownload, logDownload]);

  const downloadIcon = (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  return (
    <>
      <button
        onClick={handleClick}
        disabled={downloading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-2 rounded-full border border-[var(--border)] text-[var(--muted-foreground)] hover:border-gold/30 hover:text-gold transition-colors disabled:opacity-50"
        title={t('downloadEpk')}
      >
        {downloading ? (
          <div className="w-3.5 h-3.5 border border-gold/30 border-t-gold rounded-full animate-spin" />
        ) : (
          downloadIcon
        )}
        EPK
      </button>

      {/* Guest contact form modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />
          <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="font-serif text-lg font-bold mb-1">{t('epkContactTitle')}</h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-5">
              {t('epkContactSubtitle')}
            </p>

            {/* Name */}
            <label className="block mb-3">
              <span className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('epkContactName')}</span>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t('epkContactNamePlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:border-gold/40 focus:outline-none transition-colors"
              />
            </label>

            {/* Email */}
            <label className="block mb-3">
              <span className="text-xs text-[var(--muted-foreground)] mb-1 block">{t('epkContactEmail')}</span>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder={t('epkContactEmailPlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:border-gold/40 focus:outline-none transition-colors"
              />
            </label>

            {/* Role */}
            <div className="mb-5">
              <span className="text-xs text-[var(--muted-foreground)] mb-2 block">{t('epkContactRole')}</span>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGuestRole(guestRole === opt.value ? '' : opt.value)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      guestRole === opt.value
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-gold/20'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    {t(opt.labelKey as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={handleGuestDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold/90 hover:bg-gold text-black font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                downloadIcon
              )}
              {t('epkDownloadNow')}
            </button>

            {/* Skip link */}
            <button
              onClick={handleSkip}
              className="mt-3 w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-1"
            >
              {t('epkSkipDownload')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
