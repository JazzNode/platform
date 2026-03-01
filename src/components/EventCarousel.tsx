'use client';

import { useState, useEffect, useCallback } from 'react';

interface EventSlide {
  date: string;
  title: string;
}

/**
 * Auto-rotating carousel for upcoming events inside city cards.
 * Fades out upward → swaps content → fades in from below.
 * Shows static content when there's only 1 event.
 */
export default function EventCarousel({
  events,
  label,
}: {
  events: EventSlide[];
  label: string;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading'>('visible');

  const advance = useCallback(() => {
    setPhase('fading');
    setTimeout(() => {
      setIndex((i) => (i + 1) % events.length);
      setPhase('visible');
    }, 350);
  }, [events.length]);

  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [events.length, advance]);

  const event = events[index];
  if (!event) return null;

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
          <p className="text-xs uppercase tracking-widest text-gold">
            {label} · {event.date}
          </p>
          <p className="text-sm text-[var(--foreground)] truncate">
            {event.title}
          </p>
        </div>
      </div>
    </div>
  );
}
