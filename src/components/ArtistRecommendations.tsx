'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface RecommendedArtist {
  artist_id: string;
  display_name: string;
  slug: string;
  instrument: string | null;
  avatar_url: string | null;
  city: string | null;
  venue_overlap: number;
  reason: string;
}

interface ArtistRecommendationsProps {
  venueId: string;
  locale: string;
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="w-14 h-14 rounded-full bg-[var(--muted)] border-2 border-[var(--border)] flex items-center justify-center text-lg font-bold text-[var(--muted-foreground)]">
      {initials}
    </div>
  );
}

export default function ArtistRecommendations({ venueId, locale }: ArtistRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!venueId) return;

    let cancelled = false;

    async function fetchRecommendations() {
      setLoading(true);
      setError(false);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch(
          `/api/venue/artist-recommendations?venueId=${encodeURIComponent(venueId)}`,
          {
            headers: { Authorization: `Bearer ${session?.access_token}` },
          },
        );

        if (!res.ok) {
          if (!cancelled) setError(true);
          return;
        }

        const json = await res.json();
        if (!cancelled) {
          setRecommendations(json.recommendations ?? []);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecommendations();
    return () => { cancelled = true; };
  }, [venueId]);

  if (loading) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <div className="h-5 w-48 bg-[var(--muted)] rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--muted)]/50 rounded-xl p-4 animate-pulse">
              <div className="w-14 h-14 rounded-full bg-[var(--muted)] mx-auto mb-3" />
              <div className="h-4 bg-[var(--muted)] rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-[var(--muted)] rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return null;

  if (recommendations.length === 0) {
    return (
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
            Artist Recommendations
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
            Not enough lineup data to generate recommendations yet. Recommendations improve as more events are added.
          </p>
        </div>
      </FadeUp>
    );
  }

  return (
    <FadeUp>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
          Artist Recommendations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {recommendations.map((artist) => (
            <Link
              key={artist.artist_id}
              href={`/${locale}/artists/${artist.slug}`}
              className="group bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-center transition-all hover:border-[var(--color-gold)]/40 hover:shadow-[0_0_20px_rgba(212,175,55,0.08)]"
            >
              {/* Avatar */}
              <div className="flex justify-center mb-3">
                {artist.avatar_url ? (
                  <Image
                    src={artist.avatar_url}
                    alt={artist.display_name}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[var(--border)] group-hover:border-[var(--color-gold)]/40 transition-colors"
                  />
                ) : (
                  <AvatarInitials name={artist.display_name} />
                )}
              </div>

              {/* Name */}
              <p className="text-sm font-semibold truncate group-hover:text-[var(--color-gold)] transition-colors">
                {artist.display_name}
              </p>

              {/* Instrument badge */}
              {artist.instrument && (
                <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)] border border-[var(--color-gold)]/20">
                  {artist.instrument}
                </span>
              )}

              {/* City */}
              {artist.city && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1.5 truncate">
                  {artist.city}
                </p>
              )}

              {/* Reason */}
              <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-2 leading-tight">
                {artist.reason}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </FadeUp>
  );
}
