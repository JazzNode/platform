import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyArtistClaimToken } from '@/lib/artist-auth';

/** PUT: Update booking inquiry status */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { artistId, status } = await req.json();

    if (!artistId || !status) {
      return NextResponse.json({ error: 'Missing artistId or status' }, { status: 400 });
    }

    const validStatuses = ['pending', 'accepted', 'declined', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { isAuthorized } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      artistId,
    );
    if (!isAuthorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('booking_inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('artist_id', artistId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Booking status update error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
