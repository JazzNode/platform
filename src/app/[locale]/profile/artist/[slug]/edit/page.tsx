'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface ArtistData {
  artist_id: string;
  display_name: string | null;
  name_local: string | null;
  name_en: string | null;
  website_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  instagram: string | null;
  facebook_url: string | null;
  aka: string | null;
  accepting_students: boolean;
  teaching_styles: string[] | null;
  lesson_price_range: string | null;
  teaching_description: string | null;
  available_for_hire: boolean;
  hire_categories: string[] | null;
  hire_description: string | null;
}

export default function ArtistEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistDashboard');
  const { loading } = useAuth();
  const { token } = useAdmin();

  const [slug, setSlug] = useState('');
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [fetching, setFetching] = useState(true);

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [aka, setAka] = useState('');
  const [acceptingStudents, setAcceptingStudents] = useState(false);
  const [teachingStyles, setTeachingStyles] = useState<string[]>([]);
  const [lessonPriceRange, setLessonPriceRange] = useState('');
  const [teachingDescription, setTeachingDescription] = useState('');
  const [availableForHire, setAvailableForHire] = useState(false);
  const [hireCategories, setHireCategories] = useState<string[]>([]);
  const [hireDescription, setHireDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase
      .from('artists')
      .select('artist_id, display_name, name_local, name_en, website_url, spotify_url, youtube_url, instagram, facebook_url, aka, accepting_students, teaching_styles, lesson_price_range, teaching_description, available_for_hire, hire_categories, hire_description')
      .eq('artist_id', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setArtist(data);
          setWebsiteUrl(data.website_url || '');
          setSpotifyUrl(data.spotify_url || '');
          setYoutubeUrl(data.youtube_url || '');
          setInstagram(data.instagram || '');
          setFacebookUrl(data.facebook_url || '');
          setAka(data.aka || '');
          setAcceptingStudents(data.accepting_students || false);
          setTeachingStyles(data.teaching_styles || []);
          setLessonPriceRange(data.lesson_price_range || '');
          setTeachingDescription(data.teaching_description || '');
          setAvailableForHire(data.available_for_hire || false);
          setHireCategories(data.hire_categories || []);
          setHireDescription(data.hire_description || '');
        }
        setFetching(false);
      });
  }, [slug]);

  const handleSave = useCallback(async () => {
    if (!token || !slug) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch('/api/artist/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          artistId: slug,
          fields: {
            website_url: websiteUrl,
            spotify_url: spotifyUrl,
            youtube_url: youtubeUrl,
            instagram,
            facebook_url: facebookUrl,
            aka,
            accepting_students: acceptingStudents,
            teaching_styles: teachingStyles,
            lesson_price_range: lessonPriceRange,
            available_for_hire: availableForHire,
            hire_categories: hireCategories,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Update failed');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [token, slug, websiteUrl, spotifyUrl, youtubeUrl, instagram, facebookUrl, aka, acceptingStudents, teachingStyles, lessonPriceRange, availableForHire, hireCategories, t]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="py-24 text-center">
        <p className="text-[var(--muted-foreground)]">Artist not found.</p>
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('title')}</h1>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('socialLinks')}
            </h2>

            {[
              { label: 'Spotify', value: spotifyUrl, setter: setSpotifyUrl, placeholder: 'https://open.spotify.com/artist/...' },
              { label: 'YouTube', value: youtubeUrl, setter: setYoutubeUrl, placeholder: 'https://youtube.com/@...' },
              { label: 'Facebook', value: facebookUrl, setter: setFacebookUrl, placeholder: 'https://facebook.com/...' },
              { label: 'Website', value: websiteUrl, setter: setWebsiteUrl, placeholder: 'https://' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                  {label}
                </label>
                <input
                  type="url"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className={inputClass}
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Instagram
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]/60">@</span>
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value.replace(/^@/, ''))}
                  className={`${inputClass} pl-9`}
                  placeholder="username"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          <div>
            <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              {t('aka')}
            </label>
            <input
              type="text"
              value={aka}
              onChange={(e) => setAka(e.target.value)}
              className={inputClass}
              placeholder={t('akaPlaceholder')}
            />
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Teaching Section */}
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('teaching')}
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAcceptingStudents(!acceptingStudents)}
                className={`w-10 h-6 rounded-full transition-colors relative ${acceptingStudents ? 'bg-[var(--color-gold)]' : 'bg-[var(--muted)]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${acceptingStudents ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm">{t('acceptingStudents')}</span>
            </label>

            {acceptingStudents && (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                    {t('teachingStyles')}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Private Lessons', 'Group Classes', 'Online', 'Workshops', 'Masterclass'].map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setTeachingStyles((prev) =>
                          prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          teachingStyles.includes(style)
                            ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/30'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--color-gold)]/20'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                    {t('lessonPriceRange')}
                  </label>
                  <input
                    type="text"
                    value={lessonPriceRange}
                    onChange={(e) => setLessonPriceRange(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. $50-100/hr"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                    {t('teachingDescription')}
                  </label>
                  <textarea
                    value={teachingDescription}
                    onChange={(e) => setTeachingDescription(e.target.value)}
                    className={`${inputClass} min-h-[100px] resize-y`}
                    placeholder={t('teachingDescriptionPlaceholder')}
                  />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* Hire Me Section */}
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('hireMe')}
            </h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setAvailableForHire(!availableForHire)}
                className={`w-10 h-6 rounded-full transition-colors relative ${availableForHire ? 'bg-[var(--color-gold)]' : 'bg-[var(--muted)]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${availableForHire ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm">{t('availableForHire')}</span>
            </label>

            {availableForHire && (
              <>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                    {t('hireCategories')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Wedding', 'Corporate', 'Session', 'Recording', 'Festival', 'Private Event'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setHireCategories((prev) =>
                          prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                          hireCategories.includes(cat)
                            ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/30'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--color-gold)]/20'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                    {t('hireDescription')}
                  </label>
                  <textarea
                    value={hireDescription}
                    onChange={(e) => setHireDescription(e.target.value)}
                    className={`${inputClass} min-h-[100px] resize-y`}
                    placeholder={t('hireDescriptionPlaceholder')}
                  />
                </div>
              </>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

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
          </div>

          <div className="border-t border-[var(--border)] pt-6">
            <a
              href="mailto:hello@jazznode.com?subject=Artist%20Page%20Support"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t('contactSupport')}</span>
              <span className="text-xs text-[var(--muted-foreground)]/60">— {t('contactSupportDesc')}</span>
            </a>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
