import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * GET /api/owner/ai-report
 * Owner-only: fetch 30-day platform analytics + generate AI narrative report.
 */
export async function GET(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();

  // ── Fetch all data in parallel ──────────────────────────────────────────
  const [
    artistViewsCurr, artistViewsPrev,
    venueViewsCurr, venueViewsPrev,
    usersCurr, usersPrev,
    followsCurr, followsPrev,
    eventsCurr, eventsPrev,
    claimsCurr, claimsPrev,
    topArtistViews, topVenueViews,
    totalArtists, totalVenues, totalEvents,
    newSubscriptions,
  ] = await Promise.all([
    supabase.from('artist_page_views').select('viewed_at, city').gte('viewed_at', thirtyDaysAgo),
    supabase.from('artist_page_views').select('viewed_at').gte('viewed_at', sixtyDaysAgo).lt('viewed_at', thirtyDaysAgo),
    supabase.from('venue_page_views').select('viewed_at, city').gte('viewed_at', thirtyDaysAgo),
    supabase.from('venue_page_views').select('viewed_at').gte('viewed_at', sixtyDaysAgo).lt('viewed_at', thirtyDaysAgo),
    supabase.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('created_at').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    supabase.from('follows').select('created_at').gte('created_at', thirtyDaysAgo),
    supabase.from('follows').select('created_at').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    supabase.from('events').select('created_at').gte('created_at', thirtyDaysAgo),
    supabase.from('events').select('created_at').gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    supabase.from('claims').select('submitted_at, status').gte('submitted_at', thirtyDaysAgo),
    supabase.from('claims').select('submitted_at').gte('submitted_at', sixtyDaysAgo).lt('submitted_at', thirtyDaysAgo),
    supabase.from('artist_page_views').select('artist_id').gte('viewed_at', thirtyDaysAgo),
    supabase.from('venue_page_views').select('venue_id').gte('viewed_at', thirtyDaysAgo),
    supabase.from('artists').select('artist_id', { count: 'exact', head: true }),
    supabase.from('venues').select('venue_id', { count: 'exact', head: true }),
    supabase.from('events').select('event_id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('created_at').gte('created_at', thirtyDaysAgo),
  ]);

  function pct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const aViews = (artistViewsCurr.data || []).length;
  const vViews = (venueViewsCurr.data || []).length;
  const totalViews = aViews + vViews;
  const prevViews = (artistViewsPrev.data || []).length + (venueViewsPrev.data || []).length;

  const newUsers = (usersCurr.data || []).length;
  const prevUsers = (usersPrev.data || []).length;
  const newFollows = (followsCurr.data || []).length;
  const prevFollows = (followsPrev.data || []).length;
  const newEvents = (eventsCurr.data || []).length;
  const prevEvents = (eventsPrev.data || []).length;
  const newClaims = (claimsCurr.data || []).length;
  const prevClaims = (claimsPrev.data || []).length;
  const approvedClaims = (claimsCurr.data || []).filter((c) => c.status === 'approved').length;
  const newSubs = (newSubscriptions.data || []).length;

  // Top artists
  const artistCountMap: Record<string, number> = {};
  for (const v of (topArtistViews.data || [])) {
    artistCountMap[v.artist_id] = (artistCountMap[v.artist_id] || 0) + 1;
  }
  const topArtistIds = Object.entries(artistCountMap).sort(([, a], [, b]) => b - a).slice(0, 5);
  let topArtists: { name: string; views: number }[] = [];
  if (topArtistIds.length > 0) {
    const { data: names } = await supabase
      .from('artists').select('artist_id, display_name, name_en')
      .in('artist_id', topArtistIds.map(([id]) => id));
    const nameMap = new Map((names || []).map((a) => [a.artist_id, a.display_name || a.name_en || a.artist_id]));
    topArtists = topArtistIds.map(([id, views]) => ({ name: nameMap.get(id) || id, views }));
  }

  // Top venues
  const venueCountMap: Record<string, number> = {};
  for (const v of (topVenueViews.data || [])) {
    venueCountMap[v.venue_id] = (venueCountMap[v.venue_id] || 0) + 1;
  }
  const topVenueIds = Object.entries(venueCountMap).sort(([, a], [, b]) => b - a).slice(0, 5);
  let topVenues: { name: string; views: number }[] = [];
  if (topVenueIds.length > 0) {
    const { data: names } = await supabase
      .from('venues').select('venue_id, display_name')
      .in('venue_id', topVenueIds.map(([id]) => id));
    const nameMap = new Map((names || []).map((v) => [v.venue_id, v.display_name || v.venue_id]));
    topVenues = topVenueIds.map(([id, views]) => ({ name: nameMap.get(id) || id, views }));
  }

  // Top cities
  const cityMap: Record<string, number> = {};
  for (const v of [...(artistViewsCurr.data || []), ...(venueViewsCurr.data || [])]) {
    if (v.city) cityMap[v.city] = (cityMap[v.city] || 0) + 1;
  }
  const topCities = Object.entries(cityMap).sort(([, a], [, b]) => b - a).slice(0, 5)
    .map(([city, views]) => ({ city, views }));

  const kpis = {
    views: { current: totalViews, previous: prevViews, change: pct(totalViews, prevViews) },
    users: { current: newUsers, previous: prevUsers, change: pct(newUsers, prevUsers) },
    follows: { current: newFollows, previous: prevFollows, change: pct(newFollows, prevFollows) },
    events: { current: newEvents, previous: prevEvents, change: pct(newEvents, prevEvents) },
    claims: { current: newClaims, previous: prevClaims, change: pct(newClaims, prevClaims), approved: approvedClaims },
    newSubs,
    totals: {
      artists: totalArtists.count ?? 0,
      venues: totalVenues.count ?? 0,
      events: totalEvents.count ?? 0,
    },
  };

  // ── Build Claude prompt ─────────────────────────────────────────────────
  const monthLabel = now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });

  const dataContext = `
平台名稱：JazzNode（亞洲爵士音樂平台）
報告期間：過去 30 天（${monthLabel}）

【關鍵指標（與前30天比較）】
- 總頁面瀏覽：${totalViews} 次（${kpis.views.change >= 0 ? '+' : ''}${kpis.views.change}%）
  - 藝人頁面：${aViews} 次
  - 場地頁面：${vViews} 次
- 新增用戶：${newUsers} 人（${kpis.users.change >= 0 ? '+' : ''}${kpis.users.change}%）
- 新增追蹤：${newFollows} 次（${kpis.follows.change >= 0 ? '+' : ''}${kpis.follows.change}%）
- 新增活動：${newEvents} 場（${kpis.events.change >= 0 ? '+' : ''}${kpis.events.change}%）
- 新增認領申請：${newClaims} 件（已核准 ${approvedClaims} 件）
- 新增訂閱：${newSubs} 筆

【平台累計規模】
- 藝人總數：${kpis.totals.artists}
- 場地總數：${kpis.totals.venues}
- 活動總數：${kpis.totals.events}

【本月最熱門藝人（頁面瀏覽）】
${topArtists.map((a, i) => `${i + 1}. ${a.name}：${a.views} 次`).join('\n') || '（無數據）'}

【本月最熱門場地（頁面瀏覽）】
${topVenues.map((v, i) => `${i + 1}. ${v.name}：${v.views} 次`).join('\n') || '（無數據）'}

【主要流量城市】
${topCities.map((c, i) => `${i + 1}. ${c.city}：${c.views} 次`).join('\n') || '（無 GeoIP 數據）'}
`.trim();

  const prompt = `你是 JazzNode 平台的 AI 分析師，負責為平台創辦人（Shark）撰寫月度經營報告。

以下是本月的平台數據：

${dataContext}

請根據以上數據，用繁體中文撰寫一份簡潔有力的月度報告，格式如下：

**整體健康狀況**（1-2句，用直白語言說明平台本月整體表現是好是壞）

**亮點**（條列2-3個正面數據或趨勢）

**需要關注**（條列1-2個下滑或值得注意的指標，如無則說「本月無明顯警示」）

**下個月建議行動**（2-3個具體可執行的建議，基於數據）

語氣：直接、專業，像顧問報告，不要廢話。數字要具體引用。`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 500);
      return NextResponse.json({ error: `Claude API error ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const report = data.content?.[0]?.text || '';

    return NextResponse.json({
      kpis,
      topArtists,
      topVenues,
      topCities,
      report,
      generatedAt: now.toISOString(),
      monthLabel,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Report generation failed' },
      { status: 502 },
    );
  }
}
