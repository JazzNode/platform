'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useVenueReviews } from './VenueReviewsProvider';
import { useTranslations } from 'next-intl';

const MAX_CHARS = 200;

function StarInput({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1.5 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-1 transition-all duration-150 hover:scale-125 active:scale-95"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={(hover || value) >= star ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className={`transition-colors duration-150 ${(hover || value) >= star ? 'text-gold drop-shadow-[0_0_6px_rgba(200,168,78,0.4)]' : 'text-[#6A6560] hover:text-[#8A8578]'}`}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

interface VenueReviewFormProps {
  /** When true, stars are shown inline as a CTA (empty state). Clicking a star opens the full form. */
  mode: 'cta' | 'button';
  onFormOpen?: () => void;
  onFormClose?: () => void;
}

export default function VenueReviewForm({ mode, onFormOpen, onFormClose }: VenueReviewFormProps) {
  const { user, setShowAuthModal } = useAuth();
  const { userReview, submitReview, deleteReview } = useVenueReviews();
  const t = useTranslations('reviews');

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleStarClick = (star: number) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!showForm) {
      // Opening form — pre-populate if editing
      if (userReview) {
        setRating(userReview.rating);
        setText(userReview.text || '');
        setIsAnonymous(userReview.is_anonymous);
      } else {
        setRating(star);
        setText('');
        setIsAnonymous(false);
      }
      setShowForm(true);
      onFormOpen?.();
    } else {
      setRating(star);
    }
  };

  const handleOpenForm = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (userReview) {
      setRating(userReview.rating);
      setText(userReview.text || '');
      setIsAnonymous(userReview.is_anonymous);
    } else {
      setRating(0);
      setText('');
      setIsAnonymous(false);
    }
    setShowForm(true);
    onFormOpen?.();
  };

  const handleClose = () => {
    setShowForm(false);
    setConfirmDelete(false);
    onFormClose?.();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSaving(true);
    await submitReview(rating, text.trim() || null, isAnonymous);
    setSaving(false);
    handleClose();
  };

  const handleDelete = async () => {
    setSaving(true);
    await deleteReview();
    setSaving(false);
    handleClose();
    setRating(0);
    setText('');
    setIsAnonymous(false);
  };

  // CTA mode: show large stars inline (empty state)
  if (mode === 'cta' && !showForm) {
    return (
      <div className="flex flex-col items-center py-6">
        <StarInput value={userReview?.rating ?? 0} onChange={handleStarClick} size={36} />
        <p className="text-sm text-[#8A8578] mt-3">{t('emptyCta')}</p>
      </div>
    );
  }

  // Button mode: small button trigger (when reviews exist)
  if (mode === 'button' && !showForm) {
    return (
      <button
        onClick={handleOpenForm}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gold/10 text-gold border border-gold/25 hover:bg-gold/20 hover:border-gold/40 transition-all duration-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {userReview ? t('editReview') : t('writeReview')}
      </button>
    );
  }

  // Expanded form
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-gold/15 p-6 space-y-5 mt-4">
      {/* Star rating - centered */}
      <div className="flex flex-col items-center">
        <label className="text-xs text-[#8A8578] uppercase tracking-widest mb-3 block">{t('ratingLabel')}</label>
        <StarInput value={rating} onChange={setRating} size={36} />
      </div>

      {/* Text */}
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          maxLength={MAX_CHARS}
          placeholder={t('textPlaceholder')}
          className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-4 text-sm resize-none focus:outline-none focus:border-gold/50 transition-colors placeholder:text-[#6A6560]"
        />
        <div className="text-xs text-[#6A6560] text-right mt-1">
          {t('charsRemaining', { count: MAX_CHARS - text.length })}
        </div>
      </div>

      {/* Anonymous toggle + Actions row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] accent-gold"
          />
          <span className="text-sm text-[#8A8578]">{t('anonymousLabel')}</span>
        </label>

        <div className="flex items-center gap-3">
          {userReview && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              {t('deleteReview')}
            </button>
          )}
          {confirmDelete && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">{t('deleteConfirm')}</span>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="text-xs text-red-400 font-medium hover:text-red-300"
              >
                {t('confirmYes') || 'Yes'}
              </button>
            </div>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm text-[#8A8578] hover:text-white transition-colors"
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || rating === 0}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gold text-[#1A1816] hover:bg-[#D4B85A] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '...' : userReview ? t('updateReview') : t('submitReview')}
          </button>
        </div>
      </div>
    </div>
  );
}
