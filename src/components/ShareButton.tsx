'use client';

import { useState } from 'react';

interface Props {
  title: string;
  url: string;
  text?: string;
  variant?: 'icon' | 'full';
  label?: string;
  /** Adds frosted glass backdrop — best for overlaying photos */
  glass?: boolean;
}

export default function ShareButton({ title, url, text, variant = 'icon', label = 'Share', glass = false }: Props) {
  const [copied, setCopied] = useState(false);

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
    : url;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url: fullUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(fullUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  };

  const ShareIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );

  if (variant === 'icon') {
    const size = glass ? 'w-10 h-10' : '';
    const glassBg = glass
      ? 'bg-black/40 backdrop-blur-md backdrop-saturate-150 shadow-lg border border-white/10'
      : '';
    return (
      <button
        onClick={handleShare}
        className={`${glass ? size : 'p-1.5'} flex items-center justify-center rounded-${glass ? 'full' : 'lg'} ${glass ? 'text-white/80' : 'text-[var(--muted-foreground)]'} hover:text-gold hover:bg-gold/10 transition-all duration-200 ${glassBg}`}
        aria-label={label}
        title={copied ? 'Copied!' : label}
      >
        {copied ? (
          <svg width={glass ? 18 : 16} height={glass ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width={glass ? 18 : 16} height={glass ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium uppercase tracking-widest rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all duration-300"
    >
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <ShareIcon />
      )}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
}
