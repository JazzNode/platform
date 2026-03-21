'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SHOWN_COUNT_KEY = 'pwa-install-count';
const SHOWN_LAST_KEY = 'pwa-install-last';
const MAX_SHOWS = 2;
const COOLDOWN_DAYS = 7;

/** Check if banner should be suppressed */
function shouldSuppress(): boolean {
  if (typeof window === 'undefined') return true;
  const count = parseInt(localStorage.getItem(SHOWN_COUNT_KEY) || '0', 10);
  if (count >= MAX_SHOWS) return true; // Already shown twice — done forever
  if (count === 1) {
    // Second show: must wait 7 days after first
    const lastShown = parseInt(localStorage.getItem(SHOWN_LAST_KEY) || '0', 10);
    const daysSince = (Date.now() - lastShown) / (1000 * 60 * 60 * 24);
    if (daysSince < COOLDOWN_DAYS) return true;
  }
  return false;
}

function markAsShown(): void {
  const count = parseInt(localStorage.getItem(SHOWN_COUNT_KEY) || '0', 10);
  localStorage.setItem(SHOWN_COUNT_KEY, String(count + 1));
  localStorage.setItem(SHOWN_LAST_KEY, String(Date.now()));
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/** Returns true if user registered more than 24 hours ago */
function isReturningMember(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const registered = new Date(createdAt).getTime();
  const hoursSince = (Date.now() - registered) / (1000 * 60 * 60);
  return hoursSince >= 24;
}

export default function PWAInstallBanner() {
  const t = useTranslations('common');
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Gate: must be a registered member who signed up 24+ hours ago
    if (!user || !isReturningMember(user.created_at)) return;

    // Don't show if already installed or exceeded show limit
    if (isStandalone() || shouldSuppress()) return;

    // Android / Chrome: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
      markAsShown();
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS Safari: show manual guide after a short delay
    if (isIOS() && isSafari()) {
      const timer = setTimeout(() => {
        setShowIOSGuide(true);
        setVisible(true);
        markAsShown();
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [user]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setVisible(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-3 right-3 z-40 md:hidden animate-in slide-in-from-bottom-4 duration-500"
    >
      <div
        className="rounded-2xl p-4 relative"
        style={{
          background: 'rgba(var(--theme-glow-rgb, 200, 168, 78), 0.15)',
          backdropFilter: 'blur(28px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
          border: '1px solid rgba(var(--theme-glow-rgb, 200, 168, 78), 0.2)',
          boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {/* App icon */}
          <img
            src="/icons/icon-192.png"
            alt="JazzNode"
            width={48}
            height={48}
            className="w-12 h-12 rounded-xl shrink-0"
          />

          <div className="flex-1 min-w-0">
            <p className="font-serif font-bold text-sm text-[var(--foreground)]">
              {t('pwaInstallTitle')}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {showIOSGuide ? t('pwaInstallIOSHint') : t('pwaInstallHint')}
            </p>
          </div>

          {/* Install button (Android only) */}
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="shrink-0 px-4 py-2 rounded-xl bg-gold text-[#0A0A0A] text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-gold-bright)] transition-colors"
            >
              {t('pwaInstallButton')}
            </button>
          )}
        </div>

        {/* iOS Safari guide */}
        {showIOSGuide && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <span>{t('pwaInstallIOSStep1')}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>{t('pwaInstallIOSStep2')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
