'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface VenueBasic {
  venue_id: string;
  display_name: string | null;
  name_local: string | null;
  name_en: string | null;
  photo_url: string | null;
  tier: number;
}

const NAV_ITEMS = [
  { key: 'overview', icon: 'chart', path: '' },
  { key: 'edit', icon: 'edit', path: '/edit' },
  { key: 'analytics', icon: 'analytics', path: '/analytics' },
  { key: 'premium', icon: 'megaphone', path: '/premium' },
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
    case 'megaphone':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'analytics':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 21H4.6c-.56 0-.84 0-1.05-.11a1 1 0 0 1-.44-.44C3 20.24 3 19.96 3 19.4V3" />
          <path d="M7 14l4-4 4 4 6-6" />
        </svg>
      );
    case 'edit':
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function VenueDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string; locale: string }>;
}) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  const [slug, setSlug] = useState('');
  const [venue, setVenue] = useState<VenueBasic | null>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Auth + permission check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (!loading && profile && slug) {
      if (!profile.claimed_venue_ids?.includes(slug) && profile.role !== 'admin') {
        router.push(`/${locale}/profile`);
      }
    }
  }, [loading, user, profile, slug, locale, router]);

  // Fetch venue basic info
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase
      .from('venues')
      .select('venue_id, display_name, name_local, name_en, photo_url, tier')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => {
        if (data) setVenue(data);
      });
  }, [slug]);

  if (loading || !slug) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const venueName = venue?.display_name || venue?.name_local || venue?.name_en || slug;
  const basePath = `/${locale}/profile/venue/${slug}`;

  const isActive = (navPath: string) => {
    const fullPath = basePath + navPath;
    if (navPath === '') {
      return pathname === fullPath || pathname === basePath;
    }
    return pathname.startsWith(fullPath);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex gap-0 lg:gap-8">
        {/* ─── Desktop Sidebar ─── */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 sticky top-24 self-start">
          {/* Venue identity */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              {venue?.photo_url ? (
                <img
                  src={venue.photo_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                  {venueName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{venueName}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {venue?.tier === 2 ? 'Premium' : venue?.tier === 1 ? 'Claimed' : 'Free'}
                </p>
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
                </Link>
              );
            })}
          </nav>

          {/* View venue page link */}
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <Link
              href={`/${locale}/venues/${slug}`}
              className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span>{t('viewVenuePage')}</span>
            </Link>
          </div>
        </aside>

        {/* ─── Mobile Top Bar ─── */}
        <div className="lg:hidden fixed top-[60px] left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]">
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
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
                </Link>
              );
            })}
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <main className="flex-1 min-w-0 pt-14 lg:pt-0">
          {/* Mobile Identity */}
          <div className="lg:hidden mb-6 flex items-center gap-3">
            {venue?.photo_url ? (
              <img
                src={venue.photo_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm font-bold text-[var(--muted-foreground)]">
                {venueName.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{venueName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {venue?.tier === 2 ? 'Premium' : venue?.tier === 1 ? 'Claimed' : 'Free'}
              </p>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
