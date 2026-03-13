'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import HireMeModal from './HireMeModal';

interface HireMeButtonProps {
  artistId: string;
  artistName: string;
}

export default function HireMeButton({ artistId, artistName }: HireMeButtonProps) {
  const t = useTranslations('artistStudio');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-sm font-medium border border-[var(--color-gold)]/20 hover:border-[var(--color-gold)]/40 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {t('hireMe')}
      </button>
      <HireMeModal
        artistId={artistId}
        artistName={artistName}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
