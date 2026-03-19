'use client';

import { useState, useEffect, useCallback } from 'react';

interface UnreadCountData {
  total: number;
  breakdown: Record<string, number>;
  notifications: number;
}

/**
 * Hook to fetch the total unread inbox count for the authenticated user.
 * Polls every 60 seconds. Returns { total, breakdown, refresh }.
 *
 * breakdown keys: "profile", "artist:<id>", "venue:<id>", "hq"
 */
export function useUnreadCount(enabled: boolean) {
  const [data, setData] = useState<UnreadCountData>({ total: 0, breakdown: {}, notifications: 0 });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/unread-count');
      if (res.ok) {
        const json = await res.json();
        setData({ total: json.total || 0, breakdown: json.breakdown || {}, notifications: json.notifications || 0 });
      }
    } catch {
      // Silently fail — badge just won't show
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/inbox/unread-count');
        if (res.ok && !cancelled) {
          const json = await res.json();
          setData({ total: json.total || 0, breakdown: json.breakdown || {}, notifications: json.notifications || 0 });
        }
      } catch {
        // Silently fail — badge just won't show
      }
    })();

    const interval = setInterval(refresh, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [enabled, refresh]);

  return { ...data, refresh };
}
