'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function Footer() {
  const locale = useLocale();
  const t = useTranslations('common');

  const navLinks = [
    { key: 'cities', href: `/${locale}/cities` },
    { key: 'venues', href: `/${locale}/venues` },
    { key: 'events', href: `/${locale}/events` },
    { key: 'artists', href: `/${locale}/artists` },
  ] as const;

  return (
    <footer id="site-footer" className="bg-[var(--card)] rounded-t-[2.5rem] py-14 mt-24 animate-footer-fade-in">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-8">
          {/* Logo + tagline */}
          <Link href={`/${locale}`} className="group block text-center">
            <p className="font-serif text-xl text-gold font-bold group-hover:text-[var(--color-gold-bright)] transition-colors">JazzNode</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-[var(--muted-foreground,#8A8578)]">
              The Jazz Scene, Connected.
            </p>
          </Link>

          {/* Nav links — subtle, spaced with dots */}
          <nav className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--muted-foreground,#8A8578)]">
            {navLinks.map((link, i) => (
              <span key={link.key} className="flex items-center gap-2">
                {i > 0 && <span className="opacity-30">·</span>}
                <Link
                  href={link.href}
                  className="hover:text-gold transition-colors duration-300"
                >
                  {t(link.key)}
                </Link>
              </span>
            ))}
          </nav>

          {/* Bottom row */}
          <div className="flex items-center gap-6 text-xs text-[var(--muted-foreground,#8A8578)]">
            <div className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="font-mono uppercase tracking-widest">Live Data</span>
            </div>
            <span className="opacity-30">·</span>
            <span>© {new Date().getFullYear()} JazzNode</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
