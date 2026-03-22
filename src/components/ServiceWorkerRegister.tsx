'use client';

import { useEffect, useState, useCallback } from 'react';

export default function ServiceWorkerRegister() {
  const [showUpdate, setShowUpdate] = useState(false);

  const handleReload = useCallback(() => {
    setShowUpdate(false);
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Listen for SW_UPDATED messages from new service worker
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        setShowUpdate(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for waiting worker on load (e.g. user returns to a stale tab)
      if (registration.waiting) {
        setShowUpdate(true);
      }

      // Detect when a new SW is installed and waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShowUpdate(true);
          }
        });
      });
    }).catch(() => {
      // SW registration failed — not critical
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  if (!showUpdate) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#18181b',
        color: '#fafafa',
        border: '1px solid #27272a',
        borderRadius: 12,
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span>有新版本可用</span>
      <button
        onClick={handleReload}
        style={{
          background: '#fafafa',
          color: '#18181b',
          border: 'none',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        更新
      </button>
      <button
        onClick={() => setShowUpdate(false)}
        aria-label="dismiss"
        style={{
          background: 'transparent',
          color: '#a1a1aa',
          border: 'none',
          padding: '4px',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
