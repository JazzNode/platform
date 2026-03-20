'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import VenueReviewsProvider, { useVenueReviews } from './VenueReviewsProvider';
import VenueReviewForm from './VenueReviewForm';
import VenueReviewList from './VenueReviewList';

function VenueReviewsInner() {
  const t = useTranslations('reviews');
  const { reviewCount, averageRating, loading } = useVenueReviews();
  const [formOpen, setFormOpen] = useState(false);

  const isEmpty = !loading && reviewCount === 0;

  return (
    <section className="border-t border-[var(--border)] pt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-serif text-2xl font-bold">{t('sectionTitle')}</h2>
        {/* Show summary + button when reviews exist */}
        {reviewCount > 0 && !formOpen && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gold">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-lg font-bold text-gold tabular-nums">{averageRating}</span>
              <span className="text-sm text-[var(--muted-foreground)] ml-1">{t('reviewCount', { count: reviewCount })}</span>
            </div>
            <VenueReviewForm mode="button" onFormOpen={() => setFormOpen(true)} onFormClose={() => setFormOpen(false)} />
          </div>
        )}
      </div>

      {/* Empty state: centered star CTA */}
      {isEmpty && !formOpen && (
        <VenueReviewForm mode="cta" onFormOpen={() => setFormOpen(true)} onFormClose={() => setFormOpen(false)} />
      )}

      {/* Form when opened from empty CTA */}
      {isEmpty && formOpen && (
        <VenueReviewForm mode="cta" onFormOpen={() => setFormOpen(true)} onFormClose={() => setFormOpen(false)} />
      )}

      {/* Form when opened from button (has reviews) */}
      {reviewCount > 0 && formOpen && (
        <VenueReviewForm mode="button" onFormOpen={() => setFormOpen(true)} onFormClose={() => setFormOpen(false)} />
      )}

      {/* Review list (only when reviews exist) */}
      {reviewCount > 0 && <VenueReviewList />}
    </section>
  );
}

export default function VenueReviewsSection({ venueId }: { venueId: string }) {
  return (
    <VenueReviewsProvider venueId={venueId}>
      <VenueReviewsInner />
    </VenueReviewsProvider>
  );
}
