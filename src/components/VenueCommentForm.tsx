'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useVenueComments } from './VenueCommentsProvider';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';

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

/* ── Identity types ── */

interface IdentityOption {
  /** null = member, 'admin', 'venue_manager', or 'artist' */
  role: string | null;
  /** Only for artist identities — the artist_id */
  artistId: string | null;
  /** Display label */
  label: string;
  /** Dot color class */
  dotColor: string;
}

const ROLE_DOT_COLORS: Record<string, string> = {
  member: 'bg-[var(--muted-foreground)]',
  admin: 'bg-gold',
  venue_manager: 'bg-emerald-400',
  artist: 'bg-purple-400',
};

export default function VenueCommentForm({ venueId }: { venueId: string }) {
  const { user, profile, setShowAuthModal } = useAuth();
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

  // Identity selector state
  const [selectedIdentity, setSelectedIdentity] = useState<IdentityOption | null>(null);
  const [identities, setIdentities] = useState<IdentityOption[]>([]);
  const [showIdentityMenu, setShowIdentityMenu] = useState(false);
  const identityRef = useRef<HTMLDivElement>(null);

  // Build identity options when form opens
  useEffect(() => {
    if (!showForm || !profile) return;

    (async () => {
      const opts: IdentityOption[] = [];

      // Member is always first (default)
      opts.push({
        role: null,
        artistId: null,
        label: t('identity.member'),
        dotColor: ROLE_DOT_COLORS.member,
      });

      // Admin / HQ
      if (profile.role === 'admin' || profile.role === 'owner') {
        opts.push({
          role: 'admin',
          artistId: null,
          label: t('identity.admin'),
          dotColor: ROLE_DOT_COLORS.admin,
        });
      }

      // Venue manager for this venue
      if (profile.claimed_venue_ids?.includes(venueId)) {
        opts.push({
          role: 'venue_manager',
          artistId: null,
          label: t('identity.venue_manager'),
          dotColor: ROLE_DOT_COLORS.venue_manager,
        });
      }

      // Artists — fetch names and include in initial set
      if (profile.claimed_artist_ids?.length) {
        const supabase = createClient();
        const { data } = await supabase
          .from('artists')
          .select('artist_id, display_name, name_local, name_en')
          .in('artist_id', profile.claimed_artist_ids);
        if (data) {
          data.forEach((a) => {
            opts.push({
              role: 'artist',
              artistId: a.artist_id,
              label: a.display_name || a.name_local || a.name_en || a.artist_id,
              dotColor: ROLE_DOT_COLORS.artist,
            });
          });
        }
      }

      setIdentities(opts);
      setSelectedIdentity(opts[0]);
    })();
  }, [showForm, profile, venueId, t]);

  // Close identity menu on outside click
  useEffect(() => {
    if (!showIdentityMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (identityRef.current && !identityRef.current.contains(e.target as Node)) {
        setShowIdentityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showIdentityMenu]);

  const handleOpen = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setText('');
    setSelectedTags([]);
    setImageUrl(null);
    setImagePreview(null);
    setIsAnonymous(false);
    setSelectedIdentity(null);
    setShowIdentityMenu(false);
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
    const role = isAnonymous ? null : (selectedIdentity?.role || null);
    const artistId = isAnonymous ? null : (selectedIdentity?.artistId || null);
    await submitComment(text.trim() || null, selectedTags, imageUrl, isAnonymous, role, artistId);
    setSaving(false);
    handleClose();
  };

  if (!showForm) {
    return (
      <button
        onClick={handleOpen}
        className="group w-full text-left rounded-2xl border border-[var(--border)] hover:border-gold/30 bg-[var(--card)] px-4 py-3 transition-all duration-200 cursor-text"
      >
        <div className="relative overflow-hidden">
          <span className="text-sm text-[var(--muted-foreground)] pointer-events-none">
            {t('inputPrompt')}
          </span>
          {/* Right-side fadeout gradient */}
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--card)] to-transparent pointer-events-none" />
        </div>
      </button>
    );
  }

  const hasMultipleIdentities = identities.length > 1;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-gold/15 p-5 space-y-4">
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

      {/* Identity selector + Anonymous toggle + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] accent-gold"
            />
            <span className="text-sm text-[var(--muted-foreground)]">{t('anonymousLabel')}</span>
          </label>

          {/* Identity selector — only show when not anonymous and has multiple identities */}
          {!isAnonymous && hasMultipleIdentities && selectedIdentity && (
            <div className="relative" ref={identityRef}>
              <button
                type="button"
                onClick={() => setShowIdentityMenu(!showIdentityMenu)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--border)] hover:border-gold/30 bg-[var(--background)] transition-all duration-150"
              >
                <span className={`w-2 h-2 rounded-full ${selectedIdentity.dotColor}`} />
                <span className="text-[var(--foreground)]">
                  {selectedIdentity.role === null ? t('identity.member') : selectedIdentity.label}
                </span>
                {/* Hint text for member default */}
                {selectedIdentity.role === null && (
                  <span className="text-[var(--muted-foreground)]/50 text-[10px]">
                    {t('identity.hint')}
                  </span>
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)]">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showIdentityMenu && (
                <div className="absolute left-0 bottom-full mb-1.5 min-w-[180px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">
                    {t('identity.label')}
                  </div>
                  {identities.map((identity, i) => {
                    const isSelected =
                      identity.role === selectedIdentity.role &&
                      identity.artistId === selectedIdentity.artistId;
                    return (
                      <button
                        key={`${identity.role}-${identity.artistId || i}`}
                        type="button"
                        onClick={() => {
                          setSelectedIdentity(identity);
                          setShowIdentityMenu(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'bg-gold/10 text-[var(--foreground)]'
                            : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${identity.dotColor}`} />
                        <span className="truncate">{identity.label}</span>
                        {isSelected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-gold shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

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
