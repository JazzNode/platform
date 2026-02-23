'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = ref.current?.querySelectorAll('.fade-up-item');
      if (!items || items.length === 0) {
        // Animate the container itself
        gsap.set(ref.current!, { y: 40, opacity: 0 });
        gsap.to(ref.current!, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          delay,
          scrollTrigger: {
            trigger: ref.current!,
            start: 'top 88%',
            once: true,
          },
        });
      } else {
        gsap.set(items, { y: 40, opacity: 0 });
        gsap.to(items, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          stagger,
          delay,
          scrollTrigger: {
            trigger: ref.current!,
            start: 'top 88%',
            once: true,
          },
        });
      }
    }, ref);

    return () => ctx.revert();
  }, [stagger, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
