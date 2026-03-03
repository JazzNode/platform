'use client';

import { useEffect, useRef } from 'react';

const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

export default function ManifestoReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const accent = el.querySelector<HTMLElement>('.manifesto-accent');
    const lines = el.querySelectorAll<HTMLElement>('.manifesto-line');
    const attr = el.querySelector<HTMLElement>('.manifesto-attr');

    // Set initial hidden states
    if (accent) {
      accent.style.transform = 'scaleY(0)';
      accent.style.transformOrigin = 'top';
    }
    lines.forEach((l) => { l.style.opacity = '0'; l.style.transform = 'translateY(20px)'; });
    if (attr) { attr.style.opacity = '0'; attr.style.transform = 'translateX(-8px)'; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        // Gold accent line grows (duration 1.4s)
        if (accent) {
          accent.style.transition = `transform 1.4s ${EASE_IN_OUT}`;
          accent.style.transform = 'scaleY(1)';
        }

        // Lines stagger in (delay 0.3s + i * 0.35s, duration 1s)
        lines.forEach((line, i) => {
          line.style.transition = `opacity 1s ${EASE_OUT}, transform 1s ${EASE_OUT}`;
          line.style.transitionDelay = `${0.3 + i * 0.35}s`;
          line.style.opacity = '1';
          line.style.transform = 'translateY(0)';
        });

        // Attribution fades in last (delay 1.8s, duration 0.8s)
        if (attr) {
          attr.style.transition = `opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1), transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)`;
          attr.style.transitionDelay = '1.8s';
          attr.style.opacity = '1';
          attr.style.transform = 'translateX(0)';
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
