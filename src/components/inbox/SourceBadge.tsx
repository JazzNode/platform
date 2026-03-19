import { useTranslations } from 'next-intl';

type BadgeType = 'hq' | 'artist' | 'venue';

const STYLES: Record<BadgeType, string> = {
  hq: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  artist: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  venue: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
};

const LABEL_KEYS: Record<BadgeType, string> = {
  hq: 'badgeHQ',
  artist: 'badgeArtist',
  venue: 'badgeVenue',
};

export default function SourceBadge({ type }: { type: BadgeType | null }) {
  const t = useTranslations('artistStudio');
  if (!type) return null;
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border whitespace-nowrap ${STYLES[type]}`}>
      {t(LABEL_KEYS[type])}
    </span>
  );
}
