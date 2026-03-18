'use client';

import type { BadgeProgress } from '@/lib/badges';
import BadgeCard from './BadgeCard';

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  milestone: { icon: '🏆', color: 'text-[var(--color-gold)]' },
  community: { icon: '💬', color: 'text-blue-400' },
  recognition: { icon: '🎵', color: 'text-[var(--color-gold)]' },
  venue_excellence: { icon: '🏠', color: 'text-[var(--color-gold)]' },
};

interface BadgeCategorySectionProps {
  title: string;
  categoryKey: string;
  badges: BadgeProgress[];
  /** When true, only earned badges are shown and unearned ones are hidden */
  earnedOnly?: boolean;
}

export default function BadgeCategorySection({
  title,
  categoryKey,
  badges,
  earnedOnly = false,
}: BadgeCategorySectionProps) {
  if (badges.length === 0) return null;

  const meta = CATEGORY_META[categoryKey] || { icon: '🎯', color: 'text-[var(--foreground)]' };
  const earnedCount = badges.filter(b => b.earned).length;
  const displayBadges = earnedOnly ? badges.filter(b => b.earned) : badges;

  if (earnedOnly && displayBadges.length === 0) return null;

  return (
    <section>
      {/* Category header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.icon}</span>
          <h2 className={`text-base font-bold ${meta.color}`}>{title}</h2>
        </div>
        <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-full">
          {earnedOnly ? earnedCount : `${earnedCount}/${badges.length}`}
        </span>
      </div>

      {/* Badge grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayBadges.map((badge) => (
          <BadgeCard key={badge.badge_id} badge={badge} />
        ))}
      </div>
    </section>
  );
}
