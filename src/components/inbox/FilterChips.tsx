import { useTranslations } from 'next-intl';

export type FilterType = 'all' | 'hq' | 'artist' | 'venue' | 'dm';

const FILTERS: FilterType[] = ['all', 'hq', 'artist', 'venue', 'dm'];

const LABEL_KEYS: Record<FilterType, string> = {
  all: 'filterAll',
  hq: 'filterHQ',
  artist: 'filterArtist',
  venue: 'filterVenue',
  dm: 'filterDM',
};

interface FilterChipsProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

export default function FilterChips({ active, onChange }: FilterChipsProps) {
  const t = useTranslations('artistStudio');
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
      {FILTERS.map((f) => {
        const isDisabled = f === 'venue'; // future — not yet implemented
        return (
          <button
            key={f}
            onClick={() => !isDisabled && onChange(f)}
            disabled={isDisabled}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              active === f
                ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                : isDisabled
                  ? 'text-[var(--muted-foreground)]/30 cursor-not-allowed'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            {t(LABEL_KEYS[f])}
          </button>
        );
      })}
    </div>
  );
}
