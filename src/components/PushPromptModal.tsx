'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const DISMISSED_KEY = 'jn_push_prompt_dismissed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function PushPromptModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations('pushPrompt');
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission !== 'default') return;

    // Don't show if already dismissed recently (7 days)
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!sub) {
          // Delay showing the prompt so it doesn't clash with onboarding
          const timer = setTimeout(() => setShow(true), 3000);
          return () => clearTimeout(timer);
        }
      });
    });
  }, [user]);

  const handleEnable = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return;
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, String(Date.now()));
        return;
      }

      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      if (!registration.active) {
        await new Promise<void>((resolve, reject) => {
          const sw = registration!.installing || registration!.waiting;
          if (!sw) { reject(new Error('No SW')); return; }
          const onState = () => {
            if (sw.state === 'activated') { sw.removeEventListener('statechange', onState); resolve(); }
          };
          sw.addEventListener('statechange', onState);
          setTimeout(() => { sw.removeEventListener('statechange', onState); registration!.active ? resolve() : reject(new Error('timeout')); }, 15000);
        });
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    } catch {
      // Subscription failed — dismiss silently
    }
    setShow(false);
    setSubscribing(false);
  }, [user]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }, []);

  if (!mounted || !show) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] animate-in fade-in duration-300"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(6px)' }}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[91] flex items-end sm:items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-sm rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          }}
        >
          {/* Icon */}
          <div className="pt-8 pb-2 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-gold)]/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-gold)]">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-2 text-center">
            <h2 className="font-serif text-lg font-bold text-[var(--foreground)]">
              {t('title')}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Buttons */}
          <div className="p-6 space-y-3">
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className="w-full py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {subscribing ? (
                <div className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin mx-auto" />
              ) : (
                t('enable')
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-3 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {t('later')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
