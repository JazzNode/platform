'use client';

import { useState, useEffect } from 'react';

interface MerchItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  external_url: string | null;
}

interface VenueMerchandiseProps {
  venueId: string;
  countryCode?: string | null;
  t: (key: string) => string;
}

/** Map country code → currency + locale for Intl.NumberFormat */
const COUNTRY_CURRENCY: Record<string, { currency: string; locale: string; decimals: number }> = {
  TW: { currency: 'TWD', locale: 'zh-TW', decimals: 0 },
  JP: { currency: 'JPY', locale: 'ja-JP', decimals: 0 },
  US: { currency: 'USD', locale: 'en-US', decimals: 2 },
  GB: { currency: 'GBP', locale: 'en-GB', decimals: 2 },
  KR: { currency: 'KRW', locale: 'ko-KR', decimals: 0 },
  TH: { currency: 'THB', locale: 'th-TH', decimals: 0 },
  ID: { currency: 'IDR', locale: 'id-ID', decimals: 0 },
  SG: { currency: 'SGD', locale: 'en-SG', decimals: 2 },
  HK: { currency: 'HKD', locale: 'zh-HK', decimals: 0 },
  MY: { currency: 'MYR', locale: 'ms-MY', decimals: 2 },
  PH: { currency: 'PHP', locale: 'en-PH', decimals: 0 },
  VN: { currency: 'VND', locale: 'vi-VN', decimals: 0 },
  AU: { currency: 'AUD', locale: 'en-AU', decimals: 2 },
  EU: { currency: 'EUR', locale: 'de-DE', decimals: 2 },
};
const DEFAULT_CURRENCY = { currency: 'TWD', locale: 'zh-TW', decimals: 0 };

function formatPrice(amount: number, countryCode?: string | null): string {
  const cc = COUNTRY_CURRENCY[countryCode || 'TW'] || DEFAULT_CURRENCY;
  // For currencies with decimals, amount is in smallest unit (cents)
  const value = cc.decimals > 0 ? amount / Math.pow(10, cc.decimals) : amount;
  return new Intl.NumberFormat(cc.locale, {
    style: 'currency',
    currency: cc.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: cc.decimals,
  }).format(value);
}

export default function VenueMerchandise({ venueId, countryCode, t }: VenueMerchandiseProps) {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/venue/merchandise?venueId=${venueId}`)
      .then((res) => res.json())
      .then((data) => { setItems(data.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [venueId]);

  if (loading || items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-serif text-xl sm:text-2xl font-bold">{t('shopMerchandise')}</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex-none w-[200px] sm:w-[220px] group"
          >
            {/* Image */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-[var(--muted)] mb-3 border border-[var(--border)]">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-[var(--muted-foreground)]/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <h3 className="text-sm font-semibold truncate">{item.name}</h3>
            {item.price != null && (
              <p className="text-sm text-[var(--color-gold)] font-medium mt-0.5">
                {formatPrice(item.price, countryCode)}
              </p>
            )}
            {item.description && (
              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mt-1">{item.description}</p>
            )}

            {/* External link */}
            {item.external_url && (
              <a
                href={item.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] text-xs font-medium text-[var(--foreground)] transition-colors"
              >
                {t('buyNow')}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
