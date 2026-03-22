'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';

/**
 * VAPID public key — must match the private key used by the server to send pushes.
 * Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local.
 * Generate a VAPID key pair with: npx web-push generate-vapid-keys
 */
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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

/**
 * Toggle switch for push notification subscription.
 * - `variant="toggle"` (default): renders as a toggle switch (for profile settings).
 * - `variant="button"`: renders as a button with label (for inbox header).
 */
export default function PushNotificationToggle({
  label,
  variant = 'toggle',
}: {
  label?: string;
  variant?: 'toggle' | 'button';
}) {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);

    // Check existing subscription (don't use .ready — it can hang)
    navigator.serviceWorker.getRegistration('/').then((reg) => {
      if (reg) {
        reg.pushManager.getSubscription().then((sub) => {
          console.log('[PushToggle] Init: existing subscription =', !!sub);
          setSubscribed(!!sub);
        });
      } else {
        console.log('[PushToggle] Init: no SW registration found');
      }
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) {
      console.warn('[PushToggle] Cannot subscribe: user=%s, vapid=%s', !!user, !!VAPID_PUBLIC_KEY);
      return;
    }
    setLoading(true);
    try {
      // Step 1: Get an ACTIVE service worker registration
      console.log('[PushToggle] Step 1: Getting active service worker...');
      let registration = await navigator.serviceWorker.getRegistration('/');

      // If there's a stale registration with no active SW, nuke it and reload
      if (registration && !registration.active) {
        console.log('[PushToggle] Found stale SW registration, cleaning up...');
        await registration.unregister();
        // Must reload for a clean SW state — register will happen via ServiceWorkerRegister on next load
        console.log('[PushToggle] Reloading page for clean SW state...');
        window.location.reload();
        return;
      }

      // No SW at all — register and wait
      if (!registration) {
        console.log('[PushToggle] No SW, registering fresh...');
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // Wait for activation with 10s timeout
        await new Promise<void>((resolve, reject) => {
          if (registration!.active) { resolve(); return; }
          const sw = registration!.installing || registration!.waiting;
          if (!sw) { reject(new Error('No SW to wait on')); return; }
          console.log('[PushToggle] Waiting for SW activation, state:', sw.state);
          sw.addEventListener('statechange', function handler() {
            console.log('[PushToggle] SW state:', sw.state);
            if (sw.state === 'activated') { sw.removeEventListener('statechange', handler); resolve(); }
            if (sw.state === 'redundant') { sw.removeEventListener('statechange', handler); reject(new Error('SW redundant')); }
          });
          setTimeout(() => { registration!.active ? resolve() : reject(new Error('SW timeout')); }, 10000);
        });
      }
      console.log('[PushToggle] SW active:', !!registration.active);

      // Step 2: Request notification permission
      console.log('[PushToggle] Step 2: Requesting permission...');
      const perm = await Notification.requestPermission();
      console.log('[PushToggle] Permission result:', perm);
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      // Step 3: Subscribe to push
      console.log('[PushToggle] Step 3: Subscribing to push...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });
      console.log('[PushToggle] Push subscription created:', subscription.endpoint.slice(0, 60));

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[PushToggle] Subscribe API error:', res.status, data);
        // Undo browser subscription if server failed
        await subscription.unsubscribe();
        setLoading(false);
        return;
      }

      console.log('[PushToggle] Subscription saved to server');
      setSubscribed(true);
    } catch (err) {
      console.error('[PushToggle] Subscribe failed:', err);
    }
    setLoading(false);
  }, [user]);

  const unsubscribe = useCallback(async () => {
    console.log('[PushToggle] Unsubscribing...');
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) { setSubscribed(false); setLoading(false); return; }
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        const res = await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!res.ok) {
          console.error('[PushToggle] Unsubscribe API error:', res.status);
        }
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[PushToggle] Unsubscribe failed:', err);
    }
    setLoading(false);
  }, []);

  const handleToggle = useCallback(() => {
    console.log('[PushToggle] Toggle clicked! loading=%s, subscribed=%s, permission=%s', loading, subscribed, permission);
    if (loading) {
      console.log('[PushToggle] Blocked: still loading');
      return;
    }
    if (subscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  }, [loading, subscribed, permission, subscribe, unsubscribe]);

  // Don't show if not supported or no VAPID key configured
  if (permission === 'unsupported' || !VAPID_PUBLIC_KEY || !user) return null;

  // Already denied — can't re-request
  if (permission === 'denied') return null;

  // Button variant — for inbox header
  if (variant === 'button') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium uppercase tracking-widest rounded-xl border transition-all duration-300 shrink-0 ${
          subscribed
            ? 'border-[var(--color-gold)]/40 text-[var(--color-gold)] bg-[var(--color-gold)]/5 hover:bg-[var(--color-gold)]/10'
            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/40 hover:bg-[var(--color-gold)]/5'
        } ${loading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>{label || (subscribed ? 'Notifications On' : 'Get Notified')}</span>
      </button>
    );
  }

  // Toggle variant — for profile settings
  return (
    <button
      type="button"
      role="switch"
      aria-checked={subscribed}
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/50 disabled:opacity-50 disabled:cursor-wait ${
        subscribed ? 'bg-[var(--color-gold)]' : 'bg-[var(--border)]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ${
          subscribed ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
