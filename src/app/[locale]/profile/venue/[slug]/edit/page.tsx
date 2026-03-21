'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface VenueData {
  venue_id: string;
  display_name: string | null;
  name_local: string | null;
  name_en: string | null;
  website_url: string | null;
  instagram: string | null;
  facebook_url: string | null;
  phone: string | null;
  contact_email: string | null;
  business_hour: string | null;
}

export default function VenueEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { loading } = useAuth();
  const { token } = useAdmin();

  const [slug, setSlug] = useState<string>('');
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [businessHour, setBusinessHour] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Fetch venue data
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase
      .from('venues')
      .select('venue_id, display_name, name_local, name_en, website_url, instagram, facebook_url, phone, contact_email, business_hour')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setVenue(data);
          setWebsiteUrl(data.website_url || '');
          setInstagram(data.instagram || '');
          setFacebookUrl(data.facebook_url || '');
          setPhone(data.phone || '');
          setContactEmail(data.contact_email || '');
          setBusinessHour(data.business_hour || '');
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
      const res = await fetch('/api/venue/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          venueId: slug,
          fields: {
            website_url: websiteUrl,
            instagram,
            facebook_url: facebookUrl,
            phone,
            contact_email: contactEmail,
            business_hour: businessHour,
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
  }, [token, slug, websiteUrl, instagram, facebookUrl, phone, contactEmail, businessHour, t]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="py-24 text-center">
        <p className="text-[var(--muted-foreground)]">Venue not found.</p>
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
          {/* Social Links */}
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('socialLinks')}
            </h2>

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

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Facebook
              </label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className={inputClass}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Website
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className={inputClass}
                placeholder="https://"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border)]" />

          {/* Contact Info */}
          <div className="space-y-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('contactInfo')}
            </h2>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('phone')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+886-2-xxxx-xxxx"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                placeholder="hello@venue.com"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {t('businessHours')}
              </label>
              <textarea
                value={businessHour}
                onChange={(e) => setBusinessHour(e.target.value)}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder={t('businessHoursPlaceholder')}
              />
            </div>
          </div>

          {/* Save button */}
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
              href="mailto:hello@jazznode.com?subject=Venue%20Page%20Support"
              className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{t('contactSupport')}</span>
            </a>
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
