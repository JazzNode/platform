'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

const BASE_navItems = [
  { key: 'settings', icon: 'settings', path: '' },
  { key: 'badges', icon: 'badges', path: '/badges' },
  { key: 'inbox', icon: 'inbox', path: '/inbox' },
] as const;

const OWNER_navItems = [
  { key: 'members', icon: 'members', path: '/members' },
] as const;

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const c = className || 'w-5 h-5';
  switch (icon) {
    case 'settings':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'inbox':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    case 'badges':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      );
    case 'members':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, setShowComingSoon } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      setShowComingSoon({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      router.push('/');
    }
  }, [loading, user, router, setShowComingSoon]);

  // Fetch unread message count
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      try {
        // Count unread messages across all conversation types where user is participant
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .is('read_at', null)
          .neq('sender_id', user.id)
          .in('conversation_id',
            // subquery: conversations where this user is a participant
            (await supabase
              .from('conversations')
              .select('id')
              .or(`fan_user_id.eq.${user.id},user_b_id.eq.${user.id}`)
            ).data?.map(c => c.id) || []
          );
        if (!cancelled) setUnreadCount(count || 0);
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const basePath = `/${locale}/profile`;
  const displayName = profile?.display_name || user.email?.split('@')[0] || '';
  const avatarUrl = profile?.avatar_url;
  const isProfileOwner = profile?.role === 'owner';

  // Build nav items — owner gets extra "members" tab
  const navItems = [
    ...BASE_navItems,
    ...(isProfileOwner ? OWNER_navItems : []),
  ];

  const isActive = (navPath: string) => {
    const fullPath = basePath + navPath;
    if (navPath === '') {
      return pathname === fullPath || pathname === fullPath + '/';
    }
    return pathname.startsWith(fullPath);
  };

  // Don't show sidebar layout for artist/venue sub-dashboards
  if (pathname.includes('/profile/artist/') || pathname.includes('/profile/venue/')) {
    return <>{children}</>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-0 lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-24 self-start">
          {/* Identity */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                  {displayName.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{displayName}</p>
                <p className="text-xs text-[var(--muted-foreground)] capitalize">{profile?.role || 'member'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.key}
                  href={basePath + item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-semibold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                  }`}
                >
                  <NavIcon icon={item.icon} />
                  <span>{t(`nav_${item.key}`)}</span>
                  {item.key === 'inbox' && unreadCount > 0 && (
                    <span className="ml-auto bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* View public profile link */}
          {profile?.username && (
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <Link
                href={`/${locale}/user/${profile.username}`}
                className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>{t('viewPublicProfile')}</span>
              </Link>
            </div>
          )}
        </aside>

        {/* Mobile Top Bar */}
        <div className="lg:hidden fixed top-[60px] left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs text-[var(--muted-foreground)] truncate">
              <span className="font-semibold text-[var(--foreground)]">{displayName}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span className="capitalize">{profile?.role || 'member'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.key}
                  href={basePath + item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <NavIcon icon={item.icon} className="w-3.5 h-3.5" />
                  <span>{t(`nav_${item.key}`)}</span>
                  {item.key === 'inbox' && unreadCount > 0 && (
                    <span className="bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 min-w-0 pt-[5.5rem] lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
