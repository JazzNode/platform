'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from '@/components/ThemeProvider';
import { themes, themeOrder, type Theme } from '@/lib/themes';

function ThemePicker() {
  const { themeId, setTheme } = useTheme();
  const locale = useLocale();

  const label = (t: Theme) => {
    if (locale === 'zh') return t.label_zh;
    if (locale === 'ja') return t.label_ja;
    return t.label;
  };

  return (
    <div className="flex items-center gap-3">
      {themeOrder.map((id) => {
        const t = themes[id];
        const active = themeId === id;
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            title={label(t)}
            className="group relative flex items-center justify-center transition-all duration-300"
          >
            {/* Outer ring for active */}
            <span
              className={`w-6 h-6 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                active ? 'border-current scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ color: t.accent }}
            >
              {/* Inner dot */}
              <span
                className="w-3.5 h-3.5 rounded-full transition-transform duration-300"
                style={{
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                  boxShadow: active ? `0 0 8px ${t.accent}40` : 'none',
                }}
              />
            </span>
            {/* Tooltip */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              style={{ color: t.accent }}
            >
              {label(t)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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

          {/* Nav links */}
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

          {/* Theme picker */}
          <ThemePicker />

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
