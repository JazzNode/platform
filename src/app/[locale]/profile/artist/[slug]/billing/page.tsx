'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import BillingPanel from '@/components/billing/BillingPanel';

export default function ArtistBillingPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  if (!slug) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return <BillingPanel entityType="artist" entityId={slug} t={t} />;
}
