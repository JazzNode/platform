'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useVenueReviews } from './VenueReviewsProvider';
import { useTranslations } from 'next-intl';

const MAX_CHARS = 200;

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={(hover || value) >= star ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className={(hover || value) >= star ? 'text-gold' : 'text-[#6A6560]'}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function VenueReviewForm() {
  const { user, setShowAuthModal } = useAuth();
  const { userReview, submitReview } = useVenueReviews();
  const t = useTranslations('reviews');

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Pre-populate when userReview exists and form is opened
  useEffect(() => {
    if (userReview && showForm) {
      setRating(userReview.rating);
      setText(userReview.text || '');
      setIsAnonymous(userReview.is_anonymous);
    }
  }, [userReview, showForm]);

  const { deleteReview } = useVenueReviews();

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
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSaving(true);
    await submitReview(rating, text.trim() || null, isAnonymous);
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    await deleteReview();
    setSaving(false);
    setShowForm(false);
    setConfirmDelete(false);
    setRating(0);
    setText('');
    setIsAnonymous(false);
  };

  if (!showForm) {
    return (
      <button
        onClick={handleOpenForm}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[#8A8578] hover:text-gold hover:border-gold/30 transition-all duration-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        {userReview ? t('editReview') : t('writeReview')}
      </button>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 space-y-4">
      {/* Star rating */}
      <div>
        <label className="text-xs text-[#8A8578] uppercase tracking-widest mb-2 block">{t('ratingLabel')}</label>
        <StarInput value={rating} onChange={setRating} />
      </div>

      {/* Text */}
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          maxLength={MAX_CHARS}
          placeholder={t('textPlaceholder')}
          className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-3 text-sm resize-none focus:outline-none focus:border-gold/50 transition-colors placeholder:text-[#6A6560]"
        />
        <div className="text-xs text-[#6A6560] text-right mt-1">
          {t('charsRemaining', { count: MAX_CHARS - text.length })}
        </div>
      </div>

      {/* Anonymous toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => setIsAnonymous(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--border)] accent-gold"
        />
        <span className="text-sm text-[#8A8578]">{t('anonymousLabel')}</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={saving || rating === 0}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? '...' : userReview ? t('updateReview') : t('submitReview')}
        </button>
        <button
          onClick={() => { setShowForm(false); setConfirmDelete(false); }}
          className="px-4 py-2 rounded-xl text-sm text-[#8A8578] hover:text-white transition-colors"
        >
          {t('cancel') || 'Cancel'}
        </button>
        {userReview && !confirmDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="ml-auto text-xs text-red-400/70 hover:text-red-400 transition-colors"
          >
            {t('deleteReview')}
          </button>
        )}
        {confirmDelete && (
          <div className="ml-auto flex items-center gap-2">
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
      </div>
    </div>
  );
}
