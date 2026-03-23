'use client';

import { useState, useEffect } from 'react';
import ImageLightbox from './ImageLightbox';

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
}

/**
 * Horizontal scrollable photo gallery strip for the venue detail page.
 * Fetches photos client-side; renders nothing when empty.
 */
export default function VenuePhotoGallery({
  venueId,
  label,
}: {
  venueId: string;
  label: string;
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/venue/gallery?venueId=${encodeURIComponent(venueId)}`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.photos ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [venueId]);

  if (!loaded || photos.length === 0) return null;

  const urls = photos.map((p) => p.photo_url);

  return (
    <>
      {lightboxIndex !== null && (
        <ImageLightbox
          images={urls}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <section className="border-t border-[var(--border)] pt-12">
        <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
          <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {label}
        </h2>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="shrink-0 rounded-xl overflow-hidden relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
            >
              <img
                src={photo.photo_url}
                alt={photo.caption || ''}
                className="h-[240px] sm:h-[280px] w-auto object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-[var(--color-gold)]/40 transition-all duration-300" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
