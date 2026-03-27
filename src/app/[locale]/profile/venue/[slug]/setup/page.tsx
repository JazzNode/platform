'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

const TOTAL_STEPS = 5;

async function getFreshToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export default function VenueSetupPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueSetup');
  const locale = useLocale();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [slug, setSlug] = useState('');
  const [step, setStep] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1: Photos + Description
  const [description, setDescription] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Social + Hours
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  const [businessHour, setBusinessHour] = useState('');

  // Step 3: Theme
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();
    supabase
      .from('venues')
      .select('description_en, instagram, facebook_url, website_url, business_hour, photo_url, brand_theme_id, setup_completed')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          if (data.setup_completed) {
            router.push(`/${locale}/profile/venue/${slug}`);
            return;
          }
          setDescription(data.description_en || '');
          setInstagram(data.instagram || '');
          setFacebook(data.facebook_url || '');
          setWebsite(data.website_url || '');
          setBusinessHour(data.business_hour || '');
          setPhotoUrl(data.photo_url || null);
          setSelectedTheme(data.brand_theme_id || null);
        }
        setFetching(false);
      });
  }, [slug, user, locale, router]);

  const saveFields = async (fields: Record<string, unknown>) => {
    setSaving(true);
    const freshToken = await getFreshToken();
    await fetch('/api/venue/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` },
      body: JSON.stringify({ venueId: slug, fields }),
    });
    setSaving(false);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slug) return;
    setPhotoUploading(true);
    try {
      const freshToken = await getFreshToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('venueId', slug);
      const res = await fetch('/api/venue/upload-gallery-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.photo_url) setPhotoUrl(data.photo_url);
    } catch {}
    setPhotoUploading(false);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const nextStep = async () => {
    if (step === 1) {
      if (description.trim()) await saveFields({ description_en: description.trim() });
    } else if (step === 2) {
      await saveFields({
        instagram: instagram.trim() || null,
        facebook_url: facebook.trim() || null,
        website_url: website.trim() || null,
        business_hour: businessHour.trim() || null,
      });
    } else if (step === 3) {
      if (selectedTheme) await saveFields({ brand_theme_id: selectedTheme });
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const completeSetup = async () => {
    const adminClient = createClient();
    await adminClient
      .from('venues')
      .update({ setup_completed: true })
      .eq('venue_id', slug);
    router.push(`/${locale}/profile/venue/${slug}`);
  };

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors';
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="max-w-lg mx-auto py-8 sm:py-16">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-[var(--muted-foreground)]">{t('step')} {step} / {TOTAL_STEPS}</p>
          <button onClick={() => completeSetup()} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            {t('skipAll')}
          </button>
        </div>
        <div className="h-1 bg-[var(--muted)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-gold)] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <FadeUp key={step}>
        {/* ─── Step 1: Photos + Description ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">{t('step1Title')}</h1>
              <p className="text-sm text-[var(--muted-foreground)]">{t('step1Desc')}</p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('venuePhoto')}</label>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
              {photoUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-[var(--border)] group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">{t('change')}</div>
                </div>
              ) : (
                <button onClick={() => photoInputRef.current?.click()} disabled={photoUploading}
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--color-gold)]/50 flex flex-col items-center justify-center gap-2 transition-colors">
                  {photoUploading ? <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" /> : <span className="text-xs text-[var(--muted-foreground)]">{t('upload')}</span>}
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('description')}</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${inputClass} resize-none`} placeholder={t('descPlaceholder')} />
            </div>
          </div>
        )}

        {/* ─── Step 2: Social + Hours ─── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">{t('step2Title')}</h1>
              <p className="text-sm text-[var(--muted-foreground)]">{t('step2Desc')}</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">Instagram</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputClass} placeholder="@yourvenue" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">Facebook</label>
              <input type="url" value={facebook} onChange={(e) => setFacebook(e.target.value)} className={inputClass} placeholder="https://facebook.com/yourvenue" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('website')}</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://yourvenue.com" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2 font-bold">{t('businessHours')}</label>
              <input type="text" value={businessHour} onChange={(e) => setBusinessHour(e.target.value)} className={inputClass} placeholder={t('hoursPlaceholder')} />
            </div>
          </div>
        )}

        {/* ─── Step 3: Theme ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">{t('step3Title')}</h1>
              <p className="text-sm text-[var(--muted-foreground)]">{t('step3Desc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['midnight-gold', 'jade-mist', 'neon-noir', 'indigo-rain', 'orchid-gold', 'equator-sunset', 'jakarta-ground', 'han-river'].map((id) => (
                <button key={id} onClick={() => setSelectedTheme(id)}
                  className={`rounded-xl p-4 text-left text-xs font-medium transition-all border ${selectedTheme === id ? 'border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]' : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'}`}>
                  {id.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 4: First Event ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-2">{t('step4Title')}</h1>
              <p className="text-sm text-[var(--muted-foreground)]">{t('step4Desc')}</p>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)] mb-4">{t('step4Hint')}</p>
              <button onClick={() => router.push(`/${locale}/profile/venue/${slug}/schedule`)}
                className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
                {t('addFirstEvent')}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 5: Complete ─── */}
        {step === 5 && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('step5Title')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-md mx-auto">{t('step5Desc')}</p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button onClick={() => router.push(`/${locale}/venues/${slug}`)}
                className="px-8 py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity">
                {t('previewPage')}
              </button>
              <button onClick={() => completeSetup()}
                className="px-8 py-3 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors">
                {t('goToDashboard')}
              </button>
            </div>
          </div>
        )}
      </FadeUp>

      {/* Navigation buttons */}
      {step < 5 && (
        <div className="flex items-center justify-between mt-10">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              ← {t('back')}
            </button>
          ) : <div />}
          <div className="flex gap-3">
            <button onClick={nextStep} disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30">
              {saving ? <div className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" /> : step === 4 ? t('skip') : t('next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
