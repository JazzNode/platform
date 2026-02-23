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

export default function EventNav({ prevHref, prevTitle, nextHref, nextTitle, prevLabel, nextLabel }: Props) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && prevHref) {
        router.push(prevHref);
      } else if (e.key === 'ArrowRight' && nextHref) {
        router.push(nextHref);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prevHref, nextHref, router]);

  return (
    <nav className="flex items-stretch gap-3 border-t border-[rgba(240,237,230,0.06)] pt-8">
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex-1 group block bg-[#111111] p-4 sm:p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover text-left"
        >
          <span className="text-xs uppercase tracking-widest text-[#6A6560]">← {prevLabel}</span>
          <p className="font-serif text-sm sm:text-base font-bold mt-1 group-hover:text-gold transition-colors duration-300 line-clamp-2">
            {prevTitle}
          </p>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {nextHref ? (
        <Link
          href={nextHref}
          className="flex-1 group block bg-[#111111] p-4 sm:p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover text-right"
        >
          <span className="text-xs uppercase tracking-widest text-[#6A6560]">{nextLabel} →</span>
          <p className="font-serif text-sm sm:text-base font-bold mt-1 group-hover:text-gold transition-colors duration-300 line-clamp-2">
            {nextTitle}
          </p>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </nav>
  );
}
