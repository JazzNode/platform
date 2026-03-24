import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendPremiumNotificationBatch } from '@/lib/premium-notifications';
import type { PremiumNotificationParams } from '@/lib/premium-notifications';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint: sends post-show recap inbox notifications to tier 2+ entity admins
 * for events that ended yesterday. The inbox insert triggers PWA push via pg_net.
 *
 * Runs daily at 10:00 UTC via Vercel Cron.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find events that ended yesterday (gives 1 day for analytics data to settle)
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(0, 0, 0, 0);

  const dayAfter = new Date(yesterday);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  const { data: events } = await supabase
    .from('events')
    .select('event_id, title_local, title_en, start_at, venue_id')
    .gte('start_at', yesterday.toISOString())
    .lt('start_at', dayAfter.toISOString());

  if (!events || events.length === 0) {
    return NextResponse.json({ message: 'No events ended yesterday', sent: 0 });
  }

  const eventIds = events.map((e) => e.event_id);

  // Find tier 2+ artists who performed at these events
  const { data: lineups } = await supabase
    .from('lineups')
    .select('event_id, artist_id')
    .in('event_id', eventIds);

  const artistIds = [...new Set((lineups || []).map((l) => l.artist_id).filter(Boolean))];

  const { data: artists } = artistIds.length > 0
    ? await supabase
        .from('artists')
        .select('artist_id, display_name, admin_user_id, tier')
        .in('artist_id', artistIds)
        .gte('tier', 2)
        .not('admin_user_id', 'is', null)
    : { data: [] };

  // Find tier 2+ venues that hosted these events
  const venueIds = [...new Set(events.map((e) => e.venue_id).filter(Boolean))];

  const { data: venues } = venueIds.length > 0
    ? await supabase
        .from('venues')
        .select('venue_id, display_name, admin_user_id, tier')
        .in('venue_id', venueIds)
        .gte('tier', 2)
        .not('admin_user_id', 'is', null)
    : { data: [] };

  // Build notification items
  const items: PremiumNotificationParams[] = [];

  // Map artist → their events for display name
  const artistEventMap = new Map<string, string[]>();
  for (const lineup of lineups || []) {
    if (!artistEventMap.has(lineup.artist_id)) {
      artistEventMap.set(lineup.artist_id, []);
    }
    artistEventMap.get(lineup.artist_id)!.push(lineup.event_id);
  }

  for (const artist of artists || []) {
    items.push({
      userId: artist.admin_user_id,
      type: 'post_show_recap',
      entityType: 'artist',
      entityId: artist.artist_id,
      entityName: artist.display_name,
    });
  }

  // Map venue → their events
  const eventVenueMap = new Map<string, string>();
  for (const event of events) {
    if (event.venue_id) eventVenueMap.set(event.event_id, event.venue_id);
  }

  for (const venue of venues || []) {
    items.push({
      userId: venue.admin_user_id,
      type: 'post_show_recap',
      entityType: 'venue',
      entityId: venue.venue_id,
      entityName: venue.display_name,
    });
  }

  const result = await sendPremiumNotificationBatch(items);

  console.log(
    `[post-show-recap] Events: ${events.length}, notifications sent=${result.sent} skipped=${result.skipped}`
  );

  return NextResponse.json({
    message: `Post-show recap notifications processed`,
    events: events.length,
    ...result,
  });
}
