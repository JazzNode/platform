import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Cron endpoint: sends push notifications about tonight's events
 * to users who follow venues that have events today.
 *
 * Triggered daily at ~17:00 local time via Vercel Cron.
 * Protected by CRON_SECRET header.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@jazznode.com';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const supabase = createAdminClient();

  // 1. Get today's events (with venue info)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data: todayEvents } = await supabase
    .from('events')
    .select('event_id, title_local, title_en, start_at, venue_id')
    .gte('start_at', todayStart)
    .lt('start_at', todayEnd)
    .order('start_at');

  if (!todayEvents || todayEvents.length === 0) {
    return NextResponse.json({ message: 'No events tonight', sent: 0 });
  }

  // 2. Get venue IDs from tonight's events
  type EventRow = { event_id: string; title_local: string | null; title_en: string | null; start_at: string; venue_id: string[] | null };
  const venueIds = [...new Set((todayEvents as EventRow[]).flatMap((e: EventRow) => e.venue_id || []))];

  // 3. Find users who follow these venues
  const { data: follows } = await supabase
    .from('follows')
    .select('user_id, target_id')
    .eq('target_type', 'venue')
    .in('target_id', venueIds);

  type FollowRow = { user_id: string; target_id: string };
  if (!follows || follows.length === 0) {
    return NextResponse.json({ message: 'No followers to notify', sent: 0 });
  }

  // 4. Get push subscriptions for these users
  const userIds = [...new Set((follows as FollowRow[]).map((f: FollowRow) => f.user_id))];
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds);

  type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string };
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ message: 'No push subscriptions found', sent: 0 });
  }

  // 5. Build per-user notification: "Tonight: N shows at venues you follow"
  const userVenueMap = new Map<string, Set<string>>();
  for (const f of follows as FollowRow[]) {
    if (!userVenueMap.has(f.user_id)) userVenueMap.set(f.user_id, new Set());
    userVenueMap.get(f.user_id)!.add(f.target_id);
  }

  // Get venue names
  const { data: venueData } = await supabase
    .from('venues')
    .select('venue_id, display_name, name_local, name_en')
    .in('venue_id', venueIds);
  type VenueRow = { venue_id: string; display_name: string | null; name_local: string | null; name_en: string | null };
  const venueNameMap = new Map(
    ((venueData || []) as VenueRow[]).map((v: VenueRow) => [v.venue_id, v.display_name || v.name_local || v.name_en || 'Unknown'])
  );

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subscriptions as SubRow[]) {
    const followedVenues = userVenueMap.get(sub.user_id);
    if (!followedVenues) continue;

    // Find tonight's events at venues this user follows
    const relevantEvents = (todayEvents as EventRow[]).filter((e: EventRow) =>
      (e.venue_id || []).some((vid: string) => followedVenues.has(vid))
    );
    if (relevantEvents.length === 0) continue;

    // Build notification message
    const eventCount = relevantEvents.length;
    const firstEvent = relevantEvents[0];
    const firstVenueName = (firstEvent.venue_id || [])
      .map((vid: string) => venueNameMap.get(vid))
      .filter(Boolean)[0] || '';
    const title = firstEvent.title_local || firstEvent.title_en || 'Jazz Tonight';

    const body = eventCount === 1
      ? `${title} @ ${firstVenueName}`
      : `${eventCount} shows tonight at venues you follow`;

    const payload = JSON.stringify({
      title: '🎷 Tonight on JazzNode',
      body,
      url: '/',
      tag: `tonight-${todayStart.slice(0, 10)}`,
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      // Clean up expired subscriptions (410 Gone or 404)
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const statusCode = (err as { statusCode: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }
  }

  // Remove stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  return NextResponse.json({
    message: `Sent ${sent} notifications (${failed} failed, ${staleEndpoints.length} cleaned)`,
    sent,
    failed,
    cleaned: staleEndpoints.length,
    eventsTonight: todayEvents.length,
  });
}
