'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  prevHref: string | null;
  prevTitle: string | null;
  nextHref: string | null;
  nextTitle: string | null;
  prevLabel: string;
  nextLabel: string;
}

export default function RecordNav({ prevHref, prevTitle, nextHref, nextTitle, prevLabel, nextLabel }: Props) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft' && prevHref) {
        router.push(prevHref);
      } else if (e.key === 'ArrowRight' && nextHref) {
        router.push(nextHref);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prevHref, nextHref, router]);

  if (!prevHref && !nextHref) return null;

  return (
    <nav className="flex items-stretch gap-3 border-t border-[var(--border)] pt-8">
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex-1 group relative block bg-[var(--card)] p-4 sm:p-5 rounded-2xl border border-[var(--border)] card-hover text-left overflow-hidden"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors">
              {prevLabel}
            </span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]/60 bg-[var(--muted-foreground)]/8 rounded border border-[var(--muted-foreground)]/10 leading-none">
              ←
            </kbd>
          </div>
          <p className="font-serif text-sm sm:text-base font-bold mt-1.5 group-hover:text-gold transition-colors duration-300 line-clamp-2">
            {prevTitle}
          </p>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {nextHref ? (
        <Link
          href={nextHref}
          className="flex-1 group relative block bg-[var(--card)] p-4 sm:p-5 rounded-2xl border border-[var(--border)] card-hover text-right overflow-hidden"
        >
          <div className="flex items-center justify-end gap-2">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]/60 bg-[var(--muted-foreground)]/8 rounded border border-[var(--muted-foreground)]/10 leading-none">
              →
            </kbd>
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] group-hover:text-[var(--muted-foreground)] transition-colors">
              {nextLabel}
            </span>
          </div>
          <p className="font-serif text-sm sm:text-base font-bold mt-1.5 group-hover:text-gold transition-colors duration-300 line-clamp-2">
            {nextTitle}
          </p>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
