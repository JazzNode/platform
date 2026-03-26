'use client';

import { BADGE_ICONS } from '@/components/BadgeCard';

interface HeroBadgeIconsProps {
  badges: { badge_id: string; name: string }[];
  maxShow?: number;
  availableForHire?: boolean;
  acceptingStudents?: boolean;
  hireLabel?: string;
  studentsLabel?: string;
}

export default function HeroBadgeIcons({
  badges,
  maxShow = 5,
  availableForHire,
  acceptingStudents,
  hireLabel = 'Available for Hire',
  studentsLabel = 'Accepting Students',
}: HeroBadgeIconsProps) {
  if (badges.length === 0 && !availableForHire && !acceptingStudents) return null;

  const visible = badges.slice(0, maxShow);
  const overflow = badges.length - maxShow;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Earned badge icons — SVG, gold style */}
      {visible.map((b) => (
        <a
          key={b.badge_id}
          href="#badges-section"
          className="group/badge relative inline-flex items-center justify-center w-6 h-6 rounded-md bg-gold/10 text-gold/80 shrink-0 hover:bg-gold/25 hover:text-gold hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <span className="[&_svg]:!w-3.5 [&_svg]:!h-3.5">
            {BADGE_ICONS[b.badge_id] || BADGE_ICONS.art_in_the_house}
          </span>
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1a18] px-2 py-1 text-[10px] text-gold/90 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 shadow-lg border border-gold/10 z-20">
            {b.name}
          </span>
        </a>
      ))}
      {overflow > 0 && (
        <a
          href="#badges-section"
          className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gold/10 text-[10px] text-gold/60 hover:bg-gold/25 hover:text-gold hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          +{overflow}
        </a>
      )}

      {/* Separator */}
      {badges.length > 0 && (availableForHire || acceptingStudents) && (
        <span className="w-px h-5 bg-[var(--border)] mx-1" />
      )}

      {/* Status pills */}
      {availableForHire && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-emerald-400/8 text-emerald-400 border border-emerald-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {hireLabel}
        </span>
      )}
      {acceptingStudents && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-blue-400/8 text-blue-400 border border-blue-400/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          {studentsLabel}
        </span>
      )}
    </div>
  );
}
