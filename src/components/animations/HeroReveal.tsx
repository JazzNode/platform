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
    }, ref);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
