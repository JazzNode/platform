'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface EventSlide {
  date: string;
  title: string;
  href: string;
}

/**
 * Auto-rotating carousel for upcoming events inside city cards.
 * Fades out upward → swaps content → fades in from below.
 * Shows 2 events per slide and stays static when only 1 slide exists.
 */
export default function EventCarousel({
  events,
  label,
}: {
  events: EventSlide[];
  label: string;
}) {
  const slides = [];
  for (let i = 0; i < events.length; i += 2) {
    slides.push(events.slice(i, i + 2));
  }

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading'>('visible');

  const advance = useCallback(() => {
    setPhase('fading');
    setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setPhase('visible');
    }, 350);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [slides.length, advance]);

  const currentSlide = slides[index];
  if (!currentSlide || currentSlide.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 mb-5 py-3 border-t border-[var(--border)]">
      <span className="pulse-dot mt-1.5 shrink-0" />
      <div className="min-w-0 overflow-hidden">
        <div
          className={`transition-all duration-300 ${
            phase === 'visible'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-1'
          }`}
        >
          {currentSlide.map((event, slideIndex) => (
            <Link
              key={`${event.date}-${event.title}-${slideIndex}`}
              href={event.href}
              className={`group block ${slideIndex === 0 ? '' : 'mt-3 pt-3 border-t border-[var(--border)]/60'}`}
            >
              <p className="text-xs uppercase tracking-widest text-gold transition-colors duration-300 group-hover:text-[var(--color-gold-bright)]">
                {label} · {event.date}
              </p>
              <p className="text-sm text-[var(--foreground)] truncate transition-colors duration-300 hover:text-gold">
                {event.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
