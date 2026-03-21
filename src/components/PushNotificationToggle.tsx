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

export default function PushNotificationToggle({ label }: { label?: string }) {
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
    if (!user || !VAPID_PUBLIC_KEY) return;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setSubscribed(true);
    } catch {
      // Subscription failed
    }
    setLoading(false);
  }, [user]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      // Unsubscribe failed
    }
    setLoading(false);
  }, []);

  // Don't show if not supported or no VAPID key configured
  if (permission === 'unsupported' || !VAPID_PUBLIC_KEY || !user) return null;

  // Already denied — can't re-request
  if (permission === 'denied') return null;

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium uppercase tracking-widest rounded-xl border transition-all duration-300 ${
        subscribed
          ? 'border-gold/40 text-gold bg-gold/5 hover:bg-gold/10'
          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/40 hover:bg-gold/5'
      } ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        {subscribed && <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" />}
      </svg>
      <span>{label || (subscribed ? 'Notifications On' : 'Get Notified')}</span>
    </button>
  );
}
