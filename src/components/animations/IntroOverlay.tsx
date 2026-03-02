'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';

// Ordered by sub-line priority: en > zh > ja > ko
const ALL_LINES = [
  { text: 'Dedicated to you, who also loves jazz', lang: 'en' },
  { text: '僅獻給，一樣喜歡爵士樂的你', lang: 'zh' },
  { text: 'ジャズを同じように愛する、あなたへ', lang: 'ja' },
  { text: '재즈를 사랑하는, 당신에게', lang: 'ko' },
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
    // Already seen this session — smooth fade out the black overlay
    if (sessionStorage.getItem('jazznode-intro-seen')) {
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => setRemoved(true),
      });
      return;
    }

    sessionStorage.setItem('jazznode-intro-seen', '1');

    // Prevent scroll during intro
    document.body.style.overflow = 'hidden';

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          document.body.style.overflow = '';
          setRemoved(true);
        },
      });

      const lines = overlayRef.current?.querySelectorAll('.intro-line');
      const divider = overlayRef.current?.querySelector('.intro-divider');
      if (!lines || !divider) return;

      // ─── Phase 1: Main line fades in with focus effect ───
      tl.to(lines[0], {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.6,
        ease: 'power3.out',
      }, 0.6);

      // ─── Phase 2: Gold divider draws in ───
      tl.to(divider, {
        scaleX: 1,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.inOut',
      }, 1.8);

      // ─── Phase 3: Translation lines stagger in ───
      tl.to([lines[1], lines[2], lines[3]], {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.0,
        ease: 'power3.out',
        stagger: 0.25,
      }, 2.4);

      // ─── Phase 4: Hold ───

      // ─── Phase 5: Everything fades out ───
      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 1.2,
        ease: 'power2.inOut',
      }, 5.0);
    }, overlayRef);

    return () => {
      document.body.style.overflow = '';
      ctx.revert();
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
