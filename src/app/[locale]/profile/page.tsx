'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import AvatarCropModal from '@/components/AvatarCropModal';
import FadeUp from '@/components/animations/FadeUp';
import BadgeShowcase from '@/components/BadgeShowcase';
import PushNotificationToggle from '@/components/PushNotificationToggle';

interface MyReview {
  id: string;
  venue_id: string;
  venue_name: string | null;
  text: string | null;
  tags: string[] | null;
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
}

function MyReviews() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('venue_comments')
      .select('id, venue_id, text, tags, image_url, is_anonymous, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) { setReviews([]); setLoading(false); return; }
        // Fetch venue names from Airtable venues cache via existing helper isn't available client-side,
        // so we just display the venue_id as link. Venue pages will show the name.
        setReviews(data.map((r) => ({ ...r, venue_name: null })));
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="py-8 text-center">
        <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-bold flex items-center gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        {t('myReviews')}
      </h2>

      {reviews.length === 0 ? (
        <p className="text-[var(--muted-foreground)] text-sm">{t('noMyReviews')}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const dateStr = new Date(review.created_at).toLocaleDateString(
              locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' },
            );
            return (
              <Link
                key={review.id}
                href={`/${locale}/venues/${review.venue_id}`}
                className="block bg-[var(--background)] p-4 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/30 transition-colors group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium group-hover:text-[var(--color-gold)] transition-colors">
                      {t('viewVenue')} →
                    </span>
                    {review.is_anonymous && (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md bg-[var(--border)]/50 text-[var(--muted-foreground)]">
                        {t('anonymous')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{dateStr}</span>
                </div>
                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {review.tags.map((tag: string) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)]/80">
                        {tag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
                {review.text && (
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{review.text}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
      setIsPublic(profile.is_public ?? true);
    }
  }, [profile]);

  // Layout already handles auth redirect
  const validateUsername = (value: string) => {
    if (!value) return true; // username is optional
    return /^[a-z0-9_]{3,30}$/.test(value);
  };

  const handleSave = useCallback(async () => {
    if (!user) return;

    if (username && !validateUsername(username)) {
      setUsernameError(t('usernameInvalid'));
      return;
    }

    setSaving(true);
    setSaved(false);
    setUsernameError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        username: username || null,
        bio: bio || null,
        website: website || null,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      if (error.code === '23505') {
        setUsernameError(t('usernameTaken'));
      }
    } else {
      setSaved(true);
      await refreshProfile();
      setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
  }, [user, displayName, username, bio, website, isPublic, refreshProfile, t]);

  const handleAvatarClick = useCallback(() => {
    if (!uploading) fileInputRef.current?.click();
  }, [uploading]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleCropClose = useCallback(() => {
    setCropModalOpen(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
  }, [cropImageSrc]);

  const handleCropComplete = useCallback(async (blob: Blob) => {
    setCropModalOpen(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }

    const previewUrl = URL.createObjectURL(blob);
    setAvatarPreview(previewUrl);
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'avatar.webp');

      const res = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      await refreshProfile();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setAvatarPreview(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploading(false);
    }
  }, [cropImageSrc, refreshProfile]);

  if (loading || !user) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const avatarUrl = avatarPreview || profile?.avatar_url;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <FadeUp>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('settings')}</h1>
      </FadeUp>

      {/* Badge Showcase */}
      <FadeUp>
        <BadgeShowcase />
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-8">
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <div
                className="w-28 h-28 rounded-full overflow-hidden border border-[var(--border)] cursor-pointer group/avatar shrink-0"
                onClick={handleAvatarClick}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill className="object-cover" sizes="112px" />
                ) : (
                  <div className="w-full h-full bg-[var(--background)] flex items-center justify-center text-3xl text-[var(--muted-foreground)]">
                    {user.email?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadError && (
                <p className="text-xs text-red-400 mt-2 text-center">{uploadError}</p>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-[var(--muted-foreground)]">{t('avatarUpload')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">JPG, PNG, WebP · Max 5MB</p>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('displayName')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                placeholder={t('displayNamePlaceholder')}
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('username')}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]/60">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setUsernameError(null);
                  }}
                  maxLength={30}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                  placeholder={t('usernamePlaceholder')}
                />
              </div>
              {usernameError && (
                <p className="text-xs text-red-400 mt-1.5">{usernameError}</p>
              )}
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-1.5">{t('usernameHint')}</p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('bio')}
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors resize-none"
                placeholder={t('bioPlaceholder')}
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('website')}
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                placeholder="https://"
              />
            </div>
          </div>

          {/* Profile Visibility */}
          <div className="flex items-center justify-between py-4 border-t border-[var(--border)]">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{t('publicProfile')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-0.5">{t('publicProfileHint')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/50 ${isPublic ? 'bg-[var(--color-gold)]' : 'bg-[var(--border)]'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${isPublic ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between py-4 border-t border-[var(--border)]">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{t('pushNotifications')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-0.5">{t('pushNotificationsHint')}</p>
            </div>
            <PushNotificationToggle />
          </div>

          {/* Save button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-magnetic px-8 py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
              ) : saved ? (
                t('saved')
              ) : (
                t('save')
              )}
            </button>

            {profile?.username && (
              <a
                href={`/${locale}/user/${profile.username}`}
                className="text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors link-lift"
              >
                {t('viewPublicProfile')} →
              </a>
            )}
          </div>
        </div>
      </FadeUp>

      {/* My Reviews */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
          <MyReviews />
        </div>
      </FadeUp>

      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          open={cropModalOpen}
          onClose={handleCropClose}
          onComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
