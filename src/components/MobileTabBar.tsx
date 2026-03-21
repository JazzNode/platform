'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const tabs = [
  { key: 'home', path: '' },
  { key: 'cities', path: '/cities' },
  { key: 'venues', path: '/venues' },
  { key: 'events', path: '/events' },
  { key: 'artists', path: '/artists' },
] as const;

function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const stroke = active ? 'var(--color-gold)' : 'var(--muted-foreground)';
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (tab) {
    case 'home':
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
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
    case 'venues':
      return (
        <svg {...props}>
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
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
  const [visible, setVisible] = useState(true);
  const [tonightCount, setTonightCount] = useState(0);

  useEffect(() => {
    // Read tonight count from homepage data attribute
    const el = document.querySelector('[data-tonight-count]');
    if (el) {
      const count = parseInt(el.getAttribute('data-tonight-count') || '0', 10);
      setTonightCount(count);
    }
  }, [pathname]);

  useEffect(() => {
    const SHOW_AFTER = 100; // px scrolled before showing (lowered for better UX)

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const winHeight = window.innerHeight;
      const footer = document.getElementById('site-footer');
      const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;

      // Show: scrolled past threshold
      // Hide: footer is entering viewport (within 80px of bottom)
      const pastThreshold = scrollY > SHOW_AFTER;
      const nearFooter = footerTop < winHeight + 20;

      setVisible(pastThreshold && !nearFooter);
    };

    // Check once on mount (in case page loads scrolled)
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="mx-3 mb-2 rounded-2xl"
        style={{
          background: 'rgba(var(--theme-glow-rgb, 200, 168, 78), 0.18)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          border: '1px solid rgba(var(--theme-glow-rgb, 200, 168, 78), 0.08)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
          transition: 'background-color 0.6s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex items-center justify-around py-2">
          {tabs.map(({ key, path }) => {
            const href = `/${locale}${path}`;
            const active = key === 'home'
              ? pathname === `/${locale}` || pathname === `/${locale}/`
              : pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-300"
                style={active ? { background: `rgba(var(--theme-glow-rgb, 200, 168, 78), 0.12)` } : {}}
              >
                <span className="relative">
                  <TabIcon tab={key} active={active} />
                  {/* Tonight badge on Events tab */}
                  {key === 'events' && tonightCount > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-[4px] rounded-full bg-gold text-[#0A0A0A] text-[9px] font-bold flex items-center justify-center leading-none">
                      {tonightCount > 9 ? '9+' : tonightCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] tracking-wider transition-colors duration-300 ${
                    active ? 'text-gold font-medium' : 'text-[var(--muted-foreground)]'
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
