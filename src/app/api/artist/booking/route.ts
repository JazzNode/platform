/** @deprecated Use messaging with intent_type instead. Kept for historical data access only. */
import { NextRequest, NextResponse } from 'next/server';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/** GET: List booking inquiries for an artist (requires claim token) */
export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const { isAuthorized } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('booking_inquiries')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: data || [] });
}

/** POST: Submit a booking inquiry (requires auth) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { artistId, name, email, phone, event_type, event_date, venue, budget_range, message } = body;

    if (!artistId || !name || !email) {
      return NextResponse.json({ error: 'Missing required fields (artistId, name, email)' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify requester is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('booking_inquiries')
      .insert({
        artist_id: artistId,
        name,
        email,
        phone: phone || null,
        event_type: event_type || null,
        event_date: event_date || null,
        venue: venue || null,
        budget_range: budget_range || null,
        message: message || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, inquiry: data });
  } catch (err) {
    console.error('Booking inquiry error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
