'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function CountUp({
  end,
  className = '',
  trigger = 'hero',
}: {
  end: number;
  className?: string;
  trigger?: 'hero' | 'visible';
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let started = false;
    function startCount() {
      if (started) return;
      started = true;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: end,
        duration: 2,
        ease: 'power2.out',
        onUpdate: () => setDisplayed(Math.round(obj.val)),
      });
    }

    // IntersectionObserver mode: start when element scrolls into view
    if (trigger === 'visible') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            startCount();
            observer.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }

    // Hero mode: listen for hero stats visible event (fired after fade-in completes)
    const handler = () => startCount();
    window.addEventListener('hero-stats-visible', handler, { once: true });

    // Fallback: if event never fires (e.g. navigated directly), start after 2.5s
    const fallback = setTimeout(() => {
      window.removeEventListener('hero-stats-visible', handler);
      startCount();
    }, 2500);

    return () => {
      window.removeEventListener('hero-stats-visible', handler);
      clearTimeout(fallback);
    };
  }, [end, trigger]);

  return (
    <span ref={ref} className={className}>
      {displayed}
    </span>
  );
}
