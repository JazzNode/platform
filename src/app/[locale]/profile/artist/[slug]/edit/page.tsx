'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import Link from 'next/link';
import { ACTIVE_COUNTRY_CODES } from '@/lib/regions';

const REGION_LABELS: Record<string, string> = {
  TW: '台灣',
  JP: '日本',
  HK: '香港',
  SG: 'Singapore',
  MY: 'Malaysia',
  KR: '한국',
  TH: 'ไทย',
  ID: 'Indonesia',
};

interface ArtistData {
  artist_id: string;
  display_name: string | null;
  name_local: string | null;
  name_en: string | null;
  photo_url: string | null;
  bio_en: string | null;
  bio_zh: string | null;
  bio_short_en: string | null;
  bio_short_zh: string | null;
  primary_instrument: string | null;
  instrument_list: string[] | null;
  country_code: string | null;
  website_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  instagram: string | null;
  facebook_url: string | null;
  soundcloud_url: string | null;
  bandcamp_url: string | null;
  apple_music_url: string | null;
  tiktok: string | null;
  twitter_url: string | null;
  threads: string | null;
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
  const [gearCount, setGearCount] = useState(0);
  const [fetching, setFetching] = useState(true);

  // Basic info
  const [countryCode, setCountryCode] = useState('');

  // Social links
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [appleMusicUrl, setAppleMusicUrl] = useState('');
  const [soundcloudUrl, setSoundcloudUrl] = useState('');
  const [bandcampUrl, setBandcampUrl] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [threads, setThreads] = useState('');

  // Aka
  const [aka, setAka] = useState('');

  // Teaching
  const [acceptingStudents, setAcceptingStudents] = useState(false);
  const [teachingStyles, setTeachingStyles] = useState<string[]>([]);
  const [lessonPriceRange, setLessonPriceRange] = useState('');
  const [teachingDescription, setTeachingDescription] = useState('');

  // Hire
  const [availableForHire, setAvailableForHire] = useState(false);
  const [hireCategories, setHireCategories] = useState<string[]>([]);
  const [hireDescription, setHireDescription] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from('artists')
        .select('artist_id, display_name, name_local, name_en, photo_url, bio_en, bio_zh, bio_short_en, bio_short_zh, primary_instrument, instrument_list, country_code, website_url, spotify_url, youtube_url, instagram, facebook_url, soundcloud_url, bandcamp_url, apple_music_url, tiktok, twitter_url, threads, aka, accepting_students, teaching_styles, lesson_price_range, teaching_description, available_for_hire, hire_categories, hire_description')
        .eq('artist_id', slug)
        .single(),
      supabase
        .from('artist_gear')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', slug),
    ]).then(([{ data }, { count }]) => {
      if (data) {
        setArtist(data);
        setCountryCode(data.country_code || '');
        setWebsiteUrl(data.website_url || '');
        setSpotifyUrl(data.spotify_url || '');
        setYoutubeUrl(data.youtube_url || '');
        setInstagram(data.instagram || '');
        setFacebookUrl(data.facebook_url || '');
        setSoundcloudUrl(data.soundcloud_url || '');
        setBandcampUrl(data.bandcamp_url || '');
        setAppleMusicUrl(data.apple_music_url || '');
        setTiktok(data.tiktok || '');
        setTwitterUrl(data.twitter_url || '');
        setThreads(data.threads || '');
        setAka(data.aka || '');
        setAcceptingStudents(data.accepting_students || false);
        setTeachingStyles(data.teaching_styles || []);
        setLessonPriceRange(data.lesson_price_range || '');
        setTeachingDescription(data.teaching_description || '');
        setAvailableForHire(data.available_for_hire || false);
        setHireCategories(data.hire_categories || []);
        setHireDescription(data.hire_description || '');
      }
      setGearCount(count ?? 0);
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
            country_code: countryCode,
            website_url: websiteUrl,
            spotify_url: spotifyUrl,
            youtube_url: youtubeUrl,
            instagram,
            facebook_url: facebookUrl,
            soundcloud_url: soundcloudUrl,
            bandcamp_url: bandcampUrl,
            apple_music_url: appleMusicUrl,
            tiktok,
            twitter_url: twitterUrl,
            threads,
            aka,
            accepting_students: acceptingStudents,
            teaching_styles: teachingStyles,
            lesson_price_range: lessonPriceRange,
            teaching_description: teachingDescription,
            available_for_hire: availableForHire,
            hire_categories: hireCategories,
            hire_description: hireDescription,
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
  }, [token, slug, countryCode, websiteUrl, spotifyUrl, youtubeUrl, instagram, facebookUrl, soundcloudUrl, bandcampUrl, appleMusicUrl, tiktok, twitterUrl, threads, aka, acceptingStudents, teachingStyles, lessonPriceRange, teachingDescription, availableForHire, hireCategories, hireDescription, t]);

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

  const hasSocialLinks = !!(websiteUrl || spotifyUrl || youtubeUrl || instagram || facebookUrl || soundcloudUrl || bandcampUrl || appleMusicUrl || tiktok || twitterUrl || threads);
  const completionFields = [
    { key: 'completionPhoto' as const, done: !!artist.photo_url, editableHere: false },
    { key: 'completionBio' as const, done: !!(artist.bio_en || artist.bio_zh || artist.bio_short_en || artist.bio_short_zh), editableHere: false },
    { key: 'completionSocialLinks' as const, done: hasSocialLinks, editableHere: true },
    { key: 'completionInstruments' as const, done: !!(artist.primary_instrument || (artist.instrument_list && artist.instrument_list.length > 0)), editableHere: false },
    { key: 'completionGear' as const, done: gearCount > 0, editableHere: false },
  ];
  const doneCount = completionFields.filter((f) => f.done).length;
  const percentage = Math.round((doneCount / completionFields.length) * 100);

  const urlFields: { label: string; value: string; setter: (v: string) => void; placeholder: string }[] = [
    { label: 'Spotify', value: spotifyUrl, setter: setSpotifyUrl, placeholder: 'https://open.spotify.com/artist/...' },
    { label: 'Apple Music', value: appleMusicUrl, setter: setAppleMusicUrl, placeholder: 'https://music.apple.com/artist/...' },
    { label: 'YouTube', value: youtubeUrl, setter: setYoutubeUrl, placeholder: 'https://youtube.com/@...' },
    { label: 'SoundCloud', value: soundcloudUrl, setter: setSoundcloudUrl, placeholder: 'https://soundcloud.com/...' },
    { label: 'Bandcamp', value: bandcampUrl, setter: setBandcampUrl, placeholder: 'https://yourname.bandcamp.com' },
    { label: 'Facebook', value: facebookUrl, setter: setFacebookUrl, placeholder: 'https://facebook.com/...' },
    { label: 'X / Twitter', value: twitterUrl, setter: setTwitterUrl, placeholder: 'https://x.com/...' },
    { label: 'Website', value: websiteUrl, setter: setWebsiteUrl, placeholder: 'https://' },
  ];

  const usernameFields: { label: string; value: string; setter: (v: string) => void; placeholder: string }[] = [
    { label: 'Instagram', value: instagram, setter: setInstagram, placeholder: 'username' },
    { label: 'TikTok', value: tiktok, setter: setTiktok, placeholder: 'username' },
    { label: 'Threads', value: threads, setter: setThreads, placeholder: 'username' },
  ];

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('title')}</h1>
      </FadeUp>

      {/* Profile Completion Checklist */}
      {percentage < 100 && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
                {t('completionChecklist')}
              </h2>
              <span className="text-xs text-gold font-semibold">{percentage}%</span>
            </div>
            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {completionFields.map(({ key, done, editableHere }) => (
                <div key={key} className="flex items-center gap-2.5 py-1">
                  {done ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-500 shrink-0">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--muted-foreground)]/30 shrink-0" />
                  )}
                  <span className={`text-sm ${done ? 'text-[var(--muted-foreground)] line-through' : 'text-[var(--foreground)]'}`}>
                    {t(key)}
                  </span>
                  {!done && (
                    editableHere ? (
                      <span className="text-[10px] text-gold/60">↓ {t('completionHintBelow')}</span>
                    ) : (
                      <Link
                        href={`/artists/${slug}`}
                        className="text-[10px] text-gold/60 hover:text-gold transition-colors"
                      >
                        {t('completionHintPage')} →
                      </Link>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeUp>
      )}

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-8">

          {/* ── Section: Basic Info ── */}
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('basicInfo')}
            </h2>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {t('region')}
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTIVE_COUNTRY_CODES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCountryCode(countryCode === code ? '' : code)}
                    className={`px-3.5 py-1.5 rounded-full text-xs border transition-colors ${
                      countryCode === code
                        ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border-[var(--color-gold)]/30'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--color-gold)]/20'
                    }`}
                  >
                    {REGION_LABELS[code] || code}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ── Section: Social Links ── */}
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('socialLinks')}
            </h2>

            {/* URL-based platforms */}
            {urlFields.map(({ label, value, setter, placeholder }) => (
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

            {/* Username-based platforms */}
            {usernameFields.map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                  {label}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]/60">@</span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setter(e.target.value.replace(/^@/, ''))}
                    className={`${inputClass} pl-9`}
                    placeholder={placeholder}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ── Section: Also Known As ── */}
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

          {/* ── Section: Teaching ── */}
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

          {/* ── Section: Hire Me ── */}
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
