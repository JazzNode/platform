'use client';

import { useState, type ReactNode } from 'react';

interface JazzFilterToggleProps {
  /** Pre-rendered content for jazz-only view */
  jazzContent: ReactNode;
  /** Pre-rendered content for all-events view */
  allContent: ReactNode;
  /** Number of non-jazz events hidden by the filter */
  hiddenCount: number;
  /** Translated label for the toggle */
  jazzOnlyLabel: string;
}

export default function JazzFilterToggle({
  jazzContent,
  allContent,
  hiddenCount,
  jazzOnlyLabel,
}: JazzFilterToggleProps) {
  const [jazzOnly, setJazzOnly] = useState(true);

  return (
    <div>
      {/* Toggle — only show if there are hidden non-jazz events */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-end mb-4 gap-2">
          <label className="relative inline-flex items-center cursor-pointer gap-2 text-xs text-[var(--muted-foreground)]">
            <span>{jazzOnlyLabel}</span>
            <button
              type="button"
              role="switch"
              aria-checked={jazzOnly}
              onClick={() => setJazzOnly(!jazzOnly)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                jazzOnly
                  ? 'bg-gold border-gold'
                  : 'bg-[var(--muted)] border-[var(--border)]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
                  jazzOnly ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      )}

      {jazzOnly ? jazzContent : allContent}
    </div>
  );
}
