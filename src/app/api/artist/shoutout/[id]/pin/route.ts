import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * PUT /api/artist/shoutout/[id]/pin — Toggle pin on a shoutout.
 * Only the artist owner can pin/unpin.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: shoutoutId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { artistId } = await req.json();
    if (!artistId) {
      return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify caller is artist owner
    const { data: profile } = await admin
      .from('profiles')
      .select('claimed_artist_ids')
      .eq('id', user.id)
      .single();

    if (!profile?.claimed_artist_ids?.includes(artistId)) {
      return NextResponse.json({ error: 'Not authorized to pin for this artist' }, { status: 403 });
    }

    // Get current shoutout state
    const { data: shoutout } = await admin
      .from('artist_shoutouts')
      .select('id, artist_id, is_pinned, pin_order, user_id')
      .eq('id', shoutoutId)
      .single();

    if (!shoutout || shoutout.artist_id !== artistId) {
      return NextResponse.json({ error: 'Shoutout not found' }, { status: 404 });
    }

    const newPinned = !shoutout.is_pinned;

    if (newPinned) {
      // Check max 3 pinned per artist
      const { count } = await admin
        .from('artist_shoutouts')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistId)
        .eq('is_pinned', true);

      if ((count || 0) >= 3) {
        return NextResponse.json({ error: 'Maximum 3 pins reached' }, { status: 400 });
      }

      // Assign next pin_order
      const { data: maxPin } = await admin
        .from('artist_shoutouts')
        .select('pin_order')
        .eq('artist_id', artistId)
        .eq('is_pinned', true)
        .order('pin_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = ((maxPin?.pin_order as number | null) || 0) + 1;

      const { data: updated, error } = await admin
        .from('artist_shoutouts')
        .update({ is_pinned: true, pin_order: nextOrder })
        .eq('id', shoutoutId)
        .select('id, is_pinned, pin_order')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Notify the shoutout author that their shoutout was pinned
      if (shoutout.user_id !== user.id) {
        try {
          const { data: artist } = await admin
            .from('artists')
            .select('display_name, name_local, name_en')
            .eq('artist_id', artistId)
            .single();

          const artistName = artist?.display_name || artist?.name_local || artist?.name_en || '';

          await admin.from('notifications').insert({
            user_id: shoutout.user_id,
            title: `\uD83D\uDCCC ${artistName} pinned your shoutout!`,
            body: 'Your shoutout has been featured on their profile',
            type: 'shoutout_pinned',
            reference_type: 'artist',
            reference_id: artistId,
          });
        } catch {
          // Non-blocking
        }
      }

      return NextResponse.json({ shoutout: updated });
    } else {
      // Unpin
      const { data: updated, error } = await admin
        .from('artist_shoutouts')
        .update({ is_pinned: false, pin_order: null })
        .eq('id', shoutoutId)
        .select('id, is_pinned, pin_order')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ shoutout: updated });
    }
  } catch (err) {
    console.error('Pin shoutout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to toggle pin' },
      { status: 500 },
    );
  }
}
