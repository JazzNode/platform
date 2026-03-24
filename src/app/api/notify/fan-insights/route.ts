import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendPremiumNotificationBatch } from '@/lib/premium-notifications';
import type { PremiumNotificationParams } from '@/lib/premium-notifications';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint: sends fan insights notification to tier 2+ entity admins
 * on the 1st of each month when new monthly insights data is ready.
 * The inbox insert triggers PWA push via pg_net.
 *
 * Runs monthly on the 1st at 10:00 UTC via Vercel Cron.
 * Protected by CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all tier 2+ artists with admin user
  const { data: artists } = await supabase
    .from('artists')
    .select('artist_id, display_name, admin_user_id, tier')
    .gte('tier', 2)
    .not('admin_user_id', 'is', null);

  // Fetch all tier 2+ venues with admin user
  const { data: venues } = await supabase
    .from('venues')
    .select('venue_id, display_name, admin_user_id, tier')
    .gte('tier', 2)
    .not('admin_user_id', 'is', null);

  const items: PremiumNotificationParams[] = [];

  for (const artist of artists || []) {
    items.push({
      userId: artist.admin_user_id,
      type: 'fan_insights',
      entityType: 'artist',
      entityId: artist.artist_id,
      entityName: artist.display_name,
    });
  }

  for (const venue of venues || []) {
    items.push({
      userId: venue.admin_user_id,
      type: 'fan_insights',
      entityType: 'venue',
      entityId: venue.venue_id,
      entityName: venue.display_name,
    });
  }

  if (items.length === 0) {
    return NextResponse.json({ message: 'No tier 2+ entities found', sent: 0, skipped: 0 });
  }

  const result = await sendPremiumNotificationBatch(items);

  console.log(
    `[fan-insights] Notifications sent=${result.sent} skipped=${result.skipped}`
  );

  return NextResponse.json({
    message: 'Fan insights notifications processed',
    ...result,
  });
}
