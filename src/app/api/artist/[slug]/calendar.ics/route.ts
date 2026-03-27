import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artist/:slug/calendar.ics
 *
 * Public iCal feed — returns all upcoming events for an artist as a .ics file.
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
    return NextResponse.json({ error: 'Missing artist slug' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Get event IDs from lineups for this artist
  const { data: lineups, error: lineupErr } = await supabase
    .from('lineups')
    .select('event_id')
    .eq('artist_id', slug);

  if (lineupErr) {
    console.error('[calendar.ics] lineup query error:', lineupErr.message);
    return NextResponse.json({ error: 'Failed to fetch lineups' }, { status: 500 });
  }

  const eventIds = (lineups ?? []).map((l) => l.event_id).filter(Boolean);

  if (eventIds.length === 0) {
    // Return empty but valid calendar
    const emptyCal = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//JazzNode//Events//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Events',
      'END:VCALENDAR',
    ].join('\r\n');

    return new Response(emptyCal, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="artist-events.ics"',
      },
    });
  }

  // 2. Query upcoming events
  const { data: events, error: eventErr } = await supabase
    .from('events')
    .select('event_id, title, description, start_at, end_at, venue_id')
    .in('event_id', eventIds)
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true });

  if (eventErr) {
    console.error('[calendar.ics] event query error:', eventErr.message);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }

  // 3. Gather venue info for location strings
  const venueIds = [...new Set((events ?? []).map((e) => e.venue_id).filter(Boolean))];
  const venueMap = new Map<string, { display_name: string; address?: string }>();

  if (venueIds.length > 0) {
    const { data: venues } = await supabase
      .from('venues')
      .select('venue_id, display_name, address')
      .in('venue_id', venueIds);

    for (const v of venues ?? []) {
      venueMap.set(v.venue_id, { display_name: v.display_name, address: v.address });
    }
  }

  // 4. Build iCalendar output (RFC 5545)
  const vevents = (events ?? []).map((evt) => {
    const dtStart = toICSDate(evt.start_at);
    // Default to +2 hours if no end_at
    const dtEnd = evt.end_at
      ? toICSDate(evt.end_at)
      : toICSDate(new Date(new Date(evt.start_at).getTime() + 2 * 60 * 60 * 1000).toISOString());

    const venue = evt.venue_id ? venueMap.get(evt.venue_id) : undefined;
    const location = venue
      ? venue.address
        ? `${venue.display_name}, ${venue.address}`
        : venue.display_name
      : '';

    const description = evt.description ? escapeICSText(evt.description) : '';

    const lines = [
      'BEGIN:VEVENT',
      `UID:${evt.event_id}@jazznode.com`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICSText(evt.title || 'Untitled Event')}`,
    ];

    if (location) lines.push(`LOCATION:${escapeICSText(location)}`);
    if (description) lines.push(`DESCRIPTION:${description}`);

    lines.push('END:VEVENT');
    return lines.join('\r\n');
  });

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JazzNode//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${slug} Events`,
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="artist-events.ics"',
    },
  });
}
