'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSearch } from './SearchProvider';

const localeLabels: Record<string, string> = { en: 'EN', zh: '中', ja: '日' };
const localeList = ['en', 'zh', 'ja'] as const;

export default function Header() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { open: openSearch, toggle: toggleSearch } = useSearch();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ⌘K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSearch]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
    setMenuOpen(false);
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ease-out ${
          scrolled
            ? 'bg-[var(--background)]/80 backdrop-blur-xl border-b border-[rgba(200,168,78,0.12)] shadow-[0_1px_20px_rgba(0,0,0,0.3)]'
            : 'bg-[var(--background)]/40 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href={`/${locale}`} className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-gold)] group-hover:text-[var(--color-gold-bright)] transition-colors link-lift">
            JazzNode
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href={`/${locale}/cities`} className="text-sm uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 link-lift">
              {t('cities')}
            </Link>
            <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 link-lift">
              {t('venues')}
            </Link>
            <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 link-lift">
              {t('events')}
            </Link>
            <Link href={`/${locale}/artists`} className="text-sm uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 link-lift">
              {t('artists')}
            </Link>

            {/* Search */}
            <button
              onClick={openSearch}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 p-1.5 rounded-lg hover:bg-[rgba(240,237,230,0.06)] group"
              aria-label="Search"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            <div className="flex items-center gap-1 ml-6 border-l border-[var(--border)] pl-6">
              {localeList.map((l) => (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={`px-2.5 py-1 text-xs tracking-wider rounded-lg transition-all duration-300 ${
                    locale === l
                      ? 'bg-[var(--color-gold)] text-[var(--background)] font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {localeLabels[l]}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile: search + locale switcher + hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={openSearch}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 p-1.5"
              aria-label="Search"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <div className="flex items-center gap-0.5">
              {localeList.map((l) => (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={`px-2 py-1 text-xs tracking-wider rounded-lg transition-all duration-300 ${
                    locale === l
                      ? 'bg-[var(--color-gold)] text-[var(--background)] font-bold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {localeLabels[l]}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="relative w-10 h-10 flex flex-col items-center justify-center group"
              aria-label="Toggle menu"
            >
              <div className="relative w-5 h-4 flex flex-col justify-between items-center overflow-hidden">
                <span
                  className={`block w-5 h-0.5 bg-[var(--foreground)] transition-all duration-300 transform origin-center ${
                    menuOpen ? 'rotate-45 translate-y-[7px]' : 'translate-y-0'
                  }`}
                />
                <span
                  className={`block w-5 h-0.5 bg-[var(--foreground)] transition-all duration-200 ${
                    menuOpen ? 'opacity-0 -translate-x-full' : 'opacity-100'
                  }`}
                />
                <span
                  className={`block w-5 h-0.5 bg-[var(--foreground)] transition-all duration-300 transform origin-center ${
                    menuOpen ? '-rotate-45 -translate-y-[7px]' : 'translate-y-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile fullscreen menu */}
      <div
        className={`fixed inset-0 z-40 bg-[var(--background)]/98 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 transition-all duration-400 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <Link href={`/${locale}/cities`} onClick={() => setMenuOpen(false)} className="text-2xl font-serif uppercase tracking-widest text-[#F0EDE6] hover:text-gold transition-colors">
          {t('cities')}
        </Link>
        <Link href={`/${locale}/venues`} onClick={() => setMenuOpen(false)} className="text-2xl font-serif uppercase tracking-widest text-[#F0EDE6] hover:text-gold transition-colors">
          {t('venues')}
        </Link>
        <Link href={`/${locale}/events`} onClick={() => setMenuOpen(false)} className="text-2xl font-serif uppercase tracking-widest text-[#F0EDE6] hover:text-gold transition-colors">
          {t('events')}
        </Link>
        <Link href={`/${locale}/artists`} onClick={() => setMenuOpen(false)} className="text-2xl font-serif uppercase tracking-widest text-[#F0EDE6] hover:text-gold transition-colors">
          {t('artists')}
        </Link>
      </div>
    </>
  );
}
