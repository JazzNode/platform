'use client';

import type { BadgeProgress } from '@/lib/badges';

// Badge icon mapping — reuses existing icons from BadgeDock + new ones for user badges
const BADGE_ICONS: Record<string, React.ReactNode> = {
  // User — Milestones
  usr_first_follow: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  usr_super_fan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  usr_scene_scout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  usr_city_explorer: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  usr_night_owl: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  // User — Community
  usr_profile_complete: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  usr_first_message: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  usr_social_butterfly: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

function BadgeIcon({ badgeId, earned }: { badgeId: string; earned: boolean }) {
  const icon = BADGE_ICONS[badgeId];
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
      earned
        ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
        : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
    }`}>
      {icon || (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="7" />
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
        </svg>
      )}
    </div>
  );
}

export default function BadgeCard({ badge }: { badge: BadgeProgress }) {
  const { badge_id, name, description, earned, progress } = badge;
  const progressPct = progress
    ? Math.min(100, Math.round((progress.current / progress.target) * 100))
    : earned ? 100 : 0;

  return (
    <div className={`relative rounded-2xl border p-4 transition-all ${
      earned
        ? 'border-[var(--color-gold)]/40 bg-[var(--color-gold)]/[0.04] shadow-[0_0_20px_rgba(200,168,78,0.08)]'
        : 'border-[var(--border)] bg-[var(--card)]'
    }`}>
      {/* Badge content */}
      <div className="flex items-start gap-3">
        <BadgeIcon badgeId={badge_id} earned={earned} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-semibold truncate ${
              earned ? 'text-[var(--color-gold)]' : 'text-[var(--muted-foreground)]'
            }`}>
              {name}
            </h3>
            {earned && (
              <svg className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </div>
          <p className={`text-xs mt-0.5 line-clamp-2 ${
            earned ? 'text-[#C4BFB3]' : 'text-[var(--muted-foreground)]'
          }`}>
            {description}
          </p>
        </div>
      </div>

      {/* Progress bar (only for non-binary, unearned badges) */}
      {progress && !earned && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--muted-foreground)]">
              {progress.current}/{progress.target}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-gold)]/60 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Earned glow indicator */}
      {earned && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
          <span className="text-[10px] text-[var(--color-gold)]/70">
            {badge.earned_at
              ? new Date(badge.earned_at).toLocaleDateString()
              : ''}
          </span>
        </div>
      )}
    </div>
  );
}
