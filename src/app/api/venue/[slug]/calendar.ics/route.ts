import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/venue/:slug/calendar.ics
 *
 * Public iCal feed — returns all upcoming events for a venue as a .ics file.
 * No authentication required so fans can subscribe in any calendar app.
 */

function toICSDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing venue slug' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get venue display name for calendar title
  const { data: venue } = await supabase
    .from('venues')
    .select('venue_id, display_name, name_local, name_en, address_local, address_en')
    .eq('venue_id', slug)
    .single();

  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
  }

  const venueName = venue.display_name || venue.name_local || venue.name_en || slug;
  const venueAddress = venue.address_local || venue.address_en || '';

  // Query upcoming events for this venue
  const { data: events, error: eventErr } = await supabase
    .from('events')
    .select('event_id, title, description, start_at, end_at')
    .eq('venue_id', slug)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })
    .limit(100);

  if (eventErr) {
    console.error('[venue-calendar.ics] event query error:', eventErr.message);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }

  // Build VEVENT entries
  const vevents = (events ?? []).map((evt) => {
    const dtStart = toICSDate(evt.start_at);
    const dtEnd = evt.end_at
      ? toICSDate(evt.end_at)
      : toICSDate(new Date(new Date(evt.start_at).getTime() + 2 * 60 * 60 * 1000).toISOString());

    const location = venueAddress ? `${venueName}, ${venueAddress}` : venueName;
    const description = evt.description ? escapeICSText(evt.description) : '';

    const lines = [
      'BEGIN:VEVENT',
      `UID:${evt.event_id}@jazznode.com`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICSText(evt.title || 'Untitled Event')}`,
      `LOCATION:${escapeICSText(location)}`,
    ];
    if (description) lines.push(`DESCRIPTION:${description}`);
    lines.push(`URL:https://jazznode.com/en/events/${evt.event_id}`);
    lines.push('END:VEVENT');
    return lines.join('\r\n');
  });

  // Empty but valid calendar if no events
  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JazzNode//Venue Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(venueName)} Events`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="venue-events.ics"`,
    },
  });
}
