'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function CountUp({
  end,
  className = '',
}: {
  end: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function startCount() {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: end,
        duration: 2,
        ease: 'power2.out',
        onUpdate: () => setDisplayed(Math.round(obj.val)),
      });
    }

    // Listen for hero stats visible event (fired after fade-in completes)
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
  }, [end]);

  return (
    <span ref={ref} className={className}>
      {displayed}
    </span>
  );
}
