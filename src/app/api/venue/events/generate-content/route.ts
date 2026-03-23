import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash-preview-05-20';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<Record<string, string>> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192, responseMimeType: 'application/json' },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    // Extract first complete JSON object via balanced-brace parsing
    const start = text.indexOf('{');
    if (start === -1) throw new Error(`No JSON object found: ${text.slice(0, 150)}`);
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
    }
    throw new Error(`Unbalanced JSON: ${text.slice(0, 150)}`);
  }
}

/**
 * POST /api/venue/events/generate-content
 * Generates 6-language descriptions and title_en translation via Gemini.
 * Called fire-and-forget after event creation/update.
 */
export async function POST(req: NextRequest) {
  try {
    const { eventId, venueId } = await req.json();
    if (!eventId || !venueId) {
      return NextResponse.json({ error: 'Missing eventId or venueId' }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set, skipping content generation');
      return NextResponse.json({ error: 'Content generation not configured' }, { status: 503 });
    }

    const { isAuthorized } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      venueId,
    );
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Fetch event data
    const { data: event } = await supabase
      .from('events')
      .select('event_id, title_local, title_en, description_raw, start_at, subtype, venue_id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch venue info for context
    const { data: venue } = await supabase
      .from('venues')
      .select('display_name, name_local, name_en, city_id')
      .eq('venue_id', venueId)
      .maybeSingle();

    const venueName = venue?.display_name || venue?.name_local || venue?.name_en || venueId;

    // Fetch city name
    let cityName = '';
    if (venue?.city_id) {
      const { data: city } = await supabase
        .from('cities')
        .select('name_en')
        .eq('city_id', venue.city_id)
        .maybeSingle();
      cityName = city?.name_en || '';
    }

    // Fetch lineup
    const { data: lineups } = await supabase
      .from('lineups')
      .select('artist_id, instrument_list, role, sort_order')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: true });

    let lineupText = '';
    if (lineups && lineups.length > 0) {
      const artistIds = lineups.map((l) => l.artist_id).filter(Boolean);
      const { data: artists } = await supabase
        .from('artists')
        .select('artist_id, display_name, name_local, name_en, primary_instrument')
        .in('artist_id', artistIds);

      const artistMap = Object.fromEntries((artists || []).map((a) => [a.artist_id, a]));
      lineupText = lineups
        .map((l) => {
          const artist = artistMap[l.artist_id];
          const name = artist?.display_name || artist?.name_local || artist?.name_en || '';
          const inst = (l.instrument_list || []).join(', ') || artist?.primary_instrument || '';
          return inst ? `${name} (${inst})` : name;
        })
        .filter(Boolean)
        .join(', ');
    }

    const title = event.title_local || event.title_en || '';
    const descRaw = event.description_raw || '';
    const subtypeLabel = event.subtype === 'jam_session' ? 'Jam Session'
      : event.subtype === 'showcase' ? 'Showcase'
      : 'Live Performance';

    // Build the Gemini prompt (adapted from content_generator.js)
    const prompt = `You are a content editor and translator for JazzNode, a jazz event discovery platform.

Event: ${title}
Venue: ${venueName}${cityName ? `, ${cityName}` : ''}
Date: ${event.start_at || 'TBD'}
Type: ${subtypeLabel}
Lineup: ${lineupText || 'Not specified'}
Description provided by venue: ${descRaw || 'No description provided'}

Your tasks — for ALL fields, ORGANIZE and FORMAT the content. This is NOT a raw dump:

1. **title_en**: English translation of the event title. If already in English, clean it up. Keep artist/venue names in their original form.
2. **description_zh**: 繁體中文。根據活動資訊撰寫活動描述。使用專業但溫暖的爵士樂評風格。包含演出陣容資訊。
3. **description_en**: English. Write a clean, professional event description. Include lineup information.
4. **description_ja**: 日本語。同上ルール。敬意を込めた職人的な文体。
5. **description_ko**: 한국어. 위와 동일한 규칙. 정중하고 전문적인 재즈 문체.
6. **description_th**: ภาษาไทย กฎเดียวกัน สไตล์นักวิจารณ์แจ๊สมืออาชีพ
7. **description_id**: Bahasa Indonesia. Aturan yang sama. Gaya editor jazz profesional.
8. **description_short_zh**: 繁體中文摘要，150-200 字元。
9. **description_short_en**: English summary, ~60-80 words.
10. **description_short_ja**: 日本語の要約。
11. **description_short_ko**: 한국어 요약, ~80-120자.
12. **description_short_th**: สรุปภาษาไทย ~100-150 ตัวอักษร
13. **description_short_id**: Ringkasan Bahasa Indonesia, ~60-80 kata.

Rules:
- Do NOT fabricate facts (album names, awards, collaborations must come from the source)
- Preserve artist names in original form (English names stay English, Chinese names stay Chinese)
- Music terminology: use the natural expression in each language
- If the venue only provided a title and lineup (no description), write descriptions based on the lineup, venue, and event type
- Focus on the musical experience and what the audience can expect

Generate exactly this JSON (no extra text):
{"title_en":"...","description_zh":"...","description_en":"...","description_ja":"...","description_ko":"...","description_th":"...","description_id":"...","description_short_zh":"...","description_short_en":"...","description_short_ja":"...","description_short_ko":"...","description_short_th":"...","description_short_id":"..."}`;

    const generated = await callGemini(prompt);

    // Build update patch from generated content
    const validFields = [
      'title_en',
      'description_zh', 'description_en', 'description_ja', 'description_ko', 'description_th', 'description_id',
      'description_short_zh', 'description_short_en', 'description_short_ja', 'description_short_ko', 'description_short_th', 'description_short_id',
    ];

    const patch: Record<string, string> = {};
    for (const field of validFields) {
      if (generated[field] && typeof generated[field] === 'string') {
        patch[field] = generated[field].trim();
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await supabase
        .from('events')
        .update(patch)
        .eq('event_id', eventId);

      if (updateError) {
        console.error('Content update failed:', updateError);
        return NextResponse.json({ error: 'Failed to save generated content' }, { status: 500 });
      }

      revalidateTag('events', { expire: 0 });
    }

    console.log(JSON.stringify({
      action: 'venue_generate_content',
      eventId,
      fieldsGenerated: Object.keys(patch).length,
    }));

    return NextResponse.json({ success: true, fieldsGenerated: Object.keys(patch) });
  } catch (err) {
    console.error('Content generation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
