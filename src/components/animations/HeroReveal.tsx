'use client';

import { useEffect, useRef } from 'react';

const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';

export default function HeroReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const lines = el.querySelectorAll<HTMLElement>('.hero-line');
    const tagline = el.querySelector<HTMLElement>('.hero-tagline');
    const statsContainer = el.querySelector<HTMLElement>('.hero-stats');
    const statItems = statsContainer?.querySelectorAll<HTMLElement>('.hero-stat-item');

    // Set initial hidden states
    lines.forEach((l) => { l.style.opacity = '0'; l.style.transform = 'translateY(60px)'; });
    if (tagline) { tagline.style.opacity = '0'; tagline.style.transform = 'translateY(30px)'; }
    if (statsContainer) { statsContainer.style.opacity = '0'; statsContainer.style.transform = 'translateY(30px)'; }
    statItems?.forEach((s) => { s.style.opacity = '0'; s.style.transform = 'translateY(20px)'; });

    // Small delay ensures the browser paints initial state before transitions begin.
    // More reliable than rAF across React strict-mode double-mounts.
    const kickoff = setTimeout(() => {
      // Lines stagger in (delay 0.2s, stagger 0.15s, duration 1.2s)
      lines.forEach((line, i) => {
        line.style.transition = `opacity 1.2s ${EASE_OUT}, transform 1.2s ${EASE_OUT}`;
        line.style.transitionDelay = `${0.2 + i * 0.15}s`;
        line.style.opacity = '1';
        line.style.transform = 'translateY(0)';
      });

      // Tagline (delay 0.8s, duration 1s)
      if (tagline) {
        tagline.style.transition = `opacity 1s ${EASE_OUT}, transform 1s ${EASE_OUT}`;
        tagline.style.transitionDelay = '0.8s';
        tagline.style.opacity = '1';
        tagline.style.transform = 'translateY(0)';
      }

      // Stats container (delay 1.2s, duration 1s)
      if (statsContainer) {
        statsContainer.style.transition = `opacity 1s ${EASE_OUT}, transform 1s ${EASE_OUT}`;
        statsContainer.style.transitionDelay = '1.2s';
        statsContainer.style.opacity = '1';
        statsContainer.style.transform = 'translateY(0)';
      }

      // Stat items stagger (delay 1.3s, stagger 0.15s, duration 0.8s)
      statItems?.forEach((item, i) => {
        item.style.transition = `opacity 0.8s ${EASE_OUT}, transform 0.8s ${EASE_OUT}`;
        item.style.transitionDelay = `${1.3 + i * 0.15}s`;
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
      });
    }, 50);

    // Dispatch custom event after stat items finish animating
    const lastItemDelay = 1.3 + ((statItems?.length || 1) - 1) * 0.15;
    const totalMs = (lastItemDelay + 0.8) * 1000 + 50; // +50 to account for kickoff delay
    const dispatch = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('hero-stats-visible'));
    }, totalMs);

    return () => {
      clearTimeout(kickoff);
      clearTimeout(dispatch);
    };
  }, []);

  return <div ref={ref}>{children}</div>;
}
