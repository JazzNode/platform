'use client';

import { useEffect, useState } from 'react';
import { useFavorites } from './FavoritesProvider';

/**
 * 🐱🎷 Jazz Cat Easter Egg
 *
 * A cat silhouette walks across the bottom of the screen,
 * pauses at the center to stretch, then continues walking out.
 * Triggered when the user follows their 10th artist.
 * Because jazz musicians = cats. And this is OpenClaw. 🐾
 */
export default function CatEasterEgg() {
  const { catEggTrigger: trigger } = useFavorites();
  const [visible, setVisible] = useState(false);
  const [stretching, setStretching] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setVisible(true);
    setStretching(false);

    // 13s total: walk-in (0–35%) → stretch (35–58%) → walk-out (58–100%)
    const t1 = setTimeout(() => setStretching(true), 4550);
    const t2 = setTimeout(() => setStretching(false), 7540);
    const t3 = setTimeout(() => setVisible(false), 13500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [trigger]);

  if (!visible) return null;

  // Walking animations
  const walkBounce = 'cat-bounce 0.5s ease-in-out infinite';
  const walkTail = 'cat-tail 1s ease-in-out infinite alternate';
  const walkFrontLeg = 'cat-leg-front 0.5s ease-in-out infinite';
  const walkFrontLegDelay = 'cat-leg-front 0.5s ease-in-out infinite 0.25s';
  const walkBackLeg = 'cat-leg-back 0.5s ease-in-out infinite';
  const walkBackLegDelay = 'cat-leg-back 0.5s ease-in-out infinite 0.25s';

  // Stretch animations
  const stretchBody = 'cat-stretch 2.99s ease-in-out forwards';
  const stretchTail = 'cat-stretch-tail 2.99s ease-in-out forwards';
  const stretchFront = 'cat-stretch-front 2.99s ease-in-out forwards';
  const stretchBack = 'cat-stretch-back 2.99s ease-in-out forwards';

  return (
    <div
      className="fixed bottom-4 left-0 z-[9999] pointer-events-none"
      style={{ animation: 'cat-walk 13s ease-in-out forwards' }}
    >
      {/* Bounce wrapper — only active while walking */}
      <div style={{ animation: stretching ? 'none' : walkBounce }}>
        {/* Stretch wrapper — active during stretch phase */}
        <div
          style={{
            animation: stretching ? stretchBody : 'none',
            transformOrigin: '30% 90%',
          }}
        >
          <svg
            width="100"
            height="60"
            viewBox="0 0 100 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[var(--foreground)] opacity-55"
          >
            {/* Tail — elegant curve, animated */}
            <g
              style={{
                transformOrigin: '20px 26px',
                animation: stretching ? stretchTail : walkTail,
              }}
            >
              <path
                d="M20,26 C15,20 10,13 6,7 Q3,3 5,5 Q7,7 8,8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Body — smooth unified silhouette */}
            <path
              d="M22,28 C22,21 30,19 42,19 C52,19 56,17 60,16 C64,15 66,16 66,20 C66,28 56,32 42,33 C30,34 22,34 22,28 Z"
              fill="currentColor"
            />

            {/* Head */}
            <ellipse cx="68" cy="18" rx="9" ry="8" fill="currentColor" />

            {/* Ears — tall and pointy */}
            <polygon points="61,12 63,1 66,10" fill="currentColor" />
            <polygon points="70,9 73,0 76,9" fill="currentColor" />

            {/* Inner ears */}
            <polygon
              points="62.5,10 63.5,4 65,9.5"
              fill="var(--background)"
              opacity="0.3"
            />
            <polygon
              points="71,8.5 73,3 74.5,8.5"
              fill="var(--background)"
              opacity="0.3"
            />

            {/* Eyes — almond-shaped slits */}
            <ellipse
              cx="65"
              cy="17"
              rx="1.8"
              ry="1"
              fill="var(--background)"
            />
            <ellipse
              cx="72"
              cy="17"
              rx="1.8"
              ry="1"
              fill="var(--background)"
            />

            {/* Eye highlights */}
            <circle
              cx="65.6"
              cy="16.5"
              r="0.4"
              fill="var(--background)"
              opacity="0.5"
            />
            <circle
              cx="72.6"
              cy="16.5"
              r="0.4"
              fill="var(--background)"
              opacity="0.5"
            />

            {/* Nose */}
            <polygon
              points="68.5,20 67.5,21.2 69.5,21.2"
              fill="var(--background)"
              opacity="0.5"
            />

            {/* Mouth */}
            <path
              d="M68.5,21.2 C68,22 67.5,22.5 67,22.5"
              stroke="var(--background)"
              strokeWidth="0.4"
              fill="none"
              opacity="0.3"
            />
            <path
              d="M68.5,21.2 C69,22 69.5,22.5 70,22.5"
              stroke="var(--background)"
              strokeWidth="0.4"
              fill="none"
              opacity="0.3"
            />

            {/* Whiskers */}
            <g stroke="currentColor" strokeWidth="0.5" opacity="0.35">
              <line x1="63" y1="20" x2="54" y2="18" />
              <line x1="63" y1="21" x2="54" y2="21" />
              <line x1="63" y1="22" x2="55" y2="24" />
              <line x1="74" y1="20" x2="83" y2="18" />
              <line x1="74" y1="21" x2="83" y2="21" />
              <line x1="74" y1="22" x2="82" y2="24" />
            </g>

            {/* Front legs with paws */}
            <g
              style={{
                transformOrigin: '54px 35px',
                animation: stretching ? stretchFront : walkFrontLeg,
              }}
            >
              <line
                x1="54"
                y1="35"
                x2="53"
                y2="50"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <ellipse cx="53" cy="51.5" rx="2.5" ry="1.5" fill="currentColor" />
            </g>
            <g
              style={{
                transformOrigin: '50px 35px',
                animation: stretching ? stretchFront : walkFrontLegDelay,
              }}
            >
              <line
                x1="50"
                y1="35"
                x2="49"
                y2="50"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <ellipse cx="49" cy="51.5" rx="2.5" ry="1.5" fill="currentColor" />
            </g>

            {/* Back legs with paws */}
            <g
              style={{
                transformOrigin: '32px 34px',
                animation: stretching ? stretchBack : walkBackLeg,
              }}
            >
              <line
                x1="32"
                y1="34"
                x2="30"
                y2="50"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <ellipse cx="30" cy="51.5" rx="2.5" ry="1.5" fill="currentColor" />
            </g>
            <g
              style={{
                transformOrigin: '28px 34px',
                animation: stretching ? stretchBack : walkBackLegDelay,
              }}
            >
              <line
                x1="28"
                y1="34"
                x2="26"
                y2="50"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <ellipse cx="26" cy="51.5" rx="2.5" ry="1.5" fill="currentColor" />
            </g>

            {/* 🐾 Tiny paw prints trailing behind */}
            <g opacity="0.15">
              <circle cx="10" cy="52" r="1.8" fill="currentColor" />
              <circle cx="8" cy="49.5" r="0.9" fill="currentColor" />
              <circle cx="11" cy="49" r="0.9" fill="currentColor" />
              <circle cx="9" cy="48" r="0.9" fill="currentColor" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
