import { notFound } from 'next/navigation';
import { getVenues, getEvents, getArtists, resolveLinks } from '@/lib/supabase';
import { displayName, eventTitle, artistDisplayName, photoUrl, isEventTonight } from '@/lib/helpers';

export const revalidate = 3600; // 1 hour

interface EmbedSearchParams {
  locale?: string;
  theme?: string;
  limit?: string;
  accent?: string;
}

export default async function VenueEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<EmbedSearchParams>;
}) {
  const { slug } = await params;
  const { locale = 'en', theme = 'dark', limit = '6', accent } = await searchParams;
  const maxEvents = Math.min(parseInt(limit, 10) || 6, 12);

  const [venues, events, artists] = await Promise.all([
    getVenues(),
    getEvents(),
    getArtists(),
  ]);

  const venue = venues.find((v) => v.id === slug);
  if (!venue) notFound();

  const f = venue.fields;
  const venueName = displayName(f);
  const now = new Date().toISOString();

  // Get upcoming events (today + future)
  const venueEvents = resolveLinks(f.event_list, events)
    .filter((e) => {
      if (!e.fields.start_at) return false;
      const isToday = isEventTonight(e.fields.start_at, e.fields.timezone || 'Asia/Taipei');
      const isFuture = e.fields.start_at >= now;
      return isToday || isFuture;
    })
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
    .slice(0, maxEvents);

  const isDark = theme !== 'light';
  const accentColor = accent || (isDark ? '#d4a843' : '#b8860b');

  const bg = isDark ? '#0a0a0a' : '#ffffff';
  const cardBg = isDark ? '#141414' : '#f5f5f5';
  const border = isDark ? '#262626' : '#e0e0e0';
  const text = isDark ? '#e5e5e5' : '#1a1a1a';
  const mutedText = isDark ? '#737373' : '#737373';
  const hoverBg = isDark ? '#1a1a1a' : '#ebebeb';

  const formatEventDate = (isoDate: string, tz: string) => {
    try {
      const d = new Date(isoDate);
      const options: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        timeZone: tz,
      };
      return {
        date: d.toLocaleDateString(locale, options),
        time: d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: tz }),
        day: d.toLocaleDateString(locale, { day: 'numeric', timeZone: tz }),
        month: d.toLocaleDateString(locale, { month: 'short', timeZone: tz }),
      };
    } catch {
      return { date: '', time: '', day: '', month: '' };
    }
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: bg,
      color: text,
      padding: '16px',
      minHeight: '100px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em' }}>
            {venueName}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: mutedText }}>
            Upcoming Events
          </p>
        </div>
        <a
          href={`https://jazznode.com/${locale}/venues/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '11px',
            color: accentColor,
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: '6px',
            border: `1px solid ${accentColor}40`,
          }}
        >
          View All →
        </a>
      </div>

      {/* Events */}
      {venueEvents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '32px 16px',
          color: mutedText,
          fontSize: '14px',
        }}>
          No upcoming events
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {venueEvents.map((event) => {
            const ef = event.fields;
            const tz = ef.timezone || 'Asia/Taipei';
            const { day, month, time } = formatEventDate(ef.start_at || '', tz);
            const title = eventTitle(ef, locale);
            const artist = resolveLinks(ef.primary_artist, artists)[0];
            const artistName = artist ? artistDisplayName(artist.fields, locale) : null;
            const poster = photoUrl(ef.poster_url);

            return (
              <a
                key={event.id}
                href={`https://jazznode.com/${locale}/events/${event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '10px',
                  borderRadius: '12px',
                  backgroundColor: cardBg,
                  border: `1px solid ${border}`,
                  textDecoration: 'none',
                  color: text,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = cardBg)}
              >
                {/* Date badge */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  backgroundColor: `${accentColor}15`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '10px', color: accentColor, fontWeight: 600, textTransform: 'uppercase', lineHeight: 1 }}>
                    {month}
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: accentColor, lineHeight: 1.1 }}>
                    {day}
                  </span>
                </div>

                {/* Poster thumbnail */}
                {poster && (
                  <img
                    src={poster}
                    alt=""
                    width={48}
                    height={48}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {title}
                  </p>
                  {artistName && (
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: mutedText }}>
                      {artistName}
                    </p>
                  )}
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: mutedText }}>
                    {time}
                    {ef.price_info && <span> · {ef.price_info}</span>}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* Powered by */}
      <div style={{
        marginTop: '12px',
        textAlign: 'center',
        fontSize: '10px',
        color: mutedText,
      }}>
        <a
          href="https://jazznode.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: mutedText, textDecoration: 'none' }}
        >
          Powered by JazzNode
        </a>
      </div>
    </div>
  );
}
