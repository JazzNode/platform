'use client';

import { useState, useEffect } from 'react';
import ArtistShoutoutsSection from '@/components/ArtistShoutoutsSection';

export default function ArtistShoutoutsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  if (!slug) return null;
  return (
    <div className="space-y-6">
      <ArtistShoutoutsSection artistId={slug} hideForm />
    </div>
  );
}
