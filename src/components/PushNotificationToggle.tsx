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

    // Check existing subscription
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) {
      console.warn('[PushToggle] Cannot subscribe: user=%s, vapid=%s', !!user, !!VAPID_PUBLIC_KEY);
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      console.log('[PushToggle] Permission result:', perm);
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      console.log('[PushToggle] SW ready, subscribing...');
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
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
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
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
    if (loading) return;
    if (subscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  }, [loading, subscribed, subscribe, unsubscribe]);

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
