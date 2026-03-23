'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import VenueCommentsProvider, { useVenueComments } from './VenueCommentsProvider';
import VenueCommentForm from './VenueCommentForm';
import VenueCommentList from './VenueCommentList';

function VenueCommentsInner({ venueId }: { venueId: string }) {
  const t = useTranslations('reviews');
  const { commentCount, loading } = useVenueComments();
  const [formOpen, setFormOpen] = useState(false);

  const isEmpty = !loading && commentCount === 0;

  return (
    <section className="border-t border-[var(--border)] pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-2xl font-bold">{t('sectionTitle')}</h2>
        {commentCount > 0 && !formOpen && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--muted-foreground)]">
              {t('commentCount', { count: commentCount })}
            </span>
            <VenueCommentForm
              venueId={venueId}
              onFormOpen={() => setFormOpen(true)}
              onFormClose={() => setFormOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Empty state CTA */}
      {isEmpty && !formOpen && (
        <div className="flex flex-col items-center py-8">
          <p className="text-sm text-[var(--muted-foreground)] mb-4">{t('emptyCta')}</p>
          <VenueCommentForm
            venueId={venueId}
            onFormOpen={() => setFormOpen(true)}
            onFormClose={() => setFormOpen(false)}
          />
        </div>
      )}

      {/* Form when opened from empty state */}
      {isEmpty && formOpen && (
        <VenueCommentForm
          venueId={venueId}
          onFormOpen={() => setFormOpen(true)}
          onFormClose={() => setFormOpen(false)}
        />
      )}

      {/* Form when opened from header button */}
      {commentCount > 0 && formOpen && (
        <VenueCommentForm
          venueId={venueId}
          onFormOpen={() => setFormOpen(true)}
          onFormClose={() => setFormOpen(false)}
        />
      )}

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
