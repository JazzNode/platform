import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Unified dashboard comments API.
 * Query params:
 *   mode=member  → comments by current user across all venues
 *   mode=venue&venueId=xxx → comments on a specific venue
 *   mode=artist&artistId=xxx → comments where artist replied or could reply (on venues the artist performed at)
 *   mode=admin → all comments across all venues (latest first)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'member';
    const venueId = searchParams.get('venueId');
    const admin = createAdminClient();

    // Verify permissions
    const { data: profile } = await admin
      .from('profiles')
      .select('role, claimed_venue_ids, claimed_artist_ids')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let query = admin
      .from('venue_comments')
      .select('id, user_id, venue_id, text, tags, image_url, is_anonymous, created_at, profiles(display_name, avatar_url), venue_comment_replies(id, comment_id, user_id, sender_role, body, created_at, profiles(display_name, avatar_url))')
      .order('created_at', { ascending: false })
      .limit(100);

    switch (mode) {
      case 'member':
        query = query.eq('user_id', user.id);
        break;

      case 'venue':
        if (!venueId) {
          return NextResponse.json({ error: 'venueId required' }, { status: 400 });
        }
        if (!profile.claimed_venue_ids?.includes(venueId) && profile.role !== 'admin' && profile.role !== 'owner') {
          return NextResponse.json({ error: 'Not authorized for this venue' }, { status: 403 });
        }
        query = query.eq('venue_id', venueId);
        break;

      case 'artist': {
        // Artists see all comments on venues they have performed at
        // For now, show comments on all venues (artists can reply anywhere)
        if (!profile.claimed_artist_ids?.length && profile.role !== 'admin' && profile.role !== 'owner') {
          return NextResponse.json({ error: 'Not an artist' }, { status: 403 });
        }
        // Show comments the artist has replied to + recent comments across venues
        break;
      }

      case 'admin':
        if (profile.role !== 'admin' && profile.role !== 'owner') {
          return NextResponse.json({ error: 'Admin only' }, { status: 403 });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For member/artist/admin mode, fetch venue names for display
    const comments = (data || []).map((r: Record<string, unknown>) => ({
      id: r.id as string,
      user_id: r.user_id as string,
      venue_id: r.venue_id as string,
      text: r.text as string | null,
      tags: (r.tags as string[]) || [],
      image_url: r.image_url as string | null,
      is_anonymous: r.is_anonymous as boolean,
      created_at: r.created_at as string,
      profile: r.profiles as { display_name: string | null; avatar_url: string | null } | null,
      replies: ((r.venue_comment_replies as Record<string, unknown>[]) || []).map((rp) => ({
        id: rp.id as string,
        comment_id: rp.comment_id as string,
        user_id: rp.user_id as string,
        sender_role: rp.sender_role as string | null,
        body: rp.body as string,
        created_at: rp.created_at as string,
        profile: rp.profiles as { display_name: string | null; avatar_url: string | null } | null,
      })),
    }));

    // If not in venue mode, look up venue names
    if (mode !== 'venue' && comments.length > 0) {
      const venueIds = [...new Set(comments.map((c) => c.venue_id))];
      const { data: venues } = await admin
        .from('venues')
        .select('venue_id, display_name, name_local, name_en')
        .in('venue_id', venueIds);

      const venueMap = new Map(
        (venues || []).map((v: { venue_id: string; display_name: string | null; name_local: string | null; name_en: string | null }) => [
          v.venue_id,
          v.display_name || v.name_local || v.name_en || v.venue_id,
        ]),
      );

      comments.forEach((c) => {
        (c as Record<string, unknown>).venue_name = venueMap.get(c.venue_id) || c.venue_id;
      });
    }

    return NextResponse.json({ comments, mode });
  } catch (err) {
    console.error('Dashboard comments error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load comments' },
      { status: 500 },
    );
  }
}
