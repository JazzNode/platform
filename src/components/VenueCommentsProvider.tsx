'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

export interface CommentReply {
  id: string;
  comment_id: string;
  user_id: string;
  sender_role: string | null;
  body: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

export interface VenueComment {
  id: string;
  user_id: string;
  venue_id: string;
  text: string | null;
  tags: string[];
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  replies: CommentReply[];
}

interface VenueCommentsContextType {
  comments: VenueComment[];
  commentCount: number;
  loading: boolean;
  submitComment: (text: string | null, tags: string[], imageUrl: string | null, isAnonymous: boolean) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  submitReply: (commentId: string, body: string) => Promise<CommentReply | null>;
  deleteReply: (replyId: string, commentId: string) => Promise<void>;
}

const VenueCommentsContext = createContext<VenueCommentsContextType | null>(null);

function mapRow(r: Record<string, unknown>): VenueComment {
  const rawReplies = (r.venue_comment_replies as Record<string, unknown>[] | null) || [];
  return {
    id: r.id as string,
    user_id: r.user_id as string,
    venue_id: r.venue_id as string,
    text: r.text as string | null,
    tags: (r.tags as string[]) || [],
    image_url: r.image_url as string | null,
    is_anonymous: r.is_anonymous as boolean,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    profile: r.profiles as { display_name: string | null; avatar_url: string | null } | null,
    replies: rawReplies.map((rp) => ({
      id: rp.id as string,
      comment_id: rp.comment_id as string,
      user_id: rp.user_id as string,
      sender_role: rp.sender_role as string | null,
      body: rp.body as string,
      created_at: rp.created_at as string,
      profile: rp.profiles as { display_name: string | null; avatar_url: string | null } | null,
    })),
  };
}

export default function VenueCommentsProvider({ venueId, children }: { venueId: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<VenueComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevVenueId, setPrevVenueId] = useState(venueId);

  if (prevVenueId !== venueId) {
    setPrevVenueId(venueId);
    setLoading(true);
    setComments([]);
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from('venue_comments')
      .select('id, user_id, venue_id, text, tags, image_url, is_anonymous, created_at, updated_at, profiles(display_name, avatar_url), venue_comment_replies(id, comment_id, user_id, sender_role, body, created_at, profiles(display_name, avatar_url))')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setComments(data.map((r: Record<string, unknown>) => mapRow(r)));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [venueId]);

  const submitComment = useCallback(
    async (text: string | null, tags: string[], imageUrl: string | null, isAnonymous: boolean) => {
      if (!user) return;

      const now = new Date().toISOString();
      const optimistic: VenueComment = {
        id: crypto.randomUUID(),
        user_id: user.id,
        venue_id: venueId,
        text: text || null,
        tags,
        image_url: imageUrl,
        is_anonymous: isAnonymous,
        created_at: now,
        updated_at: now,
        profile: { display_name: user.user_metadata?.full_name || null, avatar_url: user.user_metadata?.avatar_url || null },
        replies: [],
      };

      setComments((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch('/api/venue/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ venueId, text: text || null, tags, imageUrl, isAnonymous }),
        });
        if (!res.ok) {
          // Revert optimistic
          setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        }
      } catch {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
      }
    },
    [user, venueId],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      const deleted = comments.find((c) => c.id === commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      const supabase = createClient();
      const { error } = await supabase
        .from('venue_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error && deleted) {
        setComments((prev) => [deleted, ...prev]);
      }
    },
    [user, comments],
  );

  const submitReply = useCallback(
    async (commentId: string, body: string): Promise<CommentReply | null> => {
      if (!user) return null;

      try {
        const res = await fetch('/api/venue/comment-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId, venueId, body }),
        });
        const data = await res.json();
        if (!data.reply) return null;

        const reply: CommentReply = {
          ...data.reply,
          profile: { display_name: user.user_metadata?.full_name || null, avatar_url: user.user_metadata?.avatar_url || null },
        };

        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c,
          ),
        );

        return reply;
      } catch {
        return null;
      }
    },
    [user, venueId],
  );

  const deleteReply = useCallback(
    async (replyId: string, commentId: string) => {
      if (!user) return;

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c,
        ),
      );

      try {
        await fetch('/api/venue/comment-reply', {
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

  return (
    <VenueCommentsContext.Provider value={{ comments, commentCount: comments.length, loading, submitComment, deleteComment, submitReply, deleteReply }}>
      {children}
    </VenueCommentsContext.Provider>
  );
}

export function useVenueComments() {
  const ctx = useContext(VenueCommentsContext);
  if (!ctx) throw new Error('useVenueComments must be used within VenueCommentsProvider');
  return ctx;
}
