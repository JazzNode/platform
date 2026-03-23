'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ImageLightboxProps {
  /** Array of image URLs */
  images: string[];
  /** Index of the initially selected image */
  initialIndex?: number;
  /** Called when the lightbox is closed */
  onClose: () => void;
}

/**
 * Full-screen image lightbox with keyboard & touch navigation.
 * Supports single image (legacy) and multi-image gallery mode.
 */
export default function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [fadeIn, setFadeIn] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const total = images.length;
  const hasPrev = current > 0;
  const hasNext = current < total - 1;

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= total) return;
      setFadeIn(false);
      setTimeout(() => {
        setCurrent(idx);
        setFadeIn(true);
      }, 150);
    },
    [total],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) goTo(current - 1);
      if (e.key === 'ArrowRight' && hasNext) goTo(current + 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goTo, current, hasPrev, hasNext]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 60) {
      if (deltaX > 0 && hasPrev) goTo(current - 1);
      if (deltaX < 0 && hasNext) goTo(current + 1);
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Counter */}
      {total > 1 && (
        <div className="absolute top-4 left-4 text-sm text-white/70 font-mono z-10">
          {current + 1} / {total}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Previous arrow */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(current - 1); }}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 hover:text-[var(--color-gold)] transition-colors z-10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Next arrow */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goTo(current + 1); }}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 hover:text-[var(--color-gold)] transition-colors z-10"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={images[current]}
          alt=""
          className="max-w-full max-h-[85vh] rounded-xl object-contain transition-opacity duration-150"
          style={{ opacity: fadeIn ? 1 : 0 }}
        />
      </div>

      {/* Dots */}
      {total > 1 && total <= 20 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-4 h-1.5 bg-[var(--color-gold)]'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
