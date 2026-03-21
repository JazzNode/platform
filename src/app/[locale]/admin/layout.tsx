'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';

const NAV_ITEMS = [
  { key: 'overview', icon: 'chart', path: '' },
  { key: 'analytics', icon: 'trend', path: '/analytics' },
  { key: 'newEvents', icon: 'sparkle', path: '/new-events' },
  { key: 'inbox', icon: 'bell', path: '/inbox' },
  { key: 'members', icon: 'users', path: '/members' },
  { key: 'claims', icon: 'shield', path: '/claims' },
  { key: 'artistTiers', icon: 'music', path: '/artist-tiers' },
  { key: 'venueTiers', icon: 'house', path: '/venue-tiers' },
  { key: 'badges', icon: 'badge', path: '/badges' },
  { key: 'magazine', icon: 'magazine', path: '/magazine' },
  { key: 'released', icon: 'rocket', path: '/released' },
] as const;

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const c = className || 'w-5 h-5';
  switch (icon) {
    case 'chart':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      );
    case 'trend':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'music':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'house':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'users':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'badge':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15l-3.5 2 .9-3.9L6 10.1l4-.3L12 6l2 3.8 4 .3-3.4 3 .9 3.9z" />
          <path d="M8 21l1-6" />
          <path d="M16 21l-1-6" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
        </svg>
      );
    case 'magazine':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M8 7h8" />
          <path d="M8 11h6" />
        </svg>
      );
    case 'rocket':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('adminHQ');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();
  const { isAdmin, token } = useAdmin();
  const [unreadCount, setUnreadCount] = useState(0);

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || (profile?.role !== 'admin' && profile?.role !== 'owner'))) {
      router.push('/');
    }
  }, [loading, user, profile, router]);

  // Fetch unread notification + message count for inbox badge
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/notifications?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setUnreadCount(data.unread || 0);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading || !user || (profile?.role !== 'admin' && profile?.role !== 'owner')) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const basePath = `/${locale}/admin`;

  const isActive = (navPath: string) => {
    const fullPath = basePath + navPath;
    if (navPath === '') {
      return pathname === fullPath || pathname === fullPath + '/';
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-0 lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-24 self-start">
          {/* Identity */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-[var(--color-gold)]/15 flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">JazzNode HQ</p>
                <p className="text-xs text-[var(--muted-foreground)]">Admin</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
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
                  <span>{t(item.key)}</span>
                  {item.key === 'inbox' && unreadCount > 0 && (
                    <span className="ml-auto bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Top Bar */}
        <div className="lg:hidden fixed top-[60px] left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs text-[var(--muted-foreground)] truncate">
              <span className="font-semibold text-[var(--color-gold)]">JazzNode HQ</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span>Admin</span>
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-1.5 overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => {
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
                  <span>{t(item.key)}</span>
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
