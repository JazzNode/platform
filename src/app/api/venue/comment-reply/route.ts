import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Determine sender_role based on user profile and target venue.
 */
function determineSenderRole(
  profile: { role: string | null; claimed_venue_ids: string[] | null; claimed_artist_ids: string[] | null },
  venueId: string,
): string | null {
  // Admin / HQ takes priority
  if (profile.role === 'admin' || profile.role === 'owner') return 'admin';
  // Venue manager for this specific venue
  if (profile.claimed_venue_ids?.includes(venueId)) return 'venue_manager';
  // Artist
  if (profile.claimed_artist_ids && profile.claimed_artist_ids.length > 0) return 'artist';
  // Regular member
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commentId, venueId, body } = await req.json();
    if (!commentId || !venueId || !body?.trim()) {
      return NextResponse.json({ error: 'Missing commentId, venueId, or body' }, { status: 400 });
    }

    if (body.trim().length > 500) {
      return NextResponse.json({ error: 'Body too long (max 500)' }, { status: 400 });
    }

    // Fetch user profile to determine role
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role, claimed_venue_ids, claimed_artist_ids')
      .eq('id', user.id)
      .single();

    const senderRole = profile
      ? determineSenderRole(profile, venueId)
      : null;

    const { data: reply, error } = await admin
      .from('venue_comment_replies')
      .insert({
        comment_id: commentId,
        user_id: user.id,
        sender_role: senderRole,
        body: body.trim(),
      })
      .select('id, comment_id, user_id, sender_role, body, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Notify original comment author (if not replying to self) ──
    try {
      const { data: comment } = await admin
        .from('venue_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

      if (comment && comment.user_id && comment.user_id !== user.id) {
        // Look up replier display name & venue name for notification text
        const [{ data: replierProfile }, { data: venue }] = await Promise.all([
          admin.from('profiles').select('display_name').eq('id', user.id).single(),
          admin.from('venues').select('display_name, name_local, name_en').eq('venue_id', venueId).single(),
        ]);

        const replierName = replierProfile?.display_name || 'Someone';
        const venueName = venue?.display_name || venue?.name_local || venue?.name_en || '';

        const roleLabel = senderRole === 'venue_manager' ? '🏠'
          : senderRole === 'artist' ? '🎵'
          : senderRole === 'admin' ? '⭐'
          : '';

        await admin.from('notifications').insert({
          user_id: comment.user_id,
          title: `${roleLabel} ${replierName} replied to your comment`,
          body: venueName ? `On ${venueName}: "${body.trim().slice(0, 80)}"` : body.trim().slice(0, 100),
          type: 'comment_reply',
          reference_type: 'venue',
          reference_id: venueId,
        });
      }
    } catch (notifErr) {
      // Non-blocking — reply was already saved, don't fail the request
      console.error('Comment reply notification error:', notifErr);
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Comment reply error:', err);
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
      .from('venue_comment_replies')
      .delete()
      .eq('id', replyId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete reply error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete' },
      { status: 500 },
    );
  }
}
