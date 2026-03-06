'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slides = [];
  for (let i = 0; i < events.length; i += 2) {
    slides.push(events.slice(i, i + 2));
  }

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading' | 'entering'>('visible');

  const advance = useCallback(() => {
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);

    setPhase('fading');
    fadeTimeoutRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setPhase('entering');

      enterTimeoutRef.current = setTimeout(() => {
        setPhase('visible');
      }, 40);
    }, 240);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [slides.length, advance]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
    };
  }, []);

  const currentSlide = slides[index];
  if (!currentSlide || currentSlide.length === 0) return null;

  return (
    <div className="mb-5 py-3 border-t border-[var(--border)]">
      <div className="min-w-0 overflow-hidden">
        {currentSlide.map((event, slideIndex) => {
          const transitionDelay = slideIndex === 0 ? '0ms' : phase === 'visible' ? '110ms' : '70ms';
          const phaseClass = phase === 'fading'
            ? 'opacity-0 -translate-y-1'
            : phase === 'entering'
              ? 'opacity-0 translate-y-2'
              : 'opacity-100 translate-y-0';
          const dividerClass = phase === 'visible' ? 'opacity-100' : 'opacity-0';
          const dividerDelay = slideIndex === 0 ? '0ms' : phase === 'visible' ? '170ms' : '20ms';

          return (
            <Link
              key={`${event.date}-${event.title}-${slideIndex}`}
              href={event.href}
              className={`group/event block transition-all duration-[420ms] ease-out ${phaseClass} ${slideIndex === 0 ? '' : 'mt-3 pt-3'}`}
              style={{ transitionDelay }}
            >
              {slideIndex > 0 && (
                <div
                  className={`mb-3 h-px bg-[var(--border)]/60 transition-opacity duration-300 ${dividerClass}`}
                  style={{ transitionDelay: dividerDelay }}
                />
              )}
              <p className="text-xs uppercase tracking-[0.22em] text-gold transition-colors duration-300 group-hover/event:text-[var(--color-gold-bright)]">
                {label} · {event.date}
              </p>
              <p className="text-sm text-[var(--foreground)] truncate transition-colors duration-300 group-hover/event:text-gold">
                {event.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
