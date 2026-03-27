import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildEPKDocument } from '@/lib/epk-template';

/**
 * Public EPK download — no auth required.
 * Anyone can download an artist's EPK (it's a press kit, meant to be shared).
 */
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  const locale = req.nextUrl.searchParams.get('locale') || 'en';
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  try {
    const supabase = createAdminClient();

    const { data: artist } = await supabase
      .from('artists')
      .select('*')
      .eq('artist_id', artistId)
      .single();

    if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 });

    const { data: gear } = await supabase
      .from('artist_gear')
      .select('*')
      .eq('artist_id', artistId)
      .order('display_order');

    const { data: lineups } = await supabase
      .from('lineups')
      .select('event_id')
      .eq('artist_id', artistId);

    const eventIds = lineups?.map((l) => l.event_id).filter(Boolean) || [];
    let events: { title_en: string; title_local?: string; start_at: string; venue_id: string }[] = [];
    if (eventIds.length > 0) {
      const { data: eventData } = await supabase
        .from('events')
        .select('title_en, title_local, start_at, venue_id')
        .in('event_id', eventIds)
        .gte('start_at', new Date().toISOString())
        .order('start_at')
        .limit(10);
      events = eventData || [];
    }

    const tier = artist.tier ?? 0;

    const doc = buildEPKDocument({ artist, gear: gear || [], events, tier, locale });
    const buffer = await renderToBuffer(doc);

    const filename = `${artist.name_en || artist.artist_id}-EPK.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('EPK generation error:', err);
    return NextResponse.json({ error: 'EPK generation failed' }, { status: 500 });
  }
}
