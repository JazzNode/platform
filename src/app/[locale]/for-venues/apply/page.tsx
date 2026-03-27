'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';

export default function ForVenuesApplyPage() {
  const t = useTranslations('forVenues');
  const locale = useLocale();
  const { user, profile, loading, setShowAuthModal } = useAuth();

  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Owner-only gate
  if (!loading && profile && profile.role !== 'owner' && profile.role !== 'admin') {
    return null;
  }

  // Pre-fill contact info from profile
  useEffect(() => {
    if (profile) {
      setContactName(profile.display_name || '');
      setContactEmail(user?.email || '');
    }
  }, [profile, user]);

  const handleSubmit = async () => {
    if (!venueName.trim() || !contactEmail.trim() || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/venue/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueName: venueName.trim(),
          venueAddress: venueAddress.trim() || null,
          contactName: contactName.trim() || null,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit');
      }
    } catch {
      setError('Network error');
    }
    setSubmitting(false);
  };

  // Not logged in → prompt to sign up
  if (!loading && !user) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <FadeUp>
          <h1 className="font-serif text-3xl font-bold mb-4">{t('applyTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-8">{t('applyLoginRequired')}</p>
          <button
            onClick={() => setShowAuthModal?.(true)}
            className="px-8 py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            {t('signUpFirst')}
          </button>
        </FadeUp>
      </div>
    );
  }

  // Submitted confirmation
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-24 text-center">
        <FadeUp>
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="font-serif text-3xl font-bold mb-4">{t('applySuccess')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mb-8 leading-relaxed">{t('applySuccessDesc')}</p>
          <Link href={`/${locale}`} className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors">
            {t('backToHome')} →
          </Link>
        </FadeUp>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors';

  return (
    <div className="max-w-lg mx-auto py-12 sm:py-20">
      <FadeUp>
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold)] mb-3 font-bold">
            Elite — $29.99/{t('perMonth')}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">{t('applyTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{t('applySubtitle')}</p>
        </div>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-5">

          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('venueName')} *</label>
            <input type="text" value={venueName} onChange={(e) => setVenueName(e.target.value)} className={inputClass} placeholder={t('venueNamePlaceholder')} />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('venueAddress')}</label>
            <input type="text" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} className={inputClass} placeholder={t('venueAddressPlaceholder')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('contactName')}</label>
              <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('contactPhone')}</label>
              <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('contactEmailLabel')} *</label>
            <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('notesLabel')}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder={t('notesPlaceholder')} />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!venueName.trim() || !contactEmail.trim() || submitting}
            className="w-full px-8 py-3.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin mx-auto" />
            ) : (
              t('submitApplication')
            )}
          </button>

          <p className="text-[10px] text-[var(--muted-foreground)]/50 text-center leading-relaxed">
            {t('applyDisclaimer')}
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
