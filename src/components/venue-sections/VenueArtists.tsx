import Image from 'next/image';
import Link from 'next/link';
import type { Artist } from '@/lib/supabase';
import { photoUrl, artistDisplayName } from '@/lib/helpers';

interface VenueArtistsProps {
  artists: { id: string; fields: Artist }[];
  artistCounts: Map<string, number>;
  locale: string;
  t: (key: string) => string;
  instLabel: (key: string) => string;
}

export default function VenueArtists({
  artists,
  artistCounts,
  locale,
  t,
  instLabel,
}: VenueArtistsProps) {
  if (artists.length === 0) return null;

  const displayed = artists.slice(0, 10);

  return (
    <section className="border-t border-[var(--border)] pt-12">
      <h2 className="font-serif text-xl sm:text-2xl font-bold mb-6">
        {t('residentArtists')}
      </h2>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
        {displayed.map((a) => {
          const photo = photoUrl(a.fields.photo_url);
          const name = artistDisplayName(a.fields, locale);
          const instrument = a.fields.primary_instrument;
          const count = artistCounts.get(a.id) || 0;

          return (
            <Link
              key={a.id}
              href={`/${locale}/artists/${a.id}`}
              className="group relative shrink-0 w-[140px] sm:w-[calc((100%-60px)/6)] rounded-xl overflow-hidden card-hover aspect-square"
            >
              {/* Full-bleed photo */}
              {photo ? (
                <Image
                  src={photo}
                  alt={name}
                  fill
                  className="object-cover transition-all duration-700 group-hover:scale-[1.05]"
                  sizes="170px"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--card)] to-[var(--background)] flex items-center justify-center">
                  <svg className="w-10 h-10 text-[var(--muted-foreground)]/20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

              {/* Text overlay */}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="text-sm font-bold text-white drop-shadow-lg line-clamp-1 group-hover:text-gold transition-colors duration-300">
                  {name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {instrument && (
                    <span className="text-[10px] text-white/70 uppercase tracking-widest drop-shadow">
                      {instLabel(instrument)}
                    </span>
                  )}
                  {instrument && <span className="text-white/30 text-[8px]">·</span>}
                  <span className="text-[10px] text-white/50 drop-shadow">
                    {count} {t('gigsCount')}
                  </span>
                </div>
              </div>

              {/* Subtle border + hover glow */}
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-gold/30 transition-all duration-300" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
