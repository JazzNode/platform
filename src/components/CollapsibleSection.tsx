'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ title, count, countLabel, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full text-left group py-2"
      >
        <span
          className="text-[var(--muted-foreground)] transition-transform duration-300 text-sm"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▸
        </span>
        <span className="text-[var(--muted-foreground)] group-hover:text-[var(--color-gold)] transition-colors text-sm font-medium">
          {title}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]/60">
          ({count} {countLabel})
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-500 ease-out"
        style={{
          maxHeight: open ? '2000px' : '0px',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
