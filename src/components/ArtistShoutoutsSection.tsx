'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import ArtistShoutoutsProvider, { useArtistShoutouts } from './ArtistShoutoutsProvider';
import ArtistShoutoutForm from './ArtistShoutoutForm';
import ArtistShoutoutList from './ArtistShoutoutList';

const TAG_EMOJIS: Record<string, string> = {
  great_musicianship: '\uD83C\uDFB5',
  amazing_live: '\uD83D\uDD25',
  great_collaborator: '\uD83E\uDD1D',
  creative: '\uD83D\uDCA1',
  great_teacher: '\uD83C\uDF93',
  inspiring: '\u2728',
  professional: '\uD83C\uDFAF',
  reliable: '\uD83D\uDCAA',
  beautiful_tone: '\uD83C\uDFB6',
};

function TagSummary() {
  const t = useTranslations('shoutouts');
  const { tagCounts, shoutoutCount } = useArtistShoutouts();

  if (shoutoutCount === 0) return null;

  // Sort by count descending, take top 5
  const sorted = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
      <span className="font-medium text-[var(--foreground)]">{t('whatPeopleSay')}:</span>
      {sorted.map(([tag, count]) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-[var(--muted)] border border-[var(--border)]"
        >
          <span>{TAG_EMOJIS[tag] || ''}</span>
          <span>{t(`tags.${tag}`)}</span>
          <span className="text-gold font-semibold">&times;{count}</span>
        </span>
      ))}
    </div>
  );
}

function EmptyState() {
  const t = useTranslations('shoutouts');
  const { shoutoutCount, loading } = useArtistShoutouts();

  if (loading || shoutoutCount > 0) return null;

  return (
    <div className="text-center py-8 text-sm text-[var(--muted-foreground)]">
      <p>{t('noShoutouts')}</p>
      <p className="mt-1 text-xs">{t('beFirst')}</p>
    </div>
  );
}

function ArtistShoutoutsInner({ artistId, hideForm }: { artistId: string; hideForm?: boolean }) {
  const t = useTranslations('shoutouts');
  const { shoutoutCount } = useArtistShoutouts();
  const { profile } = useAuth();

  const isOwner = profile?.claimed_artist_ids?.includes(artistId) || false;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-bold">{t('sectionTitle')}</h2>
        {shoutoutCount > 0 && (
          <span className="text-sm text-[var(--muted-foreground)]">
            {shoutoutCount} {t('peopleSay')}
          </span>
        )}
      </div>

      {/* Tag summary */}
      <div className="mb-4">
        <TagSummary />
      </div>

      {/* Form */}
      {!hideForm && <ArtistShoutoutForm artistId={artistId} />}

      {/* Empty state */}
      <EmptyState />

      {/* List */}
      {shoutoutCount > 0 && <ArtistShoutoutList isOwner={isOwner} />}
    </>
  );
}

export default function ArtistShoutoutsSection({ artistId, hideForm }: { artistId: string; hideForm?: boolean }) {
  return (
    <ArtistShoutoutsProvider artistId={artistId}>
      <ArtistShoutoutsInner artistId={artistId} hideForm={hideForm} />
    </ArtistShoutoutsProvider>
  );
}
