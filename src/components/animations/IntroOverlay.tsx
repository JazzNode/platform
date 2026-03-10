'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.45, 0, 0.55, 1)';

// Ordered by sub-line priority: en > zh > ja > ko > th > id
const ALL_LINES = [
  { text: 'Dedicated to you, who also loves jazz', lang: 'en' },
  { text: '\u50C5\u737B\u7D66\uFF0C\u4E00\u6A23\u559C\u6B61\u7235\u58EB\u6A02\u7684\u4F60', lang: 'zh' },
  { text: '\u30B8\u30E3\u30BA\u3092\u540C\u3058\u3088\u3046\u306B\u611B\u3059\u308B\u3001\u3042\u306A\u305F\u3078', lang: 'ja' },
  { text: '\uC7AC\uC988\uB97C \uC0AC\uB791\uD558\uB294, \uB2F9\uC2E0\uC5D0\uAC8C', lang: 'ko' },
  { text: '\u0E21\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13 \u0E1C\u0E39\u0E49\u0E2B\u0E25\u0E07\u0E23\u0E31\u0E01\u0E41\u0E08\u0E4A\u0E2A\u0E40\u0E0A\u0E48\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27\u0E01\u0E31\u0E19', lang: 'th' },
  { text: 'Dipersembahkan untukmu, yang juga mencintai jazz', lang: 'id' },
];

export default function IntroOverlay({ locale }: { locale: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [removed, setRemoved] = useState(false);

  // Put the detected locale's line first, rest below the divider
  const { mainLine, subLines } = useMemo(() => {
    const main = ALL_LINES.find((l) => l.lang === locale) || ALL_LINES[0];
    const subs = ALL_LINES.filter((l) => l.lang !== main.lang);
    return { mainLine: main, subLines: subs };
  }, [locale]);

  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skippedRef = useRef(false);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    // Already seen this session — smooth fade out the black overlay
    if (sessionStorage.getItem('jazznode-intro-seen')) {
      el.style.transition = `opacity 0.6s cubic-bezier(0.25, 1, 0.5, 1)`;
      el.style.opacity = '0';
      const onEnd = () => setRemoved(true);
      el.addEventListener('transitionend', onEnd, { once: true });
      // Safety fallback in case transitionend doesn't fire
      const fallback = setTimeout(onEnd, 800);
      return () => {
        el.removeEventListener('transitionend', onEnd);
        clearTimeout(fallback);
      };
    }

    sessionStorage.setItem('jazznode-intro-seen', '1');

    // Prevent scroll during intro
    document.body.style.overflow = 'hidden';

    const lines = el.querySelectorAll<HTMLElement>('.intro-line');
    const divider = el.querySelector<HTMLElement>('.intro-divider');
    if (!lines.length || !divider) return;

    const timers = timersRef.current;

    // Skip on click — immediately fade out the overlay
    const handleSkip = () => {
      if (skippedRef.current) return;
      skippedRef.current = true;
      timers.forEach(clearTimeout);
      timers.length = 0;
      el.style.transition = `opacity 0.5s ${EASE_IN_OUT}`;
      el.style.opacity = '0';
      const onEnd = () => {
        document.body.style.overflow = '';
        setRemoved(true);
      };
      el.addEventListener('transitionend', onEnd, { once: true });
      timers.push(setTimeout(onEnd, 700));
    };
    el.addEventListener('click', handleSkip);

    // Phase 1: Main line fades in with blur removal (delay 0.2s, duration 0.8s)
    lines[0].style.transition = `opacity 0.8s ${EASE_OUT}, transform 0.8s ${EASE_OUT}, filter 0.8s ${EASE_OUT}`;
    timers.push(setTimeout(() => {
      lines[0].style.opacity = '1';
      lines[0].style.transform = 'translateY(0)';
      lines[0].style.filter = 'blur(0px)';
    }, 200));

    // Phase 2: Gold divider draws in (delay 0.8s, duration 0.5s)
    divider.style.transition = `transform 0.5s ${EASE_OUT}, opacity 0.5s ${EASE_OUT}`;
    timers.push(setTimeout(() => {
      divider.style.transform = 'scaleX(1)';
      divider.style.opacity = '1';
    }, 800));

    // Phase 3: Translation lines stagger in (delay 1.2s + stagger 0.15s, duration 0.6s)
    for (let i = 1; i < lines.length; i++) {
      lines[i].style.transition = `opacity 0.6s ${EASE_OUT}, transform 0.6s ${EASE_OUT}, filter 0.6s ${EASE_OUT}`;
      timers.push(setTimeout(() => {
        lines[i].style.opacity = '1';
        lines[i].style.transform = 'translateY(0)';
        lines[i].style.filter = 'blur(0px)';
      }, 1200 + (i - 1) * 150));
    }

    // Phase 5: Everything fades out (delay 2.8s, duration 1.0s)
    timers.push(setTimeout(() => {
      if (skippedRef.current) return;
      el.style.transition = `opacity 1.0s ${EASE_IN_OUT}`;
      el.style.opacity = '0';
      const onEnd = () => {
        document.body.style.overflow = '';
        setRemoved(true);
      };
      el.addEventListener('transitionend', onEnd, { once: true });
      // Safety fallback
      timers.push(setTimeout(onEnd, 1200));
    }, 2800));

    return () => {
      document.body.style.overflow = '';
      el.removeEventListener('click', handleSkip);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      ref={overlayRef}
      className="intro-overlay"
      aria-hidden="true"
    >
      <div className="intro-content">
        {/* Main dedication line — detected locale */}
        <p className="intro-line intro-line-main">{mainLine.text}</p>

        {/* Gold divider */}
        <div className="intro-divider" />

        {/* Other languages */}
        {subLines.map((line) => (
          <p key={line.lang} className="intro-line intro-line-sub">{line.text}</p>
        ))}
      </div>
    </div>
  );
}
