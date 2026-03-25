'use client';

import { useRef, useEffect } from 'react';

/**
 * Auto-FLIP animation hook for grid re-ordering.
 *
 * Continuously snapshots child positions. When positions change between
 * renders (e.g. due to re-sorting), animates cards from their old
 * positions to their new ones using the FLIP technique.
 *
 * Children must have a stable `data-flip-id` attribute.
 *
 * Usage:
 *   const gridRef = useFlipGrid<HTMLDivElement>();
 *   <div ref={gridRef} className="grid ...">
 *     {items.map(item => (
 *       <div key={item.id} data-flip-id={item.id}>...</div>
 *     ))}
 *   </div>
 */

interface Rect { x: number; y: number }

const DURATION = 480;
const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

export function useFlipGrid<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const prevPositions = useRef<Map<string, Rect>>(new Map());
  const animatingRef = useRef(false);

  // After each paint, compare positions and animate if changed
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>('[data-flip-id]');
    const prev = prevPositions.current;
    const animations: Animation[] = [];
    const next = new Map<string, Rect>();

    for (const el of items) {
      const id = el.dataset.flipId!;

      // Skip elements still entering via FadeUpItem (opacity 0).
      // Prevents FLIP from snapshotting the pre-visible position and
      // firing a second animation that fights the entrance transition.
      if (el.style.opacity === '0') continue;

      const rect = el.getBoundingClientRect();
      next.set(id, { x: rect.left, y: rect.top });

      const old = prev.get(id);
      if (!old) continue;

      const dx = old.x - rect.left;
      const dy = old.y - rect.top;

      // Skip tiny moves (sub-pixel rounding) or if already animating
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;

      // Cancel any running animation on this element first
      el.getAnimations().forEach((a) => {
        if (a instanceof Animation && (a as unknown as { id?: string }).id === 'flip') a.cancel();
      });

      const anim = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: DURATION, easing: EASING, fill: 'none', id: 'flip' },
      );
      animations.push(anim);
    }

    if (animations.length > 0) {
      animatingRef.current = true;
      Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => {
        animatingRef.current = false;
      });
    }

    prevPositions.current = next;
  });

  return ref;
}
