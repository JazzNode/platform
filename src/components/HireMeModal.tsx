'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface HireMeModalProps {
  artistId: string;
  artistName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function HireMeModal({ artistId, artistName, isOpen, onClose }: HireMeModalProps) {
  const t = useTranslations('artistStudio');
  const { user, setShowAuthModal } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    event_type: '',
    event_date: '',
    venue: '',
    budget_range: '',
    message: '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!form.name || !form.email) return;

    setSending(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch('/api/artist/booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ artistId, ...form }),
    });

    if (res.ok) {
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onClose();
        setForm({ name: '', email: '', phone: '', event_type: '', event_date: '', venue: '', budget_range: '', message: '' });
      }, 2000);
    }
    setSending(false);
  };

  const inputClass = 'w-full bg-[#1A1A1A] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0F0F0F] border border-[var(--border)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl font-bold">{t('hireMe')} — {artistName}</h2>
          <button onClick={onClose} className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <p className="text-[var(--color-gold)] font-semibold">{t('inquirySent')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder={t('inquiryName')} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              <input type="email" placeholder={t('inquiryEmail')} value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="tel" placeholder={t('inquiryPhone')} value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              <input type="text" placeholder={t('inquiryEventType')} value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" placeholder={t('inquiryEventDate')} value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={inputClass} />
              <input type="text" placeholder={t('inquiryVenue')} value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputClass} />
            </div>
            <input type="text" placeholder={t('inquiryBudget')} value={form.budget_range}
              onChange={(e) => setForm({ ...form, budget_range: e.target.value })} className={inputClass} />
            <textarea placeholder={t('inquiryMessage')} value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })} className={`${inputClass} min-h-[80px] resize-y`} />

            <button
              onClick={handleSubmit}
              disabled={sending || !form.name || !form.email}
              className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? '...' : t('submitInquiry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
