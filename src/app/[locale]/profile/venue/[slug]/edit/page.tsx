'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

const PAYMENT_OPTIONS = [
  'cash',
  'credit_card',
  'linepay',
  'jkopay',
  'applepay',
  'googlepay',
  'wechatpay',
  'alipay',
  'paypay',
  'suica',
] as const;

interface VenueData {
  venue_id: string;
  display_name: string | null;
  name_local: string | null;
  name_en: string | null;
  description_en: string | null;
  description_zh: string | null;
  description_ja: string | null;
  description_short_en: string | null;
  description_short_zh: string | null;
  description_short_ja: string | null;
  website_url: string | null;
  instagram: string | null;
  facebook_url: string | null;
  phone: string | null;
  contact_email: string | null;
  business_hour: string | null;
  address_local: string | null;
  address_en: string | null;
  capacity: number | null;
  venue_type: string | null;
  payment_method: string[] | null;
  friendly_en: boolean | null;
  friendly_zh: boolean | null;
  friendly_ja: boolean | null;
  friendly_ko: boolean | null;
  friendly_th: boolean | null;
  friendly_id: boolean | null;
}

const VENUE_SELECT = [
  'venue_id', 'display_name', 'name_local', 'name_en',
  'description_en', 'description_zh', 'description_ja',
  'description_short_en', 'description_short_zh', 'description_short_ja',
  'website_url', 'instagram', 'facebook_url',
  'phone', 'contact_email', 'business_hour',
  'address_local', 'address_en', 'capacity',
  'venue_type', 'payment_method',
  'friendly_en', 'friendly_zh', 'friendly_ja', 'friendly_ko', 'friendly_th', 'friendly_id',
].join(', ');

export default function VenueEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { loading } = useAuth();
  const { token } = useAdmin();

  const [slug, setSlug] = useState<string>('');
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [fetching, setFetching] = useState(true);

  // Form state — basic info
  const [displayName, setDisplayName] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionZh, setDescriptionZh] = useState('');
  const [descriptionJa, setDescriptionJa] = useState('');
  const [descShortEn, setDescShortEn] = useState('');
  const [descShortZh, setDescShortZh] = useState('');
  const [descShortJa, setDescShortJa] = useState('');

  // Form state — social links
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');

  // Form state — contact
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [businessHour, setBusinessHour] = useState('');

  // Form state — location & capacity
  const [addressLocal, setAddressLocal] = useState('');
  const [addressEn, setAddressEn] = useState('');
  const [capacity, setCapacity] = useState('');

  // Form state — venue details
  const [venueType, setVenueType] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // Form state — language friendliness
  const [friendlyEn, setFriendlyEn] = useState(false);
  const [friendlyZh, setFriendlyZh] = useState(false);
  const [friendlyJa, setFriendlyJa] = useState(false);
  const [friendlyKo, setFriendlyKo] = useState(false);
  const [friendlyTh, setFriendlyTh] = useState(false);
  const [friendlyId, setFriendlyId] = useState(false);

  // UI state
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
      .select(VENUE_SELECT)
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          const v = data as unknown as VenueData;
          setVenue(v);
          setDisplayName(v.display_name || '');
          setDescriptionEn(v.description_en || '');
          setDescriptionZh(v.description_zh || '');
          setDescriptionJa(v.description_ja || '');
          setDescShortEn(v.description_short_en || '');
          setDescShortZh(v.description_short_zh || '');
          setDescShortJa(v.description_short_ja || '');
          setWebsiteUrl(v.website_url || '');
          setInstagram(v.instagram || '');
          setFacebookUrl(v.facebook_url || '');
          setPhone(v.phone || '');
          setContactEmail(v.contact_email || '');
          setBusinessHour(v.business_hour || '');
          setAddressLocal(v.address_local || '');
          setAddressEn(v.address_en || '');
          setCapacity(v.capacity ? String(v.capacity) : '');
          setVenueType(v.venue_type || 'jazz');
          setPaymentMethods(v.payment_method || []);
          setFriendlyEn(v.friendly_en ?? false);
          setFriendlyZh(v.friendly_zh ?? false);
          setFriendlyJa(v.friendly_ja ?? false);
          setFriendlyKo(v.friendly_ko ?? false);
          setFriendlyTh(v.friendly_th ?? false);
          setFriendlyId(v.friendly_id ?? false);
        }
        setFetching(false);
      });
  }, [slug]);

  const togglePayment = (method: string) => {
    setPaymentMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method],
    );
  };

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
            display_name: displayName,
            description_en: descriptionEn,
            description_zh: descriptionZh,
            description_ja: descriptionJa,
            description_short_en: descShortEn,
            description_short_zh: descShortZh,
            description_short_ja: descShortJa,
            website_url: websiteUrl,
            instagram,
            facebook_url: facebookUrl,
            phone,
            contact_email: contactEmail,
            business_hour: businessHour,
            address_local: addressLocal,
            address_en: addressEn,
            capacity: capacity ? parseInt(capacity, 10) : null,
            venue_type: venueType,
            payment_method: paymentMethods,
            friendly_en: friendlyEn,
            friendly_zh: friendlyZh,
            friendly_ja: friendlyJa,
            friendly_ko: friendlyKo,
            friendly_th: friendlyTh,
            friendly_id: friendlyId,
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
  }, [
    token, slug, displayName,
    descriptionEn, descriptionZh, descriptionJa,
    descShortEn, descShortZh, descShortJa,
    websiteUrl, instagram, facebookUrl,
    phone, contactEmail, businessHour,
    addressLocal, addressEn, capacity,
    venueType, paymentMethods,
    friendlyEn, friendlyZh, friendlyJa, friendlyKo, friendlyTh, friendlyId,
    t,
  ]);

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
  const sectionHeading = 'text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold';
  const labelClass = 'block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2';
  const hintClass = 'text-[11px] text-[var(--muted-foreground)]/60 mt-1.5';

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('title')}</h1>
      </FadeUp>

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-8">

          {/* ─── Basic Info ─── */}
          <div className="space-y-5">
            <h2 className={sectionHeading}>{t('editBasicInfo')}</h2>

            <div>
              <label className={labelClass}>{t('displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
                placeholder={venue.name_local || venue.name_en || ''}
              />
              <p className={hintClass}>{t('displayNameHint')}</p>
            </div>

            <div>
              <label className={labelClass}>{t('descriptionShort')}</label>
              <input
                type="text"
                value={locale === 'ja' ? descShortJa : locale === 'zh' ? descShortZh : descShortEn}
                onChange={(e) => {
                  if (locale === 'ja') setDescShortJa(e.target.value);
                  else if (locale === 'zh') setDescShortZh(e.target.value);
                  else setDescShortEn(e.target.value);
                }}
                className={inputClass}
                maxLength={120}
                placeholder={t('descriptionShortPlaceholder')}
              />
              <p className={hintClass}>{t('descriptionShortHint')}</p>
            </div>

            <div>
              <label className={labelClass}>{t('descriptionFull')}</label>
              <textarea
                value={locale === 'ja' ? descriptionJa : locale === 'zh' ? descriptionZh : descriptionEn}
                onChange={(e) => {
                  if (locale === 'ja') setDescriptionJa(e.target.value);
                  else if (locale === 'zh') setDescriptionZh(e.target.value);
                  else setDescriptionEn(e.target.value);
                }}
                className={`${inputClass} resize-none`}
                rows={5}
                placeholder={t('descriptionFullPlaceholder')}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ─── Location & Capacity ─── */}
          <div className="space-y-5">
            <h2 className={sectionHeading}>{t('editLocationCapacity')}</h2>

            <div>
              <label className={labelClass}>{t('addressLocal')}</label>
              <input
                type="text"
                value={addressLocal}
                onChange={(e) => setAddressLocal(e.target.value)}
                className={inputClass}
                placeholder={t('addressLocalPlaceholder')}
              />
            </div>

            <div>
              <label className={labelClass}>{t('addressEn')}</label>
              <input
                type="text"
                value={addressEn}
                onChange={(e) => setAddressEn(e.target.value)}
                className={inputClass}
                placeholder="123 Jazz Street, Shibuya, Tokyo"
              />
            </div>

            <div>
              <label className={labelClass}>{t('editCapacity')}</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={`${inputClass} max-w-[200px]`}
                min={0}
                placeholder="80"
              />
              <p className={hintClass}>{t('capacityHint')}</p>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ─── Social Links ─── */}
          <div className="space-y-5">
            <h2 className={sectionHeading}>{t('socialLinks')}</h2>

            <div>
              <label className={labelClass}>Instagram</label>
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
              <label className={labelClass}>Facebook</label>
              <input
                type="url"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                className={inputClass}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className={labelClass}>Website</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className={inputClass}
                placeholder="https://"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ─── Contact Info ─── */}
          <div className="space-y-5">
            <h2 className={sectionHeading}>{t('contactInfo')}</h2>

            <div>
              <label className={labelClass}>{t('phone')}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+886-2-xxxx-xxxx"
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                placeholder="hello@venue.com"
              />
            </div>

            <div>
              <label className={labelClass}>{t('businessHours')}</label>
              <textarea
                value={businessHour}
                onChange={(e) => setBusinessHour(e.target.value)}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder={t('businessHoursPlaceholder')}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ─── Venue Details ─── */}
          <div className="space-y-5">
            <h2 className={sectionHeading}>{t('editVenueDetails')}</h2>

            <div>
              <label className={labelClass}>{t('editVenueType')}</label>
              <div className="flex gap-3">
                {(['jazz', 'multi_genre'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVenueType(type)}
                    className={`px-4 py-2.5 rounded-xl text-sm border transition-all ${
                      venueType === type
                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-semibold'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30'
                    }`}
                  >
                    {t(type === 'jazz' ? 'venueTypeJazz' : 'venueTypeMultiGenre')}
                  </button>
                ))}
              </div>
              <p className={hintClass}>{t('venueTypeHint')}</p>
            </div>

            <div>
              <label className={labelClass}>{t('editPaymentMethods')}</label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_OPTIONS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => togglePayment(method)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      paymentMethods.includes(method)
                        ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-semibold'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30'
                    }`}
                  >
                    {t(`payment_${method}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)]" />

          {/* ─── Language Friendliness ─── */}
          <div className="space-y-5">
            <h2 className={sectionHeading}>{t('editLanguageFriendly')}</h2>
            <p className="text-xs text-[var(--muted-foreground)]">{t('languageFriendlyHint')}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {([
                ['friendly_en', 'English', friendlyEn, setFriendlyEn],
                ['friendly_zh', '中文', friendlyZh, setFriendlyZh],
                ['friendly_ja', '日本語', friendlyJa, setFriendlyJa],
                ['friendly_ko', '한국어', friendlyKo, setFriendlyKo],
                ['friendly_th', 'ภาษาไทย', friendlyTh, setFriendlyTh],
                ['friendly_id', 'Bahasa', friendlyId, setFriendlyId],
              ] as const).map(([key, label, value, setter]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => (setter as (v: boolean) => void)(!value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all ${
                    value
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-semibold'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/30'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    value ? 'border-[var(--color-gold)] bg-[var(--color-gold)]' : 'border-[var(--muted-foreground)]/30'
                  }`}>
                    {value && (
                      <svg className="w-2.5 h-2.5 text-[#0A0A0A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Save ─── */}
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
