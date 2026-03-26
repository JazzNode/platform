'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

export interface ShoutoutReply {
  id: string;
  shoutout_id: string;
  user_id: string;
  sender_role: string | null;
  body: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

export interface ArtistShoutout {
  id: string;
  user_id: string;
  artist_id: string;
  text: string | null;
  tags: string[];
  image_url: string | null;
  is_anonymous: boolean;
  sender_role: string | null;
  sender_artist_id: string | null;
  sender_artist: { name_en: string | null; name_local: string | null; display_name: string | null } | null;
  sender_venue_id: string | null;
  sender_venue: { name_en: string | null; name_local: string | null; display_name: string | null } | null;
  is_pinned: boolean;
  pin_order: number | null;
  created_at: string;
  updated_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  replies: ShoutoutReply[];
}

interface ArtistShoutoutsContextType {
  shoutouts: ArtistShoutout[];
  pinnedShoutouts: ArtistShoutout[];
  shoutoutCount: number;
  loading: boolean;
  tagCounts: Record<string, number>;
  submitShoutout: (text: string | null, tags: string[], imageUrl: string | null, isAnonymous: boolean, senderRole?: string | null, senderArtistId?: string | null, senderVenueId?: string | null) => Promise<void>;
  deleteShoutout: (shoutoutId: string) => Promise<void>;
  submitReply: (shoutoutId: string, body: string) => Promise<ShoutoutReply | null>;
  deleteReply: (replyId: string, shoutoutId: string) => Promise<void>;
  togglePin: (shoutoutId: string) => Promise<void>;
}

const ArtistShoutoutsContext = createContext<ArtistShoutoutsContextType | null>(null);

const ROLE_PRIORITY: Record<string, number> = {
  artist: 0,
  venue_manager: 1,
  admin: 2,
};

function sortShoutouts(list: ArtistShoutout[]): ArtistShoutout[] {
  return [...list].sort((a, b) => {
    // Pinned first
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // Among pinned, sort by pin_order
    if (a.is_pinned && b.is_pinned) {
      return (a.pin_order ?? 99) - (b.pin_order ?? 99);
    }
    // Among unpinned, artist/venue_manager first
    const aPriority = a.sender_role ? (ROLE_PRIORITY[a.sender_role] ?? 3) : 3;
    const bPriority = b.sender_role ? (ROLE_PRIORITY[b.sender_role] ?? 3) : 3;
    if (aPriority !== bPriority) return aPriority - bPriority;
    // Then by created_at descending
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function mapRow(r: Record<string, unknown>): ArtistShoutout {
  const rawReplies = (r.artist_shoutout_replies as Record<string, unknown>[] | null) || [];
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    artist_id: r.artist_id as string,
    text: r.text as string | null,
    tags: (r.tags as string[]) || [],
    image_url: r.image_url as string | null,
    is_anonymous: r.is_anonymous as boolean,
    sender_role: (r.sender_role as string | null) || null,
    sender_artist_id: (r.sender_artist_id as string | null) || null,
    sender_artist: r.sender_artist as { name_en: string | null; name_local: string | null; display_name: string | null } | null,
    sender_venue_id: (r.sender_venue_id as string | null) || null,
    sender_venue: r.sender_venue as { name_en: string | null; name_local: string | null; display_name: string | null } | null,
    is_pinned: (r.is_pinned as boolean) || false,
    pin_order: (r.pin_order as number | null) || null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    profile: r.profiles as { display_name: string | null; avatar_url: string | null } | null,
    replies: rawReplies.map((rp) => ({
      id: rp.id as string,
      shoutout_id: rp.shoutout_id as string,
      user_id: rp.user_id as string,
      sender_role: rp.sender_role as string | null,
      body: rp.body as string,
      created_at: rp.created_at as string,
      profile: rp.profiles as { display_name: string | null; avatar_url: string | null } | null,
    })),
  };
}

function computeTagCounts(shoutouts: ArtistShoutout[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of shoutouts) {
    for (const tag of s.tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return counts;
}

export default function ArtistShoutoutsProvider({ artistId, children }: { artistId: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const [shoutouts, setShoutouts] = useState<ArtistShoutout[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevArtistId, setPrevArtistId] = useState(artistId);

  if (prevArtistId !== artistId) {
    setPrevArtistId(artistId);
    setLoading(true);
    setShoutouts([]);
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('artist_shoutouts')
      .select('id, user_id, artist_id, text, tags, image_url, is_anonymous, sender_role, sender_artist_id, sender_venue_id, is_pinned, pin_order, created_at, updated_at, profiles(display_name, avatar_url), sender_artist:artists!sender_artist_id(name_en, name_local, display_name), sender_venue:venues!sender_venue_id(name_en, name_local, display_name), artist_shoutout_replies(id, shoutout_id, user_id, sender_role, body, created_at, profiles(display_name, avatar_url))')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setShoutouts(sortShoutouts(data.map((r: Record<string, unknown>) => mapRow(r))));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [artistId]);

  const pinnedShoutouts = shoutouts.filter((s) => s.is_pinned);
  const tagCounts = computeTagCounts(shoutouts);

  const submitShoutout = useCallback(
    async (text: string | null, tags: string[], imageUrl: string | null, isAnonymous: boolean, senderRole?: string | null, senderArtistId?: string | null, senderVenueId?: string | null) => {
      if (!user) return;

      const now = new Date().toISOString();
      const optimistic: ArtistShoutout = {
        id: crypto.randomUUID(),
        user_id: user.id,
        artist_id: artistId,
        text: text || null,
        tags,
        image_url: imageUrl,
        is_anonymous: isAnonymous,
        sender_role: isAnonymous ? null : (senderRole || null),
        sender_artist_id: isAnonymous ? null : (senderArtistId || null),
        sender_artist: null,
        sender_venue_id: isAnonymous ? null : (senderVenueId || null),
        sender_venue: null,
        is_pinned: false,
        pin_order: null,
        created_at: now,
        updated_at: now,
        profile: { display_name: user.user_metadata?.full_name || null, avatar_url: user.user_metadata?.avatar_url || null },
        replies: [],
      };

      setShoutouts((prev) => sortShoutouts([optimistic, ...prev]));

      try {
        const res = await fetch('/api/artist/shoutout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            artistId,
            text: text || null,
            tags,
            imageUrl,
            isAnonymous,
            senderRole: isAnonymous ? null : (senderRole || null),
            senderArtistId: isAnonymous ? null : (senderArtistId || null),
            senderVenueId: isAnonymous ? null : (senderVenueId || null),
          }),
        });
        if (!res.ok) {
          setShoutouts((prev) => prev.filter((s) => s.id !== optimistic.id));
        }
      } catch {
        setShoutouts((prev) => prev.filter((s) => s.id !== optimistic.id));
      }
    },
    [user, artistId],
  );

  const deleteShoutout = useCallback(
    async (shoutoutId: string) => {
      if (!user) return;
      const deleted = shoutouts.find((s) => s.id === shoutoutId);
      setShoutouts((prev) => prev.filter((s) => s.id !== shoutoutId));

      const supabase = createClient();
      const { error } = await supabase
        .from('artist_shoutouts')
        .delete()
        .eq('id', shoutoutId)
        .eq('user_id', user.id);

      if (error && deleted) {
        setShoutouts((prev) => sortShoutouts([deleted, ...prev]));
      }
    },
    [user, shoutouts],
  );

  const submitReply = useCallback(
    async (shoutoutId: string, body: string): Promise<ShoutoutReply | null> => {
      if (!user) return null;

      try {
        const res = await fetch('/api/artist/shoutout-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shoutoutId, artistId, body }),
        });
        const data = await res.json();
        if (!data.reply) return null;

        const reply: ShoutoutReply = {
          ...data.reply,
          profile: { display_name: user.user_metadata?.full_name || null, avatar_url: user.user_metadata?.avatar_url || null },
        };

        setShoutouts((prev) =>
          prev.map((s) =>
            s.id === shoutoutId ? { ...s, replies: [...s.replies, reply] } : s,
          ),
        );

        return reply;
      } catch {
        return null;
      }
    },
    [user, artistId],
  );

  const deleteReply = useCallback(
    async (replyId: string, shoutoutId: string) => {
      if (!user) return;

      setShoutouts((prev) =>
        prev.map((s) =>
          s.id === shoutoutId ? { ...s, replies: s.replies.filter((r) => r.id !== replyId) } : s,
        ),
      );

      try {
        await fetch('/api/artist/shoutout-reply', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ replyId }),
        });
      } catch {
        // Silently fail — the optimistic removal stands
      }
    },
    [user],
  );

  const togglePin = useCallback(
    async (shoutoutId: string) => {
      if (!user) return;

      const target = shoutouts.find((s) => s.id === shoutoutId);
      if (!target) return;

      const newPinned = !target.is_pinned;

      // If pinning, check max 3
      if (newPinned && pinnedShoutouts.length >= 3) return;

      // Optimistic update
      setShoutouts((prev) =>
        sortShoutouts(
          prev.map((s) =>
            s.id === shoutoutId
              ? { ...s, is_pinned: newPinned, pin_order: newPinned ? (pinnedShoutouts.length + 1) : null }
              : s,
          ),
        ),
      );

      try {
        const res = await fetch(`/api/artist/shoutout/${shoutoutId}/pin`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artistId }),
        });
        if (!res.ok) {
          // Revert
          setShoutouts((prev) =>
            sortShoutouts(
              prev.map((s) =>
                s.id === shoutoutId
                  ? { ...s, is_pinned: target.is_pinned, pin_order: target.pin_order }
                  : s,
              ),
            ),
          );
        }
      } catch {
        setShoutouts((prev) =>
          sortShoutouts(
            prev.map((s) =>
              s.id === shoutoutId
                ? { ...s, is_pinned: target.is_pinned, pin_order: target.pin_order }
                : s,
            ),
          ),
        );
      }
    },
    [user, shoutouts, pinnedShoutouts.length, artistId],
  );

  return (
    <ArtistShoutoutsContext.Provider value={{ shoutouts, pinnedShoutouts, shoutoutCount: shoutouts.length, loading, tagCounts, submitShoutout, deleteShoutout, submitReply, deleteReply, togglePin }}>
      {children}
    </ArtistShoutoutsContext.Provider>
  );
}

export function useArtistShoutouts() {
  const ctx = useContext(ArtistShoutoutsContext);
  if (!ctx) throw new Error('useArtistShoutouts must be used within ArtistShoutoutsProvider');
  return ctx;
}
