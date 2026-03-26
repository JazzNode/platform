import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Determine sender_role based on user profile and target artist.
 */
function determineSenderRole(
  profile: { role: string | null; claimed_venue_ids: string[] | null; claimed_artist_ids: string[] | null },
  artistId: string,
): string | null {
  if (profile.role === 'admin' || profile.role === 'owner') return 'admin';
  if (profile.claimed_artist_ids?.includes(artistId)) return 'artist';
  if (profile.claimed_venue_ids && profile.claimed_venue_ids.length > 0) return 'venue_manager';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shoutoutId, artistId, body } = await req.json();
    if (!shoutoutId || !artistId || !body?.trim()) {
      return NextResponse.json({ error: 'Missing shoutoutId, artistId, or body' }, { status: 400 });
    }

    if (body.trim().length > 500) {
      return NextResponse.json({ error: 'Body too long (max 500)' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role, claimed_venue_ids, claimed_artist_ids')
      .eq('id', user.id)
      .single();

    const senderRole = profile
      ? determineSenderRole(profile, artistId)
      : null;

    const { data: reply, error } = await admin
      .from('artist_shoutout_replies')
      .insert({
        shoutout_id: shoutoutId,
        user_id: user.id,
        sender_role: senderRole,
        body: body.trim(),
      })
      .select('id, shoutout_id, user_id, sender_role, body, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Notify original shoutout author ──
    try {
      const { data: shoutout } = await admin
        .from('artist_shoutouts')
        .select('user_id')
        .eq('id', shoutoutId)
        .single();

      if (shoutout && shoutout.user_id && shoutout.user_id !== user.id) {
        const [{ data: replierProfile }, { data: artist }] = await Promise.all([
          admin.from('profiles').select('display_name').eq('id', user.id).single(),
          admin.from('artists').select('display_name, name_local, name_en').eq('artist_id', artistId).single(),
        ]);

        const replierName = replierProfile?.display_name || 'Someone';
        const artistName = artist?.display_name || artist?.name_local || artist?.name_en || '';

        const roleLabel = senderRole === 'venue_manager' ? '\uD83C\uDFE0'
          : senderRole === 'artist' ? '\uD83C\uDFB5'
          : senderRole === 'admin' ? '\u2B50'
          : '';

        await admin.from('notifications').insert({
          user_id: shoutout.user_id,
          title: `${roleLabel} ${replierName} replied to your shoutout`,
          body: artistName ? `On ${artistName}: "${body.trim().slice(0, 80)}"` : body.trim().slice(0, 100),
          type: 'comment_reply',
          reference_type: 'artist',
          reference_id: artistId,
        });
      }
    } catch (notifErr) {
      console.error('Shoutout reply notification error:', notifErr);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Shoutout reply error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to reply' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { replyId } = await req.json();
    if (!replyId) {
      return NextResponse.json({ error: 'Missing replyId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('artist_shoutout_replies')
      .delete()
      .eq('id', replyId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete shoutout reply error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete' },
      { status: 500 },
    );
  }
}
