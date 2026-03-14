'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAdmin } from '@/components/AdminProvider';

interface Stats {
  counts: {
    artists: number;
    venues: number;
    events: number;
    cities: number;
    users: number;
    pendingClaims: number;
    approvedClaims: number;
    follows: number;
  };
  recentClaims: {
    claim_id: string;
    user_id: string;
    target_type: 'artist' | 'venue';
    target_id: string;
    status: string;
    submitted_at: string;
    user_display: string | null;
  }[];
  recentAuditLogs: {
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    admin_user_id: string;
    admin_display: string | null;
  }[];
}

function StatCard({ label, value, icon, href }: { label: string; value: number; icon: React.ReactNode; href?: string }) {
  const content = (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--color-gold)]/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[var(--muted-foreground)]">{icon}</span>
      </div>
      <p className="text-2xl font-bold font-serif text-[var(--foreground)]">{value.toLocaleString()}</p>
      <p className="text-xs text-[var(--muted-foreground)] mt-1 uppercase tracking-widest">{label}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'pending'
      ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
      : status === 'approved'
        ? 'bg-green-400/10 text-green-400 border-green-400/20'
        : 'bg-red-400/10 text-red-400 border-red-400/20';

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${styles}`}>
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const { token } = useAdmin();
  const locale = useLocale();
  const t = useTranslations('adminHQ');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading || !stats) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const { counts } = stats;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold">{t('dashboardTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('dashboardDescription')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('statArtists')}
          value={counts.artists}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          }
        />
        <StatCard
          label={t('statVenues')}
          value={counts.venues}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />
        <StatCard
          label={t('statEvents')}
          value={counts.events}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          label={t('statCities')}
          value={counts.cities}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
            </svg>
          }
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('statUsers')}
          value={counts.users}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label={t('statPendingClaims')}
          value={counts.pendingClaims}
          href={`/${locale}/admin/claims`}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          }
        />
        <StatCard
          label={t('statApprovedClaims')}
          value={counts.approvedClaims}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <StatCard
          label={t('statFollows')}
          value={counts.follows}
          icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          }
        />
      </div>

      {/* Recent Claims */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold">{t('recentClaims')}</h2>
          <Link
            href={`/${locale}/admin/claims`}
            className="text-xs text-[var(--color-gold)] hover:underline uppercase tracking-widest"
          >
            {t('viewAll')}
          </Link>
        </div>

        {stats.recentClaims.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-4">{t('noClaims')}</p>
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
            {stats.recentClaims.map((claim) => (
              <div key={claim.claim_id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {claim.user_display || claim.user_id?.slice(0, 8)}
                    <span className="text-[var(--muted-foreground)] font-normal mx-2">&rarr;</span>
                    <Link
                      href={`/${locale}/${claim.target_type === 'artist' ? 'artists' : 'venues'}/${claim.target_id}`}
                      className="text-[var(--color-gold)] hover:underline"
                    >
                      {claim.target_id}
                    </Link>
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {new Date(claim.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={claim.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Audit Logs */}
      {stats.recentAuditLogs.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-bold">{t('recentActivity')}</h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
            {stats.recentAuditLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{log.admin_display || 'Admin'}</span>
                    <span className="text-[var(--muted-foreground)] mx-2">{log.action}</span>
                    <span className="text-[var(--color-gold)]">{log.entity_type}/{log.entity_id}</span>
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
