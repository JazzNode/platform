'use client';

import { useState, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useVenueComments } from './VenueCommentsProvider';
import { useTranslations } from 'next-intl';

const MAX_CHARS = 500;

const TAG_KEYS = [
  'great_show',
  'great_sound',
  'great_drinks',
  'great_food',
  'easy_access',
  'easy_parking',
  'friendly_staff',
  'love_vibe',
] as const;

const TAG_EMOJIS: Record<string, string> = {
  great_show: '\uD83C\uDFB6',
  great_sound: '\uD83D\uDD0A',
  great_drinks: '\uD83C\uDF78',
  great_food: '\uD83C\uDF7D\uFE0F',
  easy_access: '\uD83D\uDE8B',
  easy_parking: '\uD83C\uDD7F\uFE0F',
  friendly_staff: '\uD83D\uDE0A',
  love_vibe: '\u2728',
};

interface VenueCommentFormProps {
  venueId: string;
  onFormOpen?: () => void;
  onFormClose?: () => void;
}

export default function VenueCommentForm({ venueId, onFormOpen, onFormClose }: VenueCommentFormProps) {
  const { user, setShowAuthModal } = useAuth();
  const { submitComment } = useVenueComments();
  const t = useTranslations('reviews');

  const [text, setText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowForm(true);
    onFormOpen?.();
  };

  const handleClose = () => {
    setShowForm(false);
    setText('');
    setSelectedTags([]);
    setImageUrl(null);
    setImagePreview(null);
    setIsAnonymous(false);
    onFormClose?.();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('venueId', venueId);
      const res = await fetch('/api/venue/upload-comment-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      } else {
        setImagePreview(null);
      }
    } catch {
      setImagePreview(null);
    }
    setUploading(false);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!text.trim() && selectedTags.length === 0 && !imageUrl) return;
    setSaving(true);
    await submitComment(text.trim() || null, selectedTags, imageUrl, isAnonymous);
    setSaving(false);
    handleClose();
  };

  if (!showForm) {
    return (
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gold/10 text-gold border border-gold/25 hover:bg-gold/20 hover:border-gold/40 transition-all duration-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {t('writeComment')}
      </button>
    );
  }

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-gold/15 p-5 space-y-4 mt-4">
      {/* Tag chips */}
      <div>
        <label className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest mb-2.5 block">
          {t('tagsLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_KEYS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  selected
                    ? 'bg-gold/20 text-gold border border-gold/40'
                    : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent hover:border-[var(--border)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{TAG_EMOJIS[tag]}</span>
                <span>{t(`tags.${tag}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text input */}
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
          rows={3}
          maxLength={MAX_CHARS}
          placeholder={t('textPlaceholder')}
          className="w-full rounded-xl bg-[var(--background)] border border-[var(--border)] p-4 text-sm resize-none focus:outline-none focus:border-gold/50 transition-colors placeholder:text-[var(--muted-foreground)]"
        />
        <div className="text-xs text-[var(--muted-foreground)] text-right mt-1">
          {t('charsRemaining', { count: MAX_CHARS - text.length })}
        </div>
      </div>

      {/* Image upload */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--muted-foreground)] bg-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors disabled:opacity-40"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
          {t('addPhoto')}
        </button>

        {imagePreview && (
          <div className="relative">
            <img
              src={imagePreview}
              alt=""
              className="w-16 h-16 rounded-lg object-cover border border-[var(--border)]"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-400"
            >
              &times;
            </button>
          </div>
        )}
      </div>

      {/* Anonymous toggle + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] accent-gold"
          />
          <span className="text-sm text-[var(--muted-foreground)]">{t('anonymousLabel')}</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading || (!text.trim() && selectedTags.length === 0 && !imageUrl)}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gold text-[#1A1816] hover:bg-[#D4B85A] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '...' : t('submitComment')}
          </button>
        </div>
      </div>
    </div>
  );
}
