'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

export interface VenueReview {
  id: string;
  user_id: string;
  rating: number;
  text: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

interface VenueReviewsContextType {
  reviews: VenueReview[];
  userReview: VenueReview | null;
  averageRating: number | null;
  reviewCount: number;
  loading: boolean;
  submitReview: (rating: number, text: string | null, isAnonymous: boolean) => Promise<void>;
  deleteReview: () => Promise<void>;
}

const VenueReviewsContext = createContext<VenueReviewsContextType | null>(null);

export default function VenueReviewsProvider({ venueId, children }: { venueId: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<VenueReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [prevVenueId, setPrevVenueId] = useState(venueId);

  // Reset loading state when venueId changes (React-recommended pattern)
  if (prevVenueId !== venueId) {
    setPrevVenueId(venueId);
    setLoading(true);
    setReviews([]);
  }

  // Fetch all reviews for this venue
  useEffect(() => {
    let cancelled = false;

    const supabase = createClient();
    supabase
      .from('venue_reviews')
      .select('id, user_id, rating, text, is_anonymous, created_at, updated_at, profiles(display_name, avatar_url)')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setReviews(
            data.map((r: Record<string, unknown>) => ({
              id: r.id as string,
              user_id: r.user_id as string,
              rating: r.rating as number,
              text: r.text as string | null,
              is_anonymous: r.is_anonymous as boolean,
              created_at: r.created_at as string,
              updated_at: r.updated_at as string,
              profile: r.profiles as { display_name: string | null; avatar_url: string | null } | null,
            })),
          );
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [venueId]);

  const userReview = user ? reviews.find((r) => r.user_id === user.id) ?? null : null;

  const averageRating = reviews.length > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  const submitReview = useCallback(
    async (rating: number, text: string | null, isAnonymous: boolean) => {
      if (!user) return;

      const now = new Date().toISOString();
      const optimistic: VenueReview = {
        id: userReview?.id ?? crypto.randomUUID(),
        user_id: user.id,
        rating,
        text: text || null,
        is_anonymous: isAnonymous,
        created_at: userReview?.created_at ?? now,
        updated_at: now,
        profile: { display_name: user.user_metadata?.full_name || null, avatar_url: user.user_metadata?.avatar_url || null },
      };

      // Optimistic update
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.user_id !== user.id);
        return [optimistic, ...filtered];
      });

      const supabase = createClient();
      const { error } = await supabase
        .from('venue_reviews')
        .upsert(
          {
            user_id: user.id,
            venue_id: venueId,
            rating,
            text: text || null,
            is_anonymous: isAnonymous,
            updated_at: now,
          },
          { onConflict: 'user_id,venue_id' },
        );

      if (error) {
        // Revert on failure — refetch
        const { data } = await supabase
          .from('venue_reviews')
          .select('id, user_id, rating, text, is_anonymous, created_at, updated_at, profiles(display_name, avatar_url)')
          .eq('venue_id', venueId)
          .order('created_at', { ascending: false });
        if (data) {
          setReviews(
            data.map((r: Record<string, unknown>) => ({
              id: r.id as string,
              user_id: r.user_id as string,
              rating: r.rating as number,
              text: r.text as string | null,
              is_anonymous: r.is_anonymous as boolean,
              created_at: r.created_at as string,
              updated_at: r.updated_at as string,
              profile: r.profiles as { display_name: string | null; avatar_url: string | null } | null,
            })),
          );
        }
      }
    },
    [user, venueId, userReview],
  );

  const deleteReview = useCallback(async () => {
    if (!user || !userReview) return;

    // Optimistic removal
    setReviews((prev) => prev.filter((r) => r.user_id !== user.id));

    const supabase = createClient();
    const { error } = await supabase
      .from('venue_reviews')
      .delete()
      .eq('user_id', user.id)
      .eq('venue_id', venueId);

    if (error) {
      // Revert — re-add the review
      setReviews((prev) => [userReview, ...prev]);
    }
  }, [user, userReview, venueId]);

  return (
    <VenueReviewsContext.Provider value={{ reviews, userReview, averageRating, reviewCount: reviews.length, loading, submitReview, deleteReview }}>
      {children}
    </VenueReviewsContext.Provider>
  );
}

export function useVenueReviews() {
  const ctx = useContext(VenueReviewsContext);
  if (!ctx) throw new Error('useVenueReviews must be used within VenueReviewsProvider');
  return ctx;
}
