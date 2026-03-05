'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const { user, profile, loading, refreshProfile, setShowAuthModal } = useAuth();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form from profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setWebsite(profile.website || '');
    }
  }, [profile]);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
      router.push('/');
    }
  }, [loading, user, router, setShowAuthModal]);

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
  }, [user, displayName, username, bio, website, refreshProfile, t]);

  const handleAvatarClick = useCallback(() => {
    if (!uploading) fileInputRef.current?.click();
  }, [uploading]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

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
      URL.revokeObjectURL(objectUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [refreshProfile]);

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
    </div>
  );
}
