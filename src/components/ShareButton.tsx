'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  title: string;
  url: string;
  text?: string;
  variant?: 'icon' | 'compact' | 'full';
  label?: string;
  /** Adds frosted glass backdrop — best for overlaying photos */
  glass?: boolean;
}

const ShareIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LineIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.365 9.864c.058 0 .104.048.104.108 0 .06-.046.108-.104.108H17.61v1.169h1.755c.058 0 .104.048.104.108 0 .06-.046.107-.104.107H17.504a.109.109 0 01-.107-.107V9.2c0-.06.048-.108.107-.108h1.861c.058 0 .104.048.104.108 0 .06-.046.108-.104.108H17.61v1.169h1.755zm-3.855 1.6a.109.109 0 01-.107.107.109.109 0 01-.09-.048l-2.425-3.271v3.212c0 .06-.048.107-.108.107-.059 0-.107-.048-.107-.107V9.2c0-.06.048-.108.107-.108.037 0 .071.018.09.048l2.425 3.272V9.2c0-.06.048-.108.108-.108.059 0 .107.048.107.108v2.264zm-4.184.107c-.059 0-.107-.048-.107-.107V9.2c0-.06.048-.108.107-.108.06 0 .108.048.108.108v2.264c0 .06-.048.107-.108.107zm-1.591 0H7.874a.109.109 0 01-.107-.107V9.2c0-.06.048-.108.107-.108.06 0 .108.048.108.108v2.157h1.753c.058 0 .104.048.104.108 0 .06-.046.107-.104.107zM24 10.67C24 5.235 18.627.96 12 .96S0 5.235 0 10.67c0 4.808 4.267 8.836 10.03 9.6.39.083.923.258 1.058.591.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.023 15.057 24 13.005 24 10.67" />
  </svg>
);

const CopyIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

function ShareMenu({ fullUrl, title, text, onCopy, copied }: {
  fullUrl: string;
  title: string;
  text?: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text || title);

  const platforms = [
    {
      name: 'X',
      icon: <XIcon size={15} />,
      href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    },
    {
      name: 'Facebook',
      icon: <FacebookIcon size={15} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    },
    {
      name: 'LINE',
      icon: <LineIcon size={15} />,
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
    },
  ];

  return (
    <div className="absolute top-full right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden min-w-[160px]">
        {platforms.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-gold/10 hover:text-gold transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="w-5 flex items-center justify-center opacity-70">{p.icon}</span>
            {p.name}
          </a>
        ))}
        <div className="h-px bg-[var(--border)]" />
        <button
          onClick={(e) => { e.stopPropagation(); onCopy(); }}
          className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-[var(--foreground)] hover:bg-gold/10 hover:text-gold transition-colors"
        >
          <span className="w-5 flex items-center justify-center opacity-70">
            {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
          </span>
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}

export default function ShareButton({ title, url, text, variant = 'icon', label = 'Share', glass = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}`
    : url;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // On mobile, prefer native share sheet
    if (navigator.share && 'ontouchstart' in window) {
      try {
        await navigator.share({ title, text: text || title, url: fullUrl });
      } catch {
        // User cancelled
      }
    } else {
      // Desktop: toggle share menu
      setMenuOpen((prev) => !prev);
    }
  };

  if (variant === 'icon') {
    const size = glass ? 'w-10 h-10' : '';
    const glassBg = glass
      ? 'bg-black/40 backdrop-blur-md backdrop-saturate-150 shadow-lg border border-white/10'
      : '';
    return (
      <div ref={ref} className="relative">
        <button
          onClick={handleShare}
          className={`${glass ? size : 'p-1.5'} flex items-center justify-center rounded-${glass ? 'full' : 'lg'} ${glass ? 'text-white/80' : 'text-[var(--muted-foreground)]'} hover:text-gold hover:bg-gold/10 transition-all duration-200 ${glassBg}`}
          aria-label={label}
          title={label}
        >
          <ShareIcon size={glass ? 18 : 16} />
        </button>
        {menuOpen && (
          <ShareMenu fullUrl={fullUrl} title={title} text={text} onCopy={handleCopy} copied={copied} />
        )}
      </div>
    );
  }

  const isCompact = variant === 'compact';
  const iconSize = isCompact ? 14 : 16;

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={handleShare}
        className={isCompact
          ? "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/30 transition-all duration-200"
          : "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium uppercase tracking-widest rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all duration-300"
        }
      >
        <ShareIcon size={iconSize} />
        <span>{label}</span>
      </button>
      {menuOpen && (
        <ShareMenu fullUrl={fullUrl} title={title} text={text} onCopy={handleCopy} copied={copied} />
      )}
    </div>
  );
}
