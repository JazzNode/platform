export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/digest/monthly-ai
 *
 * Cron endpoint: generates a monthly data-driven insights notification
 * for all Elite (tier 3+) artists.
 *
 * Protected by CRON_SECRET header.
 *
 * Query params:
 *   ?dry=true  -- preview what would be generated without writing notifications
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const dryRun = request.nextUrl.searchParams.get('dry') === 'true';

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 1. Get all tier 3+ artists with their admin_user_id
  const { data: artists, error: artistErr } = await supabase
    .from('artists')
    .select('artist_id, display_name, slug, admin_user_id, locale')
    .gte('tier', 3)
    .not('admin_user_id', 'is', null);

  if (artistErr) {
    console.error('[monthly-ai] Failed to fetch artists:', artistErr.message);
    return NextResponse.json({ error: 'Failed to fetch artists' }, { status: 500 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const monthLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];
  const previews: { artistId: string; name: string; summary: string }[] = [];

  for (const artist of artists ?? []) {
    if (!artist.admin_user_id) {
      skipped++;
      continue;
    }

    try {
      // ── Gather last 30 days data ──────────────────────────────────

      // Page views (current month)
      const { count: viewsCurrent } = await supabase
        .from('artist_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.artist_id)
        .gte('viewed_at', thirtyDaysAgo);

      // Page views (previous month, for trend)
      const { count: viewsPrevious } = await supabase
        .from('artist_page_views')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.artist_id)
        .gte('viewed_at', sixtyDaysAgo)
        .lt('viewed_at', thirtyDaysAgo);

      // New followers
      const { count: newFollowers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.artist_id)
        .gte('created_at', thirtyDaysAgo);

      // New shoutouts
      const { count: newShoutouts } = await supabase
        .from('artist_shoutouts')
        .select('*', { count: 'exact', head: true })
        .eq('artist_id', artist.artist_id)
        .gte('created_at', thirtyDaysAgo);

      // Gig count (lineups joined with events in the last 30 days)
      const { data: lineups } = await supabase
        .from('lineups')
        .select('event_id')
        .eq('artist_id', artist.artist_id);

      const eventIds = (lineups ?? []).map((l) => l.event_id).filter(Boolean);
      let gigCount = 0;
      if (eventIds.length > 0) {
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .gte('start_at', thirtyDaysAgo)
          .lte('start_at', new Date().toISOString());

        gigCount = count ?? 0;
      }

      // ── Build data-driven summary ─────────────────────────────────

      const views = viewsCurrent ?? 0;
      const prevViews = viewsPrevious ?? 0;
      const followers = newFollowers ?? 0;
      const shoutouts = newShoutouts ?? 0;

      const trend =
        prevViews === 0
          ? views > 0
            ? 'up'
            : 'stable'
          : views > prevViews * 1.1
            ? 'up'
            : views < prevViews * 0.9
              ? 'down'
              : 'stable';

      const trendEmoji = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
      const locale = artist.locale || 'en';

      const summary = buildTemplateSummary({
        name: artist.display_name || artist.slug || artist.artist_id,
        views,
        trend,
        trendEmoji,
        followers,
        shoutouts,
        gigs: gigCount,
        locale,
      });

      if (dryRun) {
        previews.push({
          artistId: artist.artist_id,
          name: artist.display_name || artist.artist_id,
          summary,
        });
        sent++;
        continue;
      }

      // ── Write notification ────────────────────────────────────────

      const { error: insertErr } = await supabase.from('notifications').insert({
        user_id: artist.admin_user_id,
        type: 'monthly_summary',
        title: `📊 Monthly Insights — ${monthLabel}`,
        body: summary,
        reference_type: 'artist',
        reference_id: artist.artist_id,
        status: 'sent',
      });

      if (insertErr) {
        throw new Error(insertErr.message);
      }

      sent++;
    } catch (err) {
      failed++;
      errors.push(
        `artist:${artist.artist_id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  // ═══ VENUE MONTHLY SUMMARIES ═══════════════════════════════════════════

  const { data: eliteVenues, error: venueErr } = await supabase
    .from('venues')
    .select('venue_id, display_name, name_local, name_en')
    .gte('tier', 3);

  if (!venueErr && eliteVenues) {
    for (const venue of eliteVenues) {
      // Find the venue owner (user who claimed it)
      const { data: owners } = await supabase
        .from('profiles')
        .select('id')
        .contains('claimed_venue_ids', [venue.venue_id])
        .limit(1);

      const ownerId = owners?.[0]?.id;
      if (!ownerId) { skipped++; continue; }

      try {
        const vName = venue.display_name || venue.name_local || venue.name_en || venue.venue_id;

        // Page views
        const { count: vViewsCurrent } = await supabase
          .from('venue_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', venue.venue_id)
          .gte('viewed_at', thirtyDaysAgo);

        const { count: vViewsPrevious } = await supabase
          .from('venue_page_views')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', venue.venue_id)
          .gte('viewed_at', sixtyDaysAgo)
          .lt('viewed_at', thirtyDaysAgo);

        // New followers
        const { count: vNewFollowers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('target_type', 'venue')
          .eq('target_id', venue.venue_id)
          .gte('created_at', thirtyDaysAgo);

        // Events this month
        const { count: vEventCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('venue_id', venue.venue_id)
          .gte('start_at', thirtyDaysAgo)
          .lte('start_at', new Date().toISOString());

        const vViews = vViewsCurrent ?? 0;
        const vPrevViews = vViewsPrevious ?? 0;
        const vFollowers = vNewFollowers ?? 0;
        const vEvents = vEventCount ?? 0;

        const vTrend = vPrevViews === 0 ? (vViews > 0 ? 'up' : 'stable') : vViews > vPrevViews * 1.1 ? 'up' : vViews < vPrevViews * 0.9 ? 'down' : 'stable';
        const vTrendEmoji = vTrend === 'up' ? '📈' : vTrend === 'down' ? '📉' : '➡️';

        const vSummary = buildVenueSummary({ name: vName, views: vViews, trend: vTrend, trendEmoji: vTrendEmoji, followers: vFollowers, events: vEvents });

        if (dryRun) {
          previews.push({ artistId: `venue:${venue.venue_id}`, name: vName, summary: vSummary });
          sent++;
          continue;
        }

        await supabase.from('notifications').insert({
          user_id: ownerId,
          type: 'monthly_summary',
          title: `📊 Monthly Venue Insights — ${monthLabel}`,
          body: vSummary,
          reference_type: 'venue',
          reference_id: venue.venue_id,
          status: 'sent',
        });
        sent++;
      } catch (err) {
        failed++;
        errors.push(`venue:${venue.venue_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  }

  const durationMs = Date.now() - startTime;

  console.log(
    `[monthly-ai] ${dryRun ? '[DRY RUN] ' : ''}Complete: sent=${sent} skipped=${skipped} failed=${failed} duration=${durationMs}ms`,
  );

  return NextResponse.json({
    message: dryRun
      ? `[DRY RUN] Would generate ${sent} monthly summaries`
      : `Generated ${sent} monthly summaries (${failed} failed, ${skipped} skipped)`,
    dryRun,
    sent,
    failed,
    skipped,
    durationMs,
    ...(dryRun && previews.length > 0 && { previews }),
    ...(errors.length > 0 && { errors }),
  });
}

// ── Template-based summary generator ─────────────────────────────────────

interface SummaryInput {
  name: string;
  views: number;
  trend: string;
  trendEmoji: string;
  followers: number;
  shoutouts: number;
  gigs: number;
  locale: string;
}

function buildTemplateSummary(input: SummaryInput): string {
  const { name, views, trend, trendEmoji, followers, shoutouts, gigs, locale } = input;

  if (locale.startsWith('zh')) {
    const trendText = trend === 'up' ? '上升' : trend === 'down' ? '下降' : '穩定';
    const sentence1 = `${trendEmoji} 本月你的頁面獲得了 ${views} 次瀏覽（趨勢：${trendText}），新增 ${followers} 位追蹤者和 ${shoutouts} 則推薦。`;
    const sentence2 =
      gigs > 0
        ? `你在過去 30 天完成了 ${gigs} 場演出，持續保持舞台能見度！`
        : '這個月沒有登台紀錄，考慮安排一場演出來提升曝光吧。';
    const suggestion =
      trend === 'down'
        ? '💡 建議分享近期的演出花絮或排練片段，吸引更多聽眾關注。'
        : followers < 5
          ? '💡 建議在社群分享你的 JazzNode 頁面連結，邀請樂迷追蹤。'
          : '💡 繼續保持！考慮更新你的 EPK 或新增演出影片。';
    return `${sentence1}\n${sentence2}\n${suggestion}`;
  }

  // English (default)
  const trendText = trend === 'up' ? 'trending up' : trend === 'down' ? 'trending down' : 'holding steady';
  const sentence1 = `${trendEmoji} This month your page received ${views} views (${trendText}), with ${followers} new follower${followers !== 1 ? 's' : ''} and ${shoutouts} shoutout${shoutouts !== 1 ? 's' : ''}.`;
  const sentence2 =
    gigs > 0
      ? `You performed ${gigs} gig${gigs !== 1 ? 's' : ''} in the past 30 days — great stage presence!`
      : 'No gigs logged this month — consider booking a show to boost your visibility.';
  const suggestion =
    trend === 'down'
      ? '💡 Try sharing behind-the-scenes content or rehearsal clips to re-engage your audience.'
      : followers < 5
        ? '💡 Share your JazzNode profile link on social media to attract new followers.'
        : '💡 Keep the momentum going! Consider updating your EPK or adding live performance videos.';

  return `${sentence1}\n${sentence2}\n${suggestion}`;
}

// ── Venue summary generator ─────────────────────────────────────────────

interface VenueSummaryInput {
  name: string;
  views: number;
  trend: string;
  trendEmoji: string;
  followers: number;
  events: number;
}

function buildVenueSummary(input: VenueSummaryInput): string {
  const { name, views, trend, trendEmoji, followers, events } = input;

  // Chinese version
  const zhTrend = trend === 'up' ? '上升' : trend === 'down' ? '下降' : '穩定';
  const zh1 = `${trendEmoji} 本月 ${name} 的頁面獲得了 ${views} 次瀏覽（趨勢：${zhTrend}），新增 ${followers} 位追蹤者。`;
  const zh2 = events > 0 ? `過去 30 天舉辦了 ${events} 場演出。` : '本月尚無演出紀錄。';
  const zhSug = trend === 'down'
    ? '💡 建議發布公告或分享演出花絮，重新吸引粉絲關注。'
    : followers < 3
      ? '💡 建議在社群分享場地頁面連結，邀請更多樂迷追蹤。'
      : '💡 表現不錯！考慮上架周邊商品或發布活動預告。';

  // English version
  const enTrend = trend === 'up' ? 'trending up' : trend === 'down' ? 'trending down' : 'holding steady';
  const en1 = `${trendEmoji} This month ${name} received ${views} page views (${enTrend}), with ${followers} new follower${followers !== 1 ? 's' : ''}.`;
  const en2 = events > 0 ? `${events} event${events !== 1 ? 's' : ''} hosted in the past 30 days.` : 'No events logged this month.';
  const enSug = trend === 'down'
    ? '💡 Try posting an announcement or sharing behind-the-scenes content to re-engage fans.'
    : followers < 3
      ? '💡 Share your venue page link on social media to attract new followers.'
      : '💡 Great momentum! Consider listing merchandise or posting event teasers.';

  return `${en1}\n${en2}\n${enSug}\n\n${zh1}\n${zh2}\n${zhSug}`;
}
