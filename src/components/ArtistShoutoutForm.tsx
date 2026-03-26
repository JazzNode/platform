'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useArtistShoutouts } from './ArtistShoutoutsProvider';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';

const MAX_CHARS = 500;

const TAG_KEYS = [
  'great_musicianship',
  'amazing_live',
  'great_collaborator',
  'creative',
  'great_teacher',
  'inspiring',
  'professional',
  'reliable',
  'beautiful_tone',
] as const;

const TAG_EMOJIS: Record<string, string> = {
  great_musicianship: '\uD83C\uDFB5',
  amazing_live: '\uD83D\uDD25',
  great_collaborator: '\uD83E\uDD1D',
  creative: '\uD83D\uDCA1',
  great_teacher: '\uD83C\uDF93',
  inspiring: '\u2728',
  professional: '\uD83C\uDFAF',
  reliable: '\uD83D\uDCAA',
  beautiful_tone: '\uD83C\uDFB6',
};

/* ── Identity types ── */

interface IdentityOption {
  role: string | null;
  artistId: string | null;
  venueId: string | null;
  label: string;
  dotColor: string;
}

const ROLE_DOT_COLORS: Record<string, string> = {
  member: 'bg-[var(--muted-foreground)]',
  admin: 'bg-gold',
  venue_manager: 'bg-emerald-400',
  artist: 'bg-purple-400',
};

export default function ArtistShoutoutForm({ artistId }: { artistId: string }) {
  const { user, profile, setShowAuthModal } = useAuth();
  const { submitShoutout } = useArtistShoutouts();
  const t = useTranslations('shoutouts');
  const tReviews = useTranslations('reviews');

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
        venueId: null,
        label: tReviews('identity.member'),
        dotColor: ROLE_DOT_COLORS.member,
      });

      // Admin / HQ
      if (profile.role === 'admin' || profile.role === 'owner') {
        opts.push({
          role: 'admin',
          artistId: null,
          venueId: null,
          label: tReviews('identity.admin'),
          dotColor: ROLE_DOT_COLORS.admin,
        });
      }

      // Venue manager — can post as any of their claimed venues
      if (profile.claimed_venue_ids?.length) {
        const supabase = createClient();
        const { data: venues } = await supabase
          .from('venues')
          .select('venue_id, display_name, name_local, name_en')
          .in('venue_id', profile.claimed_venue_ids);
        if (venues) {
          venues.forEach((v) => {
            opts.push({
              role: 'venue_manager',
              artistId: null,
              venueId: v.venue_id,
              label: v.display_name || v.name_local || v.name_en || v.venue_id,
              dotColor: ROLE_DOT_COLORS.venue_manager,
            });
          });
        }
      }

      // Artists — fetch names (exclude the artist being shoutout'd)
      if (profile.claimed_artist_ids?.length) {
        const otherArtists = profile.claimed_artist_ids.filter((id: string) => id !== artistId);
        if (otherArtists.length > 0) {
          const supabase = createClient();
          const { data } = await supabase
            .from('artists')
            .select('artist_id, display_name, name_local, name_en')
            .in('artist_id', otherArtists);
          if (data) {
            data.forEach((a) => {
              opts.push({
                role: 'artist',
                artistId: a.artist_id,
                venueId: null,
                label: a.display_name || a.name_local || a.name_en || a.artist_id,
                dotColor: ROLE_DOT_COLORS.artist,
              });
            });
          }
        }
      }

      setIdentities(opts);
      setSelectedIdentity(opts[0]);
    })();
  }, [showForm, profile, artistId, tReviews]);

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

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('artistId', artistId);
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
    const senderArtistId = isAnonymous ? null : (selectedIdentity?.artistId || null);
    const senderVenueId = isAnonymous ? null : (selectedIdentity?.venueId || null);
    await submitShoutout(text.trim() || null, selectedTags, imageUrl, isAnonymous, role, senderArtistId, senderVenueId);
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
            {t('textPlaceholder')}
          </span>
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
          {tReviews('tagsLabel')}
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
          {tReviews('charsRemaining', { count: MAX_CHARS - text.length })}
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
          {tReviews('addPhoto')}
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
            <span className="text-sm text-[var(--muted-foreground)]">{tReviews('anonymousLabel')}</span>
          </label>

          {/* Identity selector */}
          {!isAnonymous && hasMultipleIdentities && selectedIdentity && (
            <div className="relative" ref={identityRef}>
              <button
                type="button"
                onClick={() => setShowIdentityMenu(!showIdentityMenu)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--border)] hover:border-gold/30 bg-[var(--background)] transition-all duration-150"
              >
                <span className={`w-2 h-2 rounded-full ${selectedIdentity.dotColor}`} />
                <span className="text-[var(--foreground)]">
                  {selectedIdentity.role === null ? tReviews('identity.member') : selectedIdentity.label}
                </span>
                {selectedIdentity.role === null && (
                  <span className="text-[var(--muted-foreground)]/50 text-[10px]">
                    {tReviews('identity.hint')}
                  </span>
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted-foreground)]">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showIdentityMenu && (
                <div className="absolute left-0 bottom-full mb-1.5 min-w-[180px] bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest">
                    {tReviews('identity.label')}
                  </div>
                  {identities.map((identity, i) => {
                    const isSelected =
                      identity.role === selectedIdentity.role &&
                      identity.artistId === selectedIdentity.artistId &&
                      identity.venueId === selectedIdentity.venueId;
                    return (
                      <button
                        key={`${identity.role}-${identity.artistId || identity.venueId || i}`}
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
            {tReviews('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploading || (!text.trim() && selectedTags.length === 0 && !imageUrl)}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gold text-[#1A1816] hover:bg-[#D4B85A] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? '...' : t('submitShoutout')}
          </button>
        </div>
      </div>
    </div>
  );
}
