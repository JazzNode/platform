import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { artistId } = await req.json();
    if (!artistId) {
      return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;

    // Client-side (PageViewTracker) already deduplicates with a 60s localStorage window.
    // Server-side ILIKE dedup on user_agent caused full table scans → removed.
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
