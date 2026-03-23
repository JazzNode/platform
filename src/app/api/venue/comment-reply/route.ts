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
