'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useClaims } from './ClaimsProvider';

interface ClaimModalProps {
  targetType: 'artist' | 'venue';
  targetId: string;
  targetName: string;
  onClose: () => void;
}

export default function ClaimModal({ targetType, targetId, targetName, onClose }: ClaimModalProps) {
  const t = useTranslations('claim');
  const { submitClaim } = useClaims();
  const [evidenceText, setEvidenceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceText.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    const result = await submitClaim(targetType, targetId, evidenceText.trim());

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    } else {
      setSuccess(true);
      setTimeout(onClose, 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="font-serif text-xl font-bold">{t('claimPage')}</h2>
          <button
            onClick={onClose}
            className="text-[#8A8578] hover:text-[var(--foreground)] transition-colors p-1"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <div className="text-3xl">&#10003;</div>
            <p className="text-gold font-medium">{t('claimSuccess')}</p>
            <p className="text-sm text-[#8A8578]">{t('claimSuccessDetail')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-[#8A8578]">
              {t('claimDescription', { name: targetName })}
            </p>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[#8A8578] mb-2">
                {t('claimEvidence')}
              </label>
              <textarea
                ref={textareaRef}
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder={t('claimEvidencePlaceholder')}
                className="w-full h-32 px-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[#6A6560] focus:outline-none focus:border-gold/50 resize-none transition-colors"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !evidenceText.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed bg-gold text-[#0A0A0A] hover:bg-[#E8C868]"
            >
              {submitting ? t('claimSubmitting') : t('claimSubmit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
