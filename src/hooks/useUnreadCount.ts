'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface UnreadCountData {
  total: number;
  breakdown: Record<string, number>;
  notifications: number;
}

/**
 * Hook to fetch the total unread inbox count for the authenticated user.
 *
 * Uses Supabase Realtime to listen for notification changes (INSERT / UPDATE)
 * so the badge updates within ~200ms. Falls back to polling every 120s for
 * message counts that don't have a realtime channel.
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

    // Initial fetch (scheduled to avoid synchronous setState in effect body)
    const timer = setTimeout(refresh, 0);

    // Polling fallback for message counts (longer interval since notifications are realtime)
    const interval = setInterval(refresh, 120_000);

    // Supabase Realtime: listen for notification inserts & updates
    const supabase = createClient();
    const channel = supabase
      .channel('unread-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Any change to notifications table → refresh counts
          refresh();
        },
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [enabled, refresh]);

  return { ...data, refresh };
}
