'use client';

import { useEffect } from 'react';

export default function PageViewTracker({ artistId }: { artistId: string }) {
  useEffect(() => {
    if (!artistId) return;

    // Dedupe: skip if same artist tracked in last 60 seconds
    const key = `pv_${artistId}`;
    const last = localStorage.getItem(key);
    if (last && Date.now() - parseInt(last, 10) < 60000) return;

    localStorage.setItem(key, Date.now().toString());

    fetch('/api/artist/track-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artistId }),
    }).catch(() => {});
  }, [artistId]);

  return null;
}
