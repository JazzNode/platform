import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getVenueWeeklyDigest, getArtistWeeklyDigest } from '@/lib/digest';
import { buildDigestEmailHtml } from '@/lib/digest-template';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint: sends weekly digest emails to tier 2+ venue and artist admins.
 *
 * Triggered every Monday at 09:00 UTC via Vercel Cron.
 * Protected by CRON_SECRET header.
 *
 * Query params:
 *   ?dry=true  -- preview what would be sent without actually sending
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const dryRun = request.nextUrl.searchParams.get('dry') === 'true';

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY && !dryRun) {
    console.warn('[digest] RESEND_API_KEY not set, skipping digest send');
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();

  // Fetch all tier 2+ venues with admin user email
  const { data: venues } = await supabase
    .from('venues')
    .select('venue_id, display_name, slug, admin_user_id')
    .gte('tier', 2)
    .not('admin_user_id', 'is', null);

  // Fetch all tier 2+ artists with admin user email
  const { data: artists } = await supabase
    .from('artists')
    .select('artist_id, display_name, slug, admin_user_id')
    .gte('tier', 2)
    .not('admin_user_id', 'is', null);

  // Collect all admin user IDs to fetch emails in one query
  const adminUserIds = new Set<string>();
  for (const v of venues ?? []) {
    if (v.admin_user_id) adminUserIds.add(v.admin_user_id);
  }
  for (const a of artists ?? []) {
    if (a.admin_user_id) adminUserIds.add(a.admin_user_id);
  }

  // Fetch profile emails for all admin users
  const emailMap = new Map<string, string>();
  if (adminUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', [...adminUserIds]);

    for (const p of profiles ?? []) {
      if (p.email) emailMap.set(p.id, p.email);
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process venues
  for (const venue of venues ?? []) {
    const email = emailMap.get(venue.admin_user_id);
    if (!email) {
      skipped++;
      continue;
    }

    try {
      const digest = await getVenueWeeklyDigest(venue.venue_id);
      if (!digest) {
        skipped++;
        continue;
      }

      const html = buildDigestEmailHtml(digest);

      if (dryRun) {
        console.log(
          `[digest/dry] Would send venue digest to ${email} for "${venue.display_name}"`
        );
        sent++;
        continue;
      }

      await sendEmail({
        to: email,
        subject: `Your weekly digest for ${digest.displayName}`,
        html,
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push(
        `venue:${venue.venue_id}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  // Process artists
  for (const artist of artists ?? []) {
    const email = emailMap.get(artist.admin_user_id);
    if (!email) {
      skipped++;
      continue;
    }

    try {
      const digest = await getArtistWeeklyDigest(artist.artist_id);
      if (!digest) {
        skipped++;
        continue;
      }

      const html = buildDigestEmailHtml(digest);

      if (dryRun) {
        console.log(
          `[digest/dry] Would send artist digest to ${email} for "${artist.display_name}"`
        );
        sent++;
        continue;
      }

      await sendEmail({
        to: email,
        subject: `Your weekly digest for ${digest.displayName}`,
        html,
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push(
        `artist:${artist.artist_id}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  const durationMs = Date.now() - startTime;

  console.log(
    `[digest] ${dryRun ? '[DRY RUN] ' : ''}Complete: sent=${sent} skipped=${skipped} failed=${failed} duration=${durationMs}ms`
  );

  return NextResponse.json({
    message: dryRun
      ? `[DRY RUN] Would send ${sent} digest emails`
      : `Sent ${sent} digest emails (${failed} failed, ${skipped} skipped)`,
    dryRun,
    sent,
    failed,
    skipped,
    durationMs,
    ...(errors.length > 0 && { errors }),
  });
}
