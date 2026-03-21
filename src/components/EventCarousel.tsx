'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface EventSlide {
  date: string;
  title: string;
  href?: string;
}

/**
 * Auto-rotating carousel for upcoming events inside city cards.
 * Shows 2 events at a time with staggered fade-in/out animation.
 * Shows static content when there are ≤2 events.
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
  const pageSize = 2;

  const advance = useCallback(() => {
    setPhase('fading');
    setTimeout(() => {
      setIndex((i) => (i + pageSize) % events.length);
      setPhase('visible');
    }, 600);
  }, [events.length]);

  useEffect(() => {
    if (events.length <= pageSize) return;
    const timer = setInterval(advance, 5500);
    return () => clearInterval(timer);
  }, [events.length, advance]);

  // Get current page of events (up to 2)
  const currentEvents: EventSlide[] = [];
  for (let i = 0; i < pageSize && i < events.length; i++) {
    currentEvents.push(events[(index + i) % events.length]);
  }

  if (currentEvents.length === 0) return null;

  return (
    <div className="mb-5 py-3 border-t border-[var(--border)]">
      <p className="text-xs uppercase tracking-widest text-gold mb-3">
        {label}
      </p>
      <div className="space-y-2.5">
        {currentEvents.map((event, i) => {
          const content = (
            <div
              className="min-w-0 transition-all duration-500 ease-in-out"
              style={{
                opacity: phase === 'visible' ? 1 : 0,
                transform: phase === 'visible' ? 'translateY(0)' : 'translateY(-6px)',
                transitionDelay: phase === 'visible' ? `${i * 200}ms` : `${i * 80}ms`,
              }}
            >
              <p className="text-[11px] text-[var(--muted-foreground)] mb-0.5">
                {event.date}
              </p>
              <p className="text-sm text-[var(--foreground)] sm:truncate leading-snug group-hover/event:text-gold transition-colors duration-300">
                {event.title}
              </p>
            </div>
          );

          if (event.href) {
            return (
              <Link
                key={i}
                href={event.href}
                className="group/event block"
              >
                {content}
              </Link>
            );
          }
          return <div key={i}>{content}</div>;
        })}
      </div>
    </div>
  );
}
