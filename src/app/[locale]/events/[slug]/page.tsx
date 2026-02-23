import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getEvents, getVenues, getArtists, getBadges, resolveLinks, type Event, type Venue, type Artist } from '@/lib/airtable';
import { displayName, formatDate, formatTime, photoUrl, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getEvents();
  const event = events.find((e) => e.id === slug);
  const title = event?.fields.title || event?.fields.title_local || 'Event';
  return { title };
}

export default async function EventDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');

  const [events, venues, artists, badges] = await Promise.all([getEvents(), getVenues(), getArtists(), getBadges()]);
  const event = events.find((e) => e.id === slug);

  if (!event) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">Event not found.</p>
        <Link href={`/${locale}/events`} className="text-gold mt-4 inline-block link-lift">← Back to events</Link>
      </div>
    );
  }

  const f = event.fields;
  const tz = f.timezone || 'Asia/Taipei';
  const venue = resolveLinks(f.venue_id, venues)[0];
  const primaryArtist = resolveLinks(f.primary_artist, artists)[0];
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const descShort = localized(f as Record<string, unknown>, 'description_short', locale);

  return (
    <div className="space-y-12">
      {/* Back link */}
      <Link href={`/${locale}/events`} className="text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        ← {t('backToList')}
      </Link>

      {/* Hero section */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Poster */}
        {f.poster_url && (
          <div className="w-full lg:w-[400px] shrink-0">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={f.poster_url}
                alt={f.title || ''}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 space-y-6">
          {/* Date & time */}
          <div className="text-sm uppercase tracking-widest text-gold">
            {formatDate(f.start_at, locale, tz)} · {formatTime(f.start_at, tz)}
            {f.end_at && ` — ${formatTime(f.end_at, tz)}`}
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight">
            {f.title || f.title_local || f.title_en || 'Untitled Event'}
          </h1>

          {/* Venue */}
          {venue && (
            <Link
              href={`/${locale}/venues/${venue.id}`}
              className="inline-flex items-center gap-2 text-lg text-[#8A8578] hover:text-gold transition-colors link-lift"
            >
              <span className="text-gold">↗</span> {displayName(venue.fields)}
              {venue.fields.city && <span className="text-sm">· {venue.fields.city}</span>}
            </Link>
          )}

          {/* Primary artist */}
          {primaryArtist && (
            <Link
              href={`/${locale}/artists/${primaryArtist.id}`}
              className="inline-flex items-center gap-2 text-lg text-[#8A8578] hover:text-gold transition-colors link-lift"
            >
              <span className="text-gold">♪</span> {displayName(primaryArtist.fields)}
              {primaryArtist.fields.primary_instrument && (
                <span className="text-sm capitalize">· {primaryArtist.fields.primary_instrument}</span>
              )}
            </Link>
          )}

          {/* Price & ticket */}
          <div className="flex flex-wrap gap-4 items-center">
            {f.price_info && (
              <span className="text-sm text-[#F0EDE6] bg-[#1A1A1A] px-4 py-2 rounded-xl border border-[rgba(240,237,230,0.08)]">
                {f.price_info}
              </span>
            )}
            {f.ticket_url && (
              <a
                href={f.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-magnetic inline-flex items-center gap-2 bg-gold text-[#0A0A0A] px-6 py-3 text-sm font-bold uppercase tracking-widest"
              >
                <span>{t('ticketLink')} ↗</span>
              </a>
            )}
          </div>

          {/* Description */}
          {desc && (
            <div className="border-t border-[rgba(240,237,230,0.06)] pt-6">
              <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">{desc}</p>
            </div>
          )}
          {!desc && descShort && (
            <div className="border-t border-[rgba(240,237,230,0.06)] pt-6">
              <p className="text-[#C4BFB3] leading-relaxed">{descShort}</p>
            </div>
          )}
        </div>
      </div>

      </FadeUp>

      {/* Related: More from this venue */}
      {venue && (
        <FadeUp>
        <section className="border-t border-[rgba(240,237,230,0.06)] pt-12">
          <h2 className="font-serif text-2xl font-bold mb-8">
            More at {displayName(venue.fields)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resolveLinks(venue.fields.event_list, events)
              .filter((e) => e.id !== event.id)
              .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''))
              .slice(0, 3)
              .map((related) => {
                const rtz = related.fields.timezone || 'Asia/Taipei';
                return (
                  <Link key={related.id} href={`/${locale}/events/${related.id}`} className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                    {related.fields.poster_url && (
                      <div className="h-36 overflow-hidden mb-4 -mx-5 -mt-5 rounded-t-2xl">
                        <img src={related.fields.poster_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
                      </div>
                    )}
                    <div className="text-xs uppercase tracking-widest text-gold mb-2">
                      {formatDate(related.fields.start_at, locale, rtz)}
                    </div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                      {related.fields.title || related.fields.title_local || 'Event'}
                    </h3>
                  </Link>
                );
              })}
          </div>
        </section>
        </FadeUp>
      )}
    </div>
  );
}
