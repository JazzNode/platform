'use client';

import { useEffect, useState } from 'react';
import { useFavorites } from './FavoritesProvider';

/**
 * 🐱🎷 Jazz Cat Easter Egg
 *
 * A cat silhouette walks across the bottom of the screen
 * when the user follows their 10th artist.
 * Because jazz musicians = cats. And this is OpenClaw. 🐾
 */
export default function CatEasterEgg() {
  const { catEggTrigger: trigger } = useFavorites();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-0 z-[9999] pointer-events-none"
      style={{ animation: 'cat-walk 4s ease-in-out forwards' }}
    >
      {/* Whole cat bounces up/down to simulate walk */}
      <div style={{ animation: 'cat-bounce 0.35s ease-in-out infinite' }}>
        <svg
          width="100"
          height="60"
          viewBox="0 0 100 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[var(--foreground)] opacity-50"
        >
          {/* Tail — elegant curve, animated */}
          <g style={{ transformOrigin: '20px 26px', animation: 'cat-tail 0.8s ease-in-out infinite alternate' }}>
            <path
              d="M20 26 C14 20, 8 12, 4 6 Q2 3, 5 5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Body — sleek elongated */}
          <ellipse cx="42" cy="28" rx="20" ry="9" fill="currentColor" />

          {/* Neck bridge */}
          <ellipse cx="58" cy="24" rx="6" ry="8" fill="currentColor" />

          {/* Head — slightly oval, not perfectly round */}
          <ellipse cx="68" cy="18" rx="9" ry="8" fill="currentColor" />

          {/* Ears — tall and pointy */}
          <polygon points="61,12 63,1 66,10" fill="currentColor" />
          <polygon points="70,9 73,0 76,9" fill="currentColor" />

          {/* Inner ears */}
          <polygon points="62.5,10 63.5,4 65,9.5" fill="var(--background)" opacity="0.3" />
          <polygon points="71,8.5 73,3 74.5,8.5" fill="var(--background)" opacity="0.3" />

          {/* Eyes — almond-shaped slits for that cool cat look */}
          <ellipse cx="65" cy="17" rx="1.8" ry="1" fill="var(--background)" />
          <ellipse cx="72" cy="17" rx="1.8" ry="1" fill="var(--background)" />

          {/* Nose */}
          <polygon points="68.5,20 67.5,21.2 69.5,21.2" fill="var(--background)" opacity="0.5" />

          {/* Whiskers */}
          <g stroke="currentColor" strokeWidth="0.5" opacity="0.4">
            <line x1="63" y1="20" x2="54" y2="18" />
            <line x1="63" y1="21" x2="54" y2="21" />
            <line x1="63" y1="22" x2="55" y2="24" />
            <line x1="74" y1="20" x2="83" y2="18" />
            <line x1="74" y1="21" x2="83" y2="21" />
            <line x1="74" y1="22" x2="82" y2="24" />
          </g>

          {/* Front legs — alternating walk */}
          <g style={{ transformOrigin: '54px 35px', animation: 'cat-leg-front 0.35s ease-in-out infinite' }}>
            <line x1="54" y1="35" x2="53" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g style={{ transformOrigin: '50px 35px', animation: 'cat-leg-front 0.35s ease-in-out infinite 0.175s' }}>
            <line x1="50" y1="35" x2="49" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Back legs — alternating walk */}
          <g style={{ transformOrigin: '32px 34px', animation: 'cat-leg-back 0.35s ease-in-out infinite' }}>
            <line x1="32" y1="34" x2="30" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g style={{ transformOrigin: '28px 34px', animation: 'cat-leg-back 0.35s ease-in-out infinite 0.175s' }}>
            <line x1="28" y1="34" x2="26" y2="52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* 🐾 Tiny paw prints trailing behind */}
          <g opacity="0.2">
            <circle cx="10" cy="52" r="1.8" fill="currentColor" />
            <circle cx="8" cy="49.5" r="0.9" fill="currentColor" />
            <circle cx="11" cy="49" r="0.9" fill="currentColor" />
            <circle cx="9" cy="48" r="0.9" fill="currentColor" />
          </g>
        </svg>
      </div>
    </div>
  );
}
