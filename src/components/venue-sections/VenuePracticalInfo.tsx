import type { Venue } from '@/lib/supabase';

interface VenuePracticalInfoProps {
  venue: { id: string; fields: Venue };
  locale: string;
  t: (key: string) => string;
  paymentLabel: Record<string, string>;
}

export default function VenuePracticalInfo({
  venue,
  locale,
  t,
  paymentLabel,
}: VenuePracticalInfoProps) {
  const f = venue.fields;
  const hasMap = f.lat && f.lng;
  const hasAddress = f.address_local || f.address_en;
  const hasContact = f.phone || f.contact_email;
  const hasHours = f.business_hour;
  const hasPayment = f.payment_method?.length;
  const hasLanguages = f.friendly_zh || f.friendly_en || f.friendly_ja || f.friendly_ko || f.friendly_th || f.friendly_id;

  if (!hasMap && !hasAddress && !hasContact && !hasHours) return null;

  const langFlags = [
    f.friendly_zh && '中文友善',
    f.friendly_en && 'English Friendly',
    f.friendly_ja && '日本語OK',
    f.friendly_ko && '한국어 가능',
    f.friendly_th && 'ภาษาไทย',
    f.friendly_id && 'Bahasa Indonesia',
  ].filter(Boolean) as string[];

  return (
    <section className="border-t border-[var(--border)] pt-12">
      <h2 className="font-serif text-xl sm:text-2xl font-bold mb-8">
        {t('practicalInfo')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Map + Address */}
        <div className="space-y-4">
          {hasMap && (
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] h-[220px] sm:h-[280px] relative bg-[#1A1A1A]">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0, filter: 'grayscale(100%) invert(92%) contrast(83%) opacity(80%)' }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${f.lat},${f.lng}`}
              />
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                  <a
                    href={`https://maps.apple.com/?ll=${f.lat},${f.lng}&q=${encodeURIComponent(f.name_local || f.name_en || 'Venue')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                  >
                    {t('openInAppleMaps')}
                  </a>
                </div>
              )}
            </div>
          )}

          {hasAddress && (
            <div className="space-y-1">
              {f.address_local && (
                <p className="text-sm text-[#C4BFB3]">{f.address_local}</p>
              )}
              {f.address_en && f.address_en !== f.address_local && (
                <p className="text-xs text-[var(--muted-foreground)]">{f.address_en}</p>
              )}
            </div>
          )}

          {hasMap && (
            <div className="flex flex-wrap gap-2">
              <a
                href={f.place_id ? `https://www.google.com/maps/place/?q=place_id:${f.place_id}` : `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/30 transition-colors"
              >
                {t('openInGoogleMaps')}
              </a>
              <a
                href={`https://maps.apple.com/?ll=${f.lat},${f.lng}&q=${encodeURIComponent(f.name_local || f.name_en || 'Venue')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/30 transition-colors"
              >
                {t('openInAppleMaps')}
              </a>
            </div>
          )}
        </div>

        {/* Right: Contact, Hours, Payment, Languages */}
        <div className="space-y-6">
          {/* Contact */}
          {hasContact && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {t('contactInfo')}
              </h3>
              <div className="space-y-2">
                {f.phone && (
                  <a
                    href={`tel:${f.phone}`}
                    className="flex items-center gap-2 text-sm text-[#C4BFB3] hover:text-gold transition-colors"
                  >
                    <svg className="w-4 h-4 text-gold/60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    {f.phone}
                  </a>
                )}
                {f.contact_email && (
                  <a
                    href={`mailto:${f.contact_email}`}
                    className="flex items-center gap-2 text-sm text-[#C4BFB3] hover:text-gold transition-colors"
                  >
                    <svg className="w-4 h-4 text-gold/60" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                    {f.contact_email}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Business Hours */}
          {hasHours && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {t('businessHours')}
              </h3>
              <p className="text-sm text-[#C4BFB3] whitespace-pre-line">
                {f.business_hour}
              </p>
            </div>
          )}

          {/* Payment Methods */}
          {hasPayment && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {t('paymentMethods')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {f.payment_method!.map((pm) => (
                  <span
                    key={pm}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
                  >
                    {paymentLabel[pm] || pm}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {hasLanguages && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {t('languageFriendly')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {langFlags.map((lang) => (
                  <span
                    key={lang}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)]"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capacity */}
          {f.capacity != null && (f.capacity as number) > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-3">
                {t('venueCapacity')}
              </h3>
              <p className="text-sm text-[#C4BFB3]">
                {f.capacity} {t('capacitySeats')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
