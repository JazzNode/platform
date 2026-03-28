import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const LANG_INSTRUCTIONS: Record<string, string> = {
  zh: '請用繁體中文撰寫報告。',
  en: 'Write the report in English.',
  ja: '日本語でレポートを作成してください。です/ます体で。',
  ko: '한국어로 보고서를 작성해주세요. 합니다체로.',
};

/**
 * GET /api/artist/ai-report?artistId=xxx
 * Elite artist (tier 3+): generate or retrieve AI monthly report.
 */
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const { isAuthorized, userId } = await verifyArtistClaimToken(req.headers.get('authorization'), artistId);
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  const { data: artist } = await supabase
    .from('artists')
    .select('tier, display_name, name_local, name_en, locale')
    .eq('artist_id', artistId)
    .single();

  if (!artist || (artist.tier ?? 0) < 3) {
    return NextResponse.json({ error: 'Elite tier required' }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;

  // ── History ─────────────────────────────────────────────────────────────
  if (params.get('history') === 'true') {
    const { data: reports } = await supabase
      .from('ai_reports')
      .select('id, generated_at, report')
      .eq('entity_type', 'artist')
      .eq('entity_id', artistId)
      .order('generated_at', { ascending: false })
      .limit(30);

    return NextResponse.json({
      reports: (reports || []).map((r) => ({
        id: r.id,
        generated_at: r.generated_at,
        preview: r.report.slice(0, 120),
      })),
    });
  }

  // ── Specific report ─────────────────────────────────────────────────────
  const reportId = params.get('id');
  if (reportId) {
    const { data: archived } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('id', reportId)
      .eq('entity_type', 'artist')
      .eq('entity_id', artistId)
      .single();

    if (!archived) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    return NextResponse.json({ kpis: archived.kpis, report: archived.report, generatedAt: archived.generated_at, cached: true });
  }

  // ── Rate limit: 1/day per artist ────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayReport } = await supabase
    .from('ai_reports')
    .select('*')
    .eq('entity_type', 'artist')
    .eq('entity_id', artistId)
    .gte('generated_at', todayStart.toISOString())
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (todayReport) {
    return NextResponse.json({ kpis: todayReport.kpis, report: todayReport.report, generatedAt: todayReport.generated_at, cached: true });
  }

  // ── Generate ────────────────────────────────────────────────────────────
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();

  const [viewsCurr, viewsPrev, followersCurr, followersPrev, shoutoutsCurr, lineups] = await Promise.all([
    supabase.from('artist_page_views').select('viewed_at, city').eq('artist_id', artistId).gte('viewed_at', thirtyDaysAgo),
    supabase.from('artist_page_views').select('viewed_at').eq('artist_id', artistId).gte('viewed_at', sixtyDaysAgo).lt('viewed_at', thirtyDaysAgo),
    supabase.from('follows').select('created_at').eq('artist_id', artistId).gte('created_at', thirtyDaysAgo),
    supabase.from('follows').select('created_at').eq('artist_id', artistId).gte('created_at', sixtyDaysAgo).lt('created_at', thirtyDaysAgo),
    supabase.from('artist_shoutouts').select('created_at').eq('artist_id', artistId).gte('created_at', thirtyDaysAgo),
    supabase.from('lineups').select('event_id').eq('artist_id', artistId),
  ]);

  // Count gigs
  const eventIds = (lineups.data ?? []).map((l) => l.event_id).filter(Boolean);
  let gigCount = 0;
  if (eventIds.length > 0) {
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .gte('start_at', thirtyDaysAgo)
      .lte('start_at', now.toISOString());
    gigCount = count ?? 0;
  }

  let prevGigCount = 0;
  if (eventIds.length > 0) {
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .gte('start_at', sixtyDaysAgo)
      .lt('start_at', thirtyDaysAgo);
    prevGigCount = count ?? 0;
  }

  function pct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const views = (viewsCurr.data || []).length;
  const prevViews = (viewsPrev.data || []).length;
  const followers = (followersCurr.data || []).length;
  const prevFollowers = (followersPrev.data || []).length;
  const shoutouts = (shoutoutsCurr.data || []).length;

  const cityMap: Record<string, number> = {};
  for (const v of (viewsCurr.data || [])) { if (v.city) cityMap[v.city] = (cityMap[v.city] || 0) + 1; }
  const topCities = Object.entries(cityMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([city, count]) => ({ city, count }));

  const kpis = {
    views: { current: views, previous: prevViews, change: pct(views, prevViews) },
    followers: { current: followers, previous: prevFollowers, change: pct(followers, prevFollowers) },
    shoutouts: { current: shoutouts },
    gigs: { current: gigCount, previous: prevGigCount, change: pct(gigCount, prevGigCount) },
    topCities,
  };

  // Detect locale: prefer artist's locale, fallback to Accept-Language
  const acceptLang = req.headers.get('accept-language') || '';
  const locale = artist.locale?.startsWith('ja') ? 'ja'
    : artist.locale?.startsWith('ko') ? 'ko'
    : artist.locale?.startsWith('en') ? 'en'
    : acceptLang.startsWith('ja') ? 'ja'
    : acceptLang.startsWith('ko') ? 'ko'
    : acceptLang.startsWith('en') ? 'en'
    : 'zh';
  const langInstruction = LANG_INSTRUCTIONS[locale] || LANG_INSTRUCTIONS.zh;

  const artistName = artist.display_name || artist.name_local || artist.name_en || artistId;

  const prompt = `你是 JazzNode 平台的 AI 分析師，負責為藝人撰寫月度報告。

藝人名稱：${artistName}
平台：JazzNode（亞洲爵士音樂平台）
報告期間：過去 30 天

【數據】
- 頁面瀏覽：${views} 次（vs 前月 ${prevViews} 次，${kpis.views.change >= 0 ? '+' : ''}${kpis.views.change}%）
- 新增追蹤者：${followers} 人（vs 前月 ${prevFollowers} 人，${kpis.followers.change >= 0 ? '+' : ''}${kpis.followers.change}%）
- 新增推薦：${shoutouts} 則
- 演出場次：${gigCount} 場（vs 前月 ${prevGigCount} 場，${kpis.gigs.change >= 0 ? '+' : ''}${kpis.gigs.change}%）
- 主要城市：${topCities.map((c) => `${c.city}(${c.count})`).join('、') || '無數據'}

${langInstruction}

格式：
**整體表現**（1-2句）
**亮點**（2-3個）
**建議行動**（2-3個具體建議，如安排演出、更新 EPK、分享內容等）

語氣：直接、專業、鼓勵，像顧問報告。`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500 },
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 500);
      return NextResponse.json({ error: `Gemini API error ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const report = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    await supabase.from('ai_reports').insert({
      entity_type: 'artist',
      entity_id: artistId,
      user_id: userId,
      kpis,
      report,
      locale,
    });

    return NextResponse.json({ kpis, report, generatedAt: now.toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Report generation failed' }, { status: 502 });
  }
}
