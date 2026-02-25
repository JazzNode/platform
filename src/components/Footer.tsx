'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from '@/components/ThemeProvider';
import { themes, themeOrder, type Theme } from '@/lib/themes';

function SoundWave() {
  return (
    <div className="flex items-center gap-[2px] h-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-gold"
          style={{
            animation: `soundwave 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function ThemePicker() {
  const { themeId, setTheme } = useTheme();
  const locale = useLocale();

  const label = (t: Theme) => {
    if (locale === 'zh') return t.label_zh;
    if (locale === 'ja') return t.label_ja;
    return t.label;
  };

  return (
    <div className="flex items-center gap-4">
      {themeOrder.map((id) => {
        const t = themes[id];
        const active = themeId === id;
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className="group relative flex flex-col items-center gap-2 transition-all duration-300"
          >
            {/* Color dot */}
            <span
              className={`w-5 h-5 rounded-full transition-all duration-300 ${
                active ? 'scale-110' : 'hover:scale-110'
              }`}
              style={{
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                boxShadow: active ? `0 0 12px ${t.accent}50, 0 0 0 2px var(--card), 0 0 0 4px ${t.accent}` : 'none',
              }}
            />
            {/* Label below — always visible for active, hover for others */}
            <span
              className={`text-[9px] uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-300 ${
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
              }`}
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

          {/* Nav links — uses theme accent color */}
          <nav className="flex items-center gap-3 text-xs uppercase tracking-widest">
            {navLinks.map((link, i) => (
              <span key={link.key} className="flex items-center gap-3">
                {i > 0 && <span className="text-[var(--muted-foreground)] opacity-30">·</span>}
                <Link
                  href={link.href}
                  className="text-gold hover:text-[var(--color-gold-bright)] transition-colors duration-300"
                >
                  {t(link.key)}
                </Link>
              </span>
            ))}
          </nav>

          {/* Theme picker — aligned under nav */}
          <ThemePicker />

          {/* Bottom row — sound wave instead of pulse dot */}
          <div className="flex items-center gap-6 text-xs text-[var(--muted-foreground,#8A8578)]">
            <div className="flex items-center gap-2">
              <SoundWave />
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
