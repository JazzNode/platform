'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-triggered fade-up animation using Intersection Observer.
 * Supports two modes:
 * - Container mode: animates the wrapper div itself
 * - Stagger mode: animates children with `.fade-up-item` class individually
 *
 * Drop-in replacement for the previous GSAP-based implementation.
 */
export default function FadeUp({
  children,
  className = '',
  stagger = 0.12,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Set initial hidden state on stagger children + observe
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = el.querySelectorAll<HTMLElement>('.fade-up-item');
    items.forEach((item) => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(24px)';
    });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animate stagger children when visible
  useEffect(() => {
    if (!visible || !ref.current) return;

    const items = ref.current.querySelectorAll<HTMLElement>('.fade-up-item');
    items.forEach((item, i) => {
      item.style.transition =
        'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)';
      item.style.transitionDelay = `${delay + i * stagger}s`;
      item.style.opacity = '1';
      item.style.transform = 'translateY(0)';
    });
  }, [visible, stagger, delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition:
          'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
