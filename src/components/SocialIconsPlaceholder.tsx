'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface SocialIconsPlaceholderProps {
  artistName: string;
}

function GhostIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[var(--muted-foreground)]/25 cursor-pointer">
      {children}
    </span>
  );
}

export default function SocialIconsPlaceholder({ artistName }: SocialIconsPlaceholderProps) {
  const t = useTranslations('common');
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <div
        className="flex items-center gap-3"
        onClick={() => setShowTooltip(prev => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Website */}
        <GhostIcon>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </GhostIcon>
        {/* Spotify */}
        <GhostIcon>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </GhostIcon>
        {/* Instagram */}
        <GhostIcon>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </GhostIcon>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute left-0 top-full mt-2 z-50 px-4 py-3 rounded-xl border border-gold/20 shadow-xl max-w-xs"
          style={{
            background: 'color-mix(in srgb, var(--background) 94%, var(--color-gold))',
            backdropFilter: 'blur(24px)',
          }}
        >
          <p className="text-xs text-[#C4BFB3] leading-relaxed">
            {t('socialPlaceholderHint')}
          </p>
        </div>
      )}
    </div>
  );
}
