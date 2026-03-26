'use client';

import { useState, useEffect } from 'react';
import ImageLightbox from '@/components/ImageLightbox';

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
}

/**
 * Bento-grid photo gallery for venue pages.
 * First photo is large (2/3 width), remaining stack in a grid.
 * Falls back to horizontal scroll when 4+ photos.
 */
export default function VenueGallery({
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
        <h2 className="font-serif text-xl sm:text-2xl font-bold mb-6 flex items-center gap-3">
          <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {label}
        </h2>

        {/* Bento Grid for 2-5 photos */}
        {photos.length >= 2 && photos.length <= 5 ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 h-[280px] sm:h-[360px]">
            {/* Large feature photo */}
            <button
              type="button"
              onClick={() => setLightboxIndex(0)}
              className="col-span-2 relative rounded-xl overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <img
                src={photos[0].photo_url}
                alt={photos[0].caption || ''}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-gold/40 transition-all duration-300" />
            </button>

            {/* Side stack */}
            <div className="flex flex-col gap-2 sm:gap-3">
              {photos.slice(1, 3).map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setLightboxIndex(i + 1)}
                  className="relative flex-1 rounded-xl overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || ''}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-gold/40 transition-all duration-300" />
                  {/* "View all" overlay on last visible photo if more photos exist */}
                  {i === 1 && photos.length > 3 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                      <span className="text-sm font-medium text-white">+{photos.length - 3}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Horizontal scroll for 1 or 6+ photos */
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="shrink-0 rounded-xl overflow-hidden relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || ''}
                  className="h-[240px] sm:h-[280px] w-auto object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-gold/40 transition-all duration-300" />
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
