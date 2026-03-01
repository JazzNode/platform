'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function ManifestoReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Gold accent line grows downward
      const accent = ref.current?.querySelector('.manifesto-accent');
      if (accent) {
        gsap.set(accent, { scaleY: 0, transformOrigin: 'top' });
        gsap.to(accent, {
          scaleY: 1,
          duration: 1.4,
          ease: 'power3.inOut',
          scrollTrigger: {
            trigger: ref.current!,
            start: 'top 82%',
            once: true,
          },
        });
      }

      // Lines stagger in — each sentence arrives like a phrase in a solo
      const lines = ref.current?.querySelectorAll('.manifesto-line');
      if (lines?.length) {
        gsap.set(lines, { y: 20, opacity: 0 });
        gsap.to(lines, {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.35,
          delay: 0.3,
          scrollTrigger: {
            trigger: ref.current!,
            start: 'top 82%',
            once: true,
          },
        });
      }

      // Signature fades in last
      const attr = ref.current?.querySelector('.manifesto-attr');
      if (attr) {
        gsap.set(attr, { opacity: 0, x: -8 });
        gsap.to(attr, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power2.out',
          delay: 1.8,
          scrollTrigger: {
            trigger: ref.current!,
            start: 'top 82%',
            once: true,
          },
        });
      }
    }, ref);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
