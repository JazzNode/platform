'use client';

import { useTranslations } from 'next-intl';
import VenueCommentsProvider, { useVenueComments } from './VenueCommentsProvider';
import VenueCommentForm from './VenueCommentForm';
import VenueCommentList from './VenueCommentList';

function VenueCommentsInner({ venueId }: { venueId: string }) {
  const t = useTranslations('reviews');
  const { commentCount } = useVenueComments();

  return (
    <section className="border-t border-[var(--border)] pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-2xl font-bold">{t('sectionTitle')}</h2>
        {commentCount > 0 && (
          <span className="text-sm text-[var(--muted-foreground)]">
            {t('commentCount', { count: commentCount })}
          </span>
        )}
      </div>

      {/* Always-visible comment input / expanded form */}
      <VenueCommentForm venueId={venueId} />

      {/* Comment list */}
      {commentCount > 0 && <VenueCommentList />}
    </section>
  );
}

export default function VenueCommentsSection({ venueId }: { venueId: string }) {
  return (
    <VenueCommentsProvider venueId={venueId}>
      <VenueCommentsInner venueId={venueId} />
    </VenueCommentsProvider>
  );
}
