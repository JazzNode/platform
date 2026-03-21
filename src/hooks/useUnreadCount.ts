'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Dedup: Realtime events are debounced (300ms) and deduped by notification ID
 * to prevent badge flicker when multiple events fire in quick succession.
 *
 * breakdown keys: "profile", "artist:<id>", "venue:<id>", "hq"
 */
export function useUnreadCount(enabled: boolean) {
  const [data, setData] = useState<UnreadCountData>({ total: 0, breakdown: {}, notifications: 0 });

  // Dedup: track notification IDs we've already processed in this session
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Debounce timer for batching rapid Realtime events
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced refresh: coalesces rapid Realtime events into a single API call
  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(refresh, 300);
  }, [refresh]);

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
        (payload) => {
          // Dedup: skip if we've already seen this notification ID
          const id = (payload.new as { id?: string })?.id;
          if (id) {
            if (seenIdsRef.current.has(id)) return;
            seenIdsRef.current.add(id);

            // Cap Set size to prevent unbounded memory growth
            if (seenIdsRef.current.size > 500) {
              const entries = Array.from(seenIdsRef.current);
              seenIdsRef.current = new Set(entries.slice(-250));
            }
          }

          debouncedRefresh();
        },
      )
      .subscribe();

    // Listen for custom event dispatched when inbox marks messages as read
    const onInboxRead = () => refresh();
    window.addEventListener('inbox:read', onInboxRead);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
      window.removeEventListener('inbox:read', onInboxRead);
    };
  }, [enabled, refresh, debouncedRefresh]);

  return { ...data, refresh };
}
