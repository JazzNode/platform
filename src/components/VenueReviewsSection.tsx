'use client';

import { useTranslations } from 'next-intl';
import VenueReviewsProvider from './VenueReviewsProvider';
import VenueReviewForm from './VenueReviewForm';
import VenueReviewList from './VenueReviewList';

export default function VenueReviewsSection({ venueId }: { venueId: string }) {
  const t = useTranslations('reviews');

  return (
    <VenueReviewsProvider venueId={venueId}>
      <section className="border-t border-[var(--border)] pt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl font-bold">{t('sectionTitle')}</h2>
          <VenueReviewForm />
        </div>
        <VenueReviewList />
      </section>
    </VenueReviewsProvider>
  );
}
