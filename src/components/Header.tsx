'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearch } from './SearchProvider';
import { useAuth } from './AuthProvider';
import { useRegion } from './RegionProvider';

import { createClient } from '@/utils/supabase/client';
import { ACTIVE_COUNTRY_CODES } from '@/lib/regions';
import { useUnreadCount } from '@/hooks/useUnreadCount';

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
  const tRegions = useTranslations('regions');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { open: openSearch } = useSearch();
  const { user, profile, loading: authLoading, signOut, setShowAuthModal } = useAuth();
  const { region, setRegion, availableRegions } = useRegion();
  const [scrolled, setScrolled] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const selectorRefDesktop = useRef<HTMLDivElement>(null);
  const selectorRefMobile = useRef<HTMLDivElement>(null);
  const userMenuRefDesktop = useRef<HTMLDivElement>(null);
  const userMenuRefMobile = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close selector dropdown on outside click
  useEffect(() => {
    if (!selectorOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = selectorRefDesktop.current?.contains(t);
      const inMobile = selectorRefMobile.current?.contains(t);
      if (!inDesktop && !inMobile) setSelectorOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectorOpen]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!userMenuRefDesktop.current?.contains(t) && !userMenuRefMobile.current?.contains(t)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const handleUserIconClick = useCallback(() => {
    setShowAuthModal(true);
  }, [setShowAuthModal]);

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  const regionLabel = region
    ? (() => { try { return tRegions(region as 'TW'); } catch { return region; } })()
    : tRegions('worldMap');

  function renderSelectorDropdown() {
    return (
      <div className="absolute right-0 top-full mt-2 min-w-[180px] max-h-[70vh] overflow-y-auto rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
        {/* Region section */}
        <p className="px-4 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]/60 select-none">{tRegions('sectionRegion')}</p>
        <button
          onClick={() => { setRegion(null); }}
          className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors duration-200 ${
            !region
              ? 'text-[var(--color-gold)] font-semibold'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)]'
          }`}
        >
          <span>{tRegions('worldMap')}</span>
          {!region && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </button>
        {ACTIVE_COUNTRY_CODES.filter((code) => availableRegions.includes(code)).map((code) => (
          <button
            key={code}
            onClick={() => { setRegion(code); }}
            className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors duration-200 ${
              region === code
                ? 'text-[var(--color-gold)] font-semibold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)]'
            }`}
          >
            <span>{(() => { try { return tRegions(code as 'TW'); } catch { return code; } })()}</span>
            {region === code && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}

        {/* Divider */}
        <div className="my-1.5 border-t border-[var(--border)]" />

        {/* Language section */}
        <p className="px-4 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.15em] text-[var(--muted-foreground)]/60 select-none">{tRegions('sectionLanguage')}</p>
        {localeList.map((l) => (
          <button
            key={l}
            onClick={() => { switchLocale(l); setSelectorOpen(false); }}
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
    );
  }

  // Fetch display names for claimed artists/venues
  const [claimedArtists, setClaimedArtists] = useState<{ id: string; name: string }[]>([]);
  const [claimedVenues, setClaimedVenues] = useState<{ id: string; name: string }[]>([]);

  // Inbox unread count badge
  const { total: unreadTotal, breakdown: unreadBreakdown, notifications: unreadNotifications } = useUnreadCount(!!user);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();

    if (profile.claimed_artist_ids?.length) {
      supabase
        .from('artists')
        .select('artist_id, display_name, name_local, name_en')
        .in('artist_id', profile.claimed_artist_ids)
        .then(({ data }) => {
          if (data) setClaimedArtists(data.map((a) => ({
            id: a.artist_id,
            name: a.display_name || a.name_local || a.name_en || a.artist_id,
          })));
        });
    }

    if (profile.claimed_venue_ids?.length) {
      supabase
        .from('venues')
        .select('venue_id, display_name, name_local, name_en')
        .in('venue_id', profile.claimed_venue_ids)
        .then(({ data }) => {
          if (data) setClaimedVenues(data.map((v) => ({
            id: v.venue_id,
            name: v.display_name || v.name_local || v.name_en || v.venue_id,
          })));
        });
    }
  }, [profile]);

  // Derive effective claimed lists — empty when no profile
  const effectiveClaimedArtists = profile ? claimedArtists : [];
  const effectiveClaimedVenues = profile ? claimedVenues : [];

  const hasClaimed = effectiveClaimedArtists.length > 0 || effectiveClaimedVenues.length > 0;

  function renderUserMenuContent() {
    if (!user) return null;
    return (
      <>
        <div className="px-4 py-2 border-b border-[var(--border)]">
          <p className="text-xs text-[var(--muted-foreground)] truncate">{user.email}</p>
        </div>
        <button
          onClick={() => { router.push(`/${locale}/profile`); setUserMenuOpen(false); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
          <span className="flex-1">{tAuth('profile')}</span>
          {(unreadBreakdown.profile || 0) > 0 && (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[5px] rounded-full flex items-center justify-center leading-none">
              {unreadBreakdown.profile! > 99 ? '99+' : unreadBreakdown.profile}
            </span>
          )}
        </button>
        {hasClaimed && (
          <div className="border-t border-[var(--border)] py-1">
            {effectiveClaimedArtists.map((a) => (
              <button
                key={a.id}
                onClick={() => { router.push(`/${locale}/profile/artist/${encodeURIComponent(a.id)}`); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                <span className="truncate flex-1">{a.name}</span>
                {(unreadBreakdown[`artist:${a.id}`] || 0) > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[5px] rounded-full flex items-center justify-center leading-none shrink-0">
                    {unreadBreakdown[`artist:${a.id}`] > 99 ? '99+' : unreadBreakdown[`artist:${a.id}`]}
                  </span>
                )}
              </button>
            ))}
            {effectiveClaimedVenues.map((v) => (
              <button
                key={v.id}
                onClick={() => { router.push(`/${locale}/profile/venue/${encodeURIComponent(v.id)}`); setUserMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="truncate flex-1">{v.name}</span>
                {(unreadBreakdown[`venue:${v.id}`] || 0) > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[5px] rounded-full flex items-center justify-center leading-none shrink-0">
                    {unreadBreakdown[`venue:${v.id}`] > 99 ? '99+' : unreadBreakdown[`venue:${v.id}`]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {(profile?.role === 'admin' || profile?.role === 'owner') && (
          <div className="border-t border-[var(--border)] py-1">
            <button
              onClick={() => { router.push(`/${locale}/admin`); setUserMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--color-gold)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span className="flex-1">JazzNode HQ</span>
              {(unreadBreakdown.hq || 0) > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-[5px] rounded-full flex items-center justify-center leading-none shrink-0">
                  {unreadBreakdown.hq! > 99 ? '99+' : unreadBreakdown.hq}
                </span>
              )}
            </button>
          </div>
        )}
        <div className={hasClaimed ? 'border-t border-[var(--border)]' : ''}>
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
      </>
    );
  }

  /* Inbox shortcut icons — message bubble + bell, each with own badge */
  function renderInboxIcons() {
    if (!user) return null;
    return (
      <>
        {/* Inbox (messages) */}
        <Link
          href={`/${locale}/profile/inbox?tab=messages`}
          className="relative text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 p-1.5 rounded-lg hover:bg-[rgba(240,237,230,0.06)]"
          aria-label="Inbox"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          {(unreadBreakdown.profile || 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-[4px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--background)]">
              {unreadBreakdown.profile! > 99 ? '99+' : unreadBreakdown.profile}
            </span>
          )}
        </Link>
        {/* Notifications */}
        <Link
          href={`/${locale}/profile/inbox?tab=notifications`}
          className="relative text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 p-1.5 rounded-lg hover:bg-[rgba(240,237,230,0.06)]"
          aria-label="Notifications"
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadNotifications > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-[4px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--background)]">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Link>
      </>
    );
  }

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?';

  /* Shared user button render helper — called as function, NOT as <Component />,
     to avoid unmount/remount on every Header re-render */
  function renderUserButton(mobile?: boolean) {
    if (authLoading) return (
      <div className="w-7 h-7 rounded-full bg-[rgba(240,237,230,0.08)] animate-pulse" />
    );

    if (!user) {
      return (
        <button
          onClick={handleUserIconClick}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 p-1.5 rounded-lg hover:bg-[rgba(240,237,230,0.06)]"
          aria-label="Sign in"
        >
          <UserIcon className="w-[18px] h-[18px]" />
        </button>
      );
    }

    return (
      <div ref={mobile ? undefined : userMenuRefDesktop} className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="relative w-7 h-7 rounded-full overflow-visible bg-[var(--color-gold)] text-[#0A0A0A] text-xs font-bold flex items-center justify-center transition-opacity hover:opacity-90"
          aria-label="User menu"
        >
          <span className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center">
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="" width={28} height={28} className="w-full h-full object-cover" sizes="28px" />
            ) : (
              userInitial
            )}
          </span>
          {/* Management badge: artist + venue + hq unread */}
          {(() => {
            const mgmt = Object.entries(unreadBreakdown)
              .filter(([k]) => k !== 'profile')
              .reduce((sum, [, v]) => sum + v, 0);
            return mgmt > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-[4px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--background)]">
                {mgmt > 99 ? '99+' : mgmt}
              </span>
            ) : null;
          })()}
        </button>
        {userMenuOpen && !mobile && (
          <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            {renderUserMenuContent()}
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
            ? 'bg-[var(--background)]/80 backdrop-blur-xl border-b border-[rgba(var(--theme-glow-rgb),0.12)] shadow-[0_1px_20px_rgba(0,0,0,0.3)]'
            : 'bg-[var(--background)]/40 backdrop-blur-md border-b border-transparent'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
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

            {renderInboxIcons()}

            {renderUserButton()}

            <div ref={selectorRefDesktop} className="relative">
              <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs tracking-wider rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
                aria-label="Region & language"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="font-semibold">{regionLabel}</span>
                <svg className={`w-3 h-3 transition-transform duration-200 ${selectorOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5l3 3 3-3" />
                </svg>
              </button>
              {selectorOpen && renderSelectorDropdown()}
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

            {renderInboxIcons()}

            {/* User (mobile) */}
            <div ref={userMenuRefMobile} className="relative">
              {renderUserButton(true)}
              {/* Mobile user menu — rendered here so ref catches outside clicks */}
              {user && userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {renderUserMenuContent()}
                </div>
              )}
            </div>

            <div ref={selectorRefMobile} className="relative">
              <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs tracking-wider rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
                aria-label="Region & language"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <svg className={`w-3 h-3 transition-transform duration-200 ${selectorOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5l3 3 3-3" />
                </svg>
              </button>
              {selectorOpen && renderSelectorDropdown()}
            </div>
          </div>
        </div>
      </header>

    </>
  );
}
