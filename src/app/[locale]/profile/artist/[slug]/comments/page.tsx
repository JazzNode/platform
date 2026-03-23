'use client';

import { useState, useEffect } from 'react';
import DashboardCommentsTab from '@/components/DashboardCommentsTab';

export default function ArtistCommentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState('');

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  if (!slug) return null;
  return <DashboardCommentsTab mode="artist" artistId={slug} />;
}
