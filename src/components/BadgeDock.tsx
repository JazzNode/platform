'use client';

import { useState } from 'react';

interface BadgeItem {
  id: string;
  badgeId?: string;
  name: string;
  description?: string;
}

interface BadgeDockProps {
  badges: BadgeItem[];
}

const BADGE_ICONS: Record<string, React.ReactNode> = {
  art_gig_warrior: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 23c-1.1 0-1.99-.89-1.99-1.99h3.98c0 1.1-.89 1.99-1.99 1.99zm8-3H4v-1l2-3V10c0-3.08 1.64-5.64 4.5-6.32V3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v.68C16.36 4.36 18 6.92 18 10v6l2 3v1z" />
    </svg>
  ),
  art_local_hero: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L1 12h3v9h6v-6h4v6h6v-9h3L12 2z" />
    </svg>
  ),
  art_globetrotter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  art_accepting_students: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
    </svg>
  ),
  // Venue badges
  ven_jazz_hub: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  ),
  ven_genre_explorer: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  ven_crowd_magnet: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
};

function BadgeIcon({ badgeId }: { badgeId?: string }) {
  if (badgeId && BADGE_ICONS[badgeId]) {
    return <span className="shrink-0">{BADGE_ICONS[badgeId]}</span>;
  }
  return (
    <span className="shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </span>
  );
}

export default function BadgeDock({ badges }: BadgeDockProps) {
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);

  if (badges.length === 0) return null;

  return (
    <div className="relative">
      {/* Tooltip */}
      {hoveredBadge && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2 bg-[#1A1A1A] border border-[var(--border)] rounded-xl text-xs text-[#C4BFB3] whitespace-nowrap z-10 pointer-events-none">
          {hoveredBadge}
        </div>
      )}

      {/* Dock */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 px-4 bg-[#0A0A0A]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl no-scrollbar">
        {badges.map((badge) => (
          <div
            key={badge.id}
            onMouseEnter={() => setHoveredBadge(badge.description || badge.name)}
            onMouseLeave={() => setHoveredBadge(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs font-medium whitespace-nowrap cursor-default shrink-0 border border-[var(--color-gold)]/20 hover:border-[var(--color-gold)]/40 transition-colors"
          >
            <BadgeIcon badgeId={badge.badgeId} />
            {badge.name}
          </div>
        ))}
      </div>
    </div>
  );
}
