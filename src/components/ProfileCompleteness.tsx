'use client';

import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface ProfileCompletenessProps {
  artistId: string;
  artistSlug: string;
  hasPhoto: boolean;
  hasBio: boolean;
  hasSocialLinks: boolean;
  hasInstruments: boolean;
  hasTeaching: boolean;
  hasGear: boolean;
}

export default function ProfileCompleteness({
  artistId,
  artistSlug,
  hasPhoto,
  hasBio,
  hasSocialLinks,
  hasInstruments,
  hasTeaching,
  hasGear,
}: ProfileCompletenessProps) {
  const { profile } = useAuth();
  const t = useTranslations('common');

  // Only show to the artist owner
  const isOwner = profile?.claimed_artist_ids?.includes(artistId);
  if (!isOwner) return null;

  const fields = [
    { key: 'photo', done: hasPhoto },
    { key: 'bio', done: hasBio },
    { key: 'socialLinks', done: hasSocialLinks },
    { key: 'instruments', done: hasInstruments },
    { key: 'teaching', done: hasTeaching },
    { key: 'gear', done: hasGear },
  ];

  const doneCount = fields.filter((f) => f.done).length;
  const percentage = Math.round((doneCount / fields.length) * 100);

  if (percentage === 100) return null; // Fully complete — hide

  const firstMissing = fields.find((f) => !f.done);

  return (
    <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 mt-4 mx-1">
      <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
        {t('profileCompleteness')} {percentage}%
      </span>
      <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {firstMissing && (
        <Link
          href={`/profile/artist/${artistSlug}/edit`}
          className="text-[10px] text-gold font-semibold whitespace-nowrap hover:text-gold-bright transition-colors"
        >
          {t('addMissing')} ›
        </Link>
      )}
    </div>
  );
}
