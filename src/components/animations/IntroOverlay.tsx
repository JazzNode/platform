'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

const EASE_OUT = 'cubic-bezier(0.33, 1, 0.68, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.45, 0, 0.55, 1)';

// Ordered by sub-line priority: en > zh > ja > ko
const ALL_LINES = [
  { text: 'Dedicated to you, who also loves jazz', lang: 'en' },
  { text: '\u50C5\u737B\u7D66\uFF0C\u4E00\u6A23\u559C\u6B61\u7235\u58EB\u6A02\u7684\u4F60', lang: 'zh' },
  { text: '\u30B8\u30E3\u30BA\u3092\u540C\u3058\u3088\u3046\u306B\u611B\u3059\u308B\u3001\u3042\u306A\u305F\u3078', lang: 'ja' },
  { text: '\uC7AC\uC988\uB97C \uC0AC\uB791\uD558\uB294, \uB2F9\uC2E0\uC5D0\uAC8C', lang: 'ko' },
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

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: Main line fades in with blur removal (delay 0.6s, duration 1.6s)
    lines[0].style.transition = `opacity 1.6s ${EASE_OUT}, transform 1.6s ${EASE_OUT}, filter 1.6s ${EASE_OUT}`;
    timers.push(setTimeout(() => {
      lines[0].style.opacity = '1';
      lines[0].style.transform = 'translateY(0)';
      lines[0].style.filter = 'blur(0px)';
    }, 600));

    // Phase 2: Gold divider draws in (delay 1.8s, duration 0.8s)
    divider.style.transition = `transform 0.8s ${EASE_OUT}, opacity 0.8s ${EASE_OUT}`;
    timers.push(setTimeout(() => {
      divider.style.transform = 'scaleX(1)';
      divider.style.opacity = '1';
    }, 1800));

    // Phase 3: Translation lines stagger in (delay 2.4s + stagger 0.25s, duration 1s)
    [1, 2, 3].forEach((i, idx) => {
      if (!lines[i]) return;
      lines[i].style.transition = `opacity 1s ${EASE_OUT}, transform 1s ${EASE_OUT}, filter 1s ${EASE_OUT}`;
      timers.push(setTimeout(() => {
        lines[i].style.opacity = '1';
        lines[i].style.transform = 'translateY(0)';
        lines[i].style.filter = 'blur(0px)';
      }, 2400 + idx * 250));
    });

    // Phase 5: Everything fades out (delay 5.0s, duration 1.2s)
    timers.push(setTimeout(() => {
      el.style.transition = `opacity 1.2s ${EASE_IN_OUT}`;
      el.style.opacity = '0';
      const onEnd = () => {
        document.body.style.overflow = '';
        setRemoved(true);
      };
      el.addEventListener('transitionend', onEnd, { once: true });
      // Safety fallback
      timers.push(setTimeout(onEnd, 1400));
    }, 5000));

    return () => {
      document.body.style.overflow = '';
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
