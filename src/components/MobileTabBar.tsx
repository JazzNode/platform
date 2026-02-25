'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

const tabs = [
  { key: 'cities', path: '/cities' },
  { key: 'events', path: '/events' },
  { key: 'venues', path: '/venues' },
  { key: 'artists', path: '/artists' },
] as const;

/** Minimal SVG icons — designed for JazzNode's aesthetic */
function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const stroke = active ? '#C8A84E' : '#6A6560';
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (tab) {
    // Cities — skyline silhouette
    case 'cities':
      return (
        <svg {...props}>
          <path d="M3 21h18" />
          <path d="M5 21V7l3-2v16" />
          <path d="M10 21V10h4v11" />
          <path d="M16 21V5l3 2v14" />
          <path d="M7 10h0.01" />
          <path d="M12 14h0.01" />
          <path d="M17 9h0.01" />
        </svg>
      );
    // Events — calendar with music note
    case 'events':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <circle cx="12" cy="16" r="1.5" fill={stroke} stroke="none" />
          <path d="M13.5 16V13l3-1" />
        </svg>
      );
    // Venues — location pin with sound waves
    case 'venues':
      return (
        <svg {...props}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    // Artists — microphone
    case 'artists':
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="10" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <path d="M12 17v4" />
          <path d="M8 21h8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MobileTabBar() {
  const locale = useLocale();
  const t = useTranslations('common');
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Frosted glass bar */}
      <div
        className="mx-3 mb-2 rounded-2xl border border-[rgba(240,237,230,0.08)] shadow-[0_-4px_30px_rgba(0,0,0,0.4)]"
        style={{
          background: 'rgba(18, 18, 18, 0.72)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
      >
        <div className="flex items-center justify-around py-2">
          {tabs.map(({ key, path }) => {
            const href = `/${locale}${path}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-[rgba(200,168,78,0.12)]'
                    : ''
                }`}
              >
                <TabIcon tab={key} active={active} />
                <span
                  className={`text-[10px] tracking-wider transition-colors duration-300 ${
                    active ? 'text-gold font-medium' : 'text-[#6A6560]'
                  }`}
                >
                  {t(key)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
