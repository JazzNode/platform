import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { artistId } = await req.json();
    if (!artistId) {
      return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;

    // Simple dedup: skip if same IP viewed same artist in last hour
    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('artist_page_views')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .gte('viewed_at', oneHourAgo)
        .ilike('user_agent', `%${userAgent?.slice(0, 50)}%`);

      if ((count || 0) > 0) {
        return NextResponse.json({ tracked: false, reason: 'duplicate' });
      }
    }

    await supabase.from('artist_page_views').insert({
      artist_id: artistId,
      referrer,
      user_agent: userAgent?.slice(0, 500),
    });

    return NextResponse.json({ tracked: true });
  } catch (err) {
    console.error('Track view error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
