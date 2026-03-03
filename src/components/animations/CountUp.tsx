'use client';

import { useEffect, useRef, useState } from 'react';

/** power2.out easing: 1 - (1 - t)^2 */
function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t);
}

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
    let raf: number;

    function startCount() {
      if (started) return;
      started = true;
      const duration = 2000;
      const startTime = performance.now();

      function tick(now: number) {
        const progress = Math.min((now - startTime) / duration, 1);
        setDisplayed(Math.round(easeOutQuad(progress) * end));
        if (progress < 1) raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
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
      return () => {
        observer.disconnect();
        if (raf) cancelAnimationFrame(raf);
      };
    }

    // Hero mode: listen for hero stats visible event (fired after fade-in completes)
    const handler = () => startCount();
    window.addEventListener('hero-stats-visible', handler, { once: true });

    // Fallback: if event never fires, start after 2.5s
    const fallback = setTimeout(() => {
      window.removeEventListener('hero-stats-visible', handler);
      startCount();
    }, 2500);

    return () => {
      window.removeEventListener('hero-stats-visible', handler);
      clearTimeout(fallback);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [end, trigger]);

  return (
    <span ref={ref} className={className}>
      {displayed}
    </span>
  );
}
