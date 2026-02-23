'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function HeroReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const lines = ref.current?.querySelectorAll('.hero-line');
      if (!lines) return;

      gsap.set(lines, { y: 60, opacity: 0 });
      gsap.to(lines, {
        y: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.15,
        delay: 0.2,
      });

      // Tagline fade
      const tagline = ref.current?.querySelector('.hero-tagline');
      if (tagline) {
        gsap.set(tagline, { y: 30, opacity: 0 });
        gsap.to(tagline, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          delay: 0.8,
        });
      }

      // Stats container — fade in after tagline
      const statsContainer = ref.current?.querySelector('.hero-stats');
      if (statsContainer) {
        gsap.set(statsContainer, { y: 30, opacity: 0 });
        gsap.to(statsContainer, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          delay: 1.2,
        });
        
        // Stagger individual stat items — appear first, THEN trigger countup
        const statItems = statsContainer.querySelectorAll('.hero-stat-item');
        if (statItems.length) {
          gsap.set(statItems, { y: 20, opacity: 0 });
          gsap.to(statItems, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.15,
            delay: 1.3,
            onComplete: () => {
              // Dispatch custom event to start CountUp animations
              window.dispatchEvent(new CustomEvent('hero-stats-visible'));
            },
          });
        }
      }
    }, ref);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
