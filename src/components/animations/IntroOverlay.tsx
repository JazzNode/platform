'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const LINES = [
  { text: '僅獻給，一樣喜歡爵士樂的你', lang: 'zh' },
  { text: 'Dedicated to you, who also loves jazz', lang: 'en' },
  { text: 'ジャズを同じように愛する、あなたへ', lang: 'ja' },
  { text: '재즈를 사랑하는, 당신에게', lang: 'ko' },
];

export default function IntroOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [removed, setRemoved] = useState(false);

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

      // ─── Phase 1: Main Chinese line fades in with focus effect ───
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
        {/* Main dedication line */}
        <p className="intro-line intro-line-main">{LINES[0].text}</p>

        {/* Gold divider */}
        <div className="intro-divider" />

        {/* Translation lines */}
        <p className="intro-line intro-line-sub">{LINES[1].text}</p>
        <p className="intro-line intro-line-sub">{LINES[2].text}</p>
        <p className="intro-line intro-line-sub">{LINES[3].text}</p>
      </div>
    </div>
  );
}
