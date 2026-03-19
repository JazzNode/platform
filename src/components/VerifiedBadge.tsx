'use client';

import { useState } from 'react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}

export default function VerifiedBadge({ size = 'md', label = 'Claimed', className = '' }: VerifiedBadgeProps) {
  const [hovered, setHovered] = useState(false);
  const px = size === 'sm' ? 12 : 16;

  return (
    <span
      className={`inline-flex items-center shrink-0 relative align-top -top-[0.35em] ml-[2px] ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_4px_rgba(var(--theme-glow-rgb),0.4)]"
      >
        {/* Gold filled circle */}
        <circle cx="12" cy="12" r="11" fill="var(--color-gold)" />
        {/* Note-stem checkmark: a musical note where the stem curves into a check */}
        <path
          d="M8 13.5L11 16L16.5 8.5"
          stroke="#0A0A0A"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Note head (small filled circle at the check start) */}
        <circle cx="8" cy="13.5" r="2" fill="#0A0A0A" />
      </svg>
      {/* Tooltip */}
      {hovered && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-[#1A1A1A] border border-[var(--border)] rounded-lg text-[10px] text-[#C4BFB3] whitespace-nowrap z-50 pointer-events-none uppercase tracking-widest">
          {label}
        </span>
      )}
    </span>
  );
}
