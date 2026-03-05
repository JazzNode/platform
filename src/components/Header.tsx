'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSearch } from './SearchProvider';
import { useAuth } from './AuthProvider';

const localeLabels: Record<string, string> = { en: 'EN', zh: '中', ja: '日', ko: '한', th: 'ไท', id: 'ID' };
const localeFullNames: Record<string, string> = { en: 'English', zh: '中文', ja: '日本語', ko: '한국어', th: 'ไทย', id: 'Indonesia' };
const localeList = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;

/* User icon (outline) for logged-out state */
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

export default function Header() {
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { open: openSearch } = useSearch();
  const { user, loading: authLoading, signOut, setShowAuthModal } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const langRefDesktop = useRef<HTMLDivElement>(null);
  const langRefMobile = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close language dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = langRefDesktop.current?.contains(t);
      const inMobile = langRefMobile.current?.contains(t);
      if (!inDesktop && !inMobile) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  /* Shared user button for desktop & mobile */
  function UserButton({ mobile }: { mobile?: boolean }) {
    if (authLoading) return null;

    if (!user) {
      return (
        <button
          onClick={() => setShowAuthModal(true)}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 p-1.5 rounded-lg hover:bg-[rgba(240,237,230,0.06)]"
          aria-label="Sign in"
        >
          <UserIcon className="w-[18px] h-[18px]" />
        </button>
      );
    }

    return (
      <div ref={mobile ? undefined : userMenuRef} className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="w-7 h-7 rounded-full bg-[var(--color-gold)] text-[#0A0A0A] text-xs font-bold flex items-center justify-center transition-opacity hover:opacity-90"
          aria-label="User menu"
        >
          {userInitial}
        </button>
        {userMenuOpen && !mobile && (
          <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            <div className="px-4 py-2 border-b border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
            </div>
            <button
              onClick={() => { signOut(); setUserMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {tAuth('signOut')}
            </button>
          </div>
        )}
      </div>
    );
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
            JazzNode<sup className="text-[8px] font-sans font-semibold uppercase tracking-[0.12em] text-[var(--color-gold)]/50 relative -top-3 ml-[2px] select-none">beta</sup>
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

            {/* Search + User + Language group */}
            <div className="flex items-center gap-3 ml-auto border-l border-[var(--border)] pl-6">
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

            <UserButton />

            <div ref={langRefDesktop} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs tracking-wider rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
                aria-label="Switch language"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="font-semibold">{localeLabels[locale]}</span>
                <svg className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5l3 3 3-3" />
                </svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-[140px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {localeList.map((l) => (
                    <button
                      key={l}
                      onClick={() => { switchLocale(l); setLangOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors duration-200 ${
                        locale === l
                          ? 'text-[var(--color-gold)] font-semibold'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)]'
                      }`}
                    >
                      <span>{localeFullNames[l]}</span>
                      {locale === l && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          </nav>

          {/* Mobile: search + user + locale switcher */}
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

            {/* User (mobile) */}
            <div ref={userMenuRef} className="relative">
              <UserButton mobile />
              {/* Mobile user menu — rendered here so ref catches outside clicks */}
              {user && userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="px-4 py-2 border-b border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    {tAuth('signOut')}
                  </button>
                </div>
              )}
            </div>

            <div ref={langRefMobile} className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs tracking-wider rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
                aria-label="Switch language"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="font-semibold">{localeLabels[locale]}</span>
                <svg className={`w-3 h-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5l3 3 3-3" />
                </svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-[140px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {localeList.map((l) => (
                    <button
                      key={l}
                      onClick={() => { switchLocale(l); setLangOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors duration-200 ${
                        locale === l
                          ? 'text-[var(--color-gold)] font-semibold'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)]'
                      }`}
                    >
                      <span>{localeFullNames[l]}</span>
                      {locale === l && (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
