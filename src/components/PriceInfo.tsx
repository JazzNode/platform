'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  short: string;
  full: string;
  className?: string;
}

/**
 * Compact price display with expandable full info.
 * Shows short price (e.g. "NT$500") — tap/click to reveal full pricing details.
 */
export default function PriceInfo({ short, full, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const needsExpand = short !== full;

  if (!needsExpand) {
    return <span className={className}>{short}</span>;
  }

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-gold font-medium hover:text-gold-bright transition-colors cursor-pointer"
      >
        {short}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`opacity-50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable full price details */}
      <div
        className={`absolute top-full left-0 z-10 min-w-[200px] transition-all duration-200 ease-out ${
          open ? 'opacity-100 mt-2' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-xs text-[var(--muted-foreground)] leading-relaxed whitespace-pre-line bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-lg">
          {full}
        </div>
      </div>
    </div>
  );
}
