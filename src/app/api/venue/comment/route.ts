import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Validate sender role against user profile.
 * Returns sanitised { role, artistId } — falls back to member (null) on mismatch.
 */
function validateSenderRole(
  profile: { role: string | null; claimed_venue_ids: string[] | null; claimed_artist_ids: string[] | null },
  venueId: string,
  senderRole: string | null | undefined,
  senderArtistId: string | null | undefined,
): { role: string | null; artistId: string | null } {
  if (!senderRole) return { role: null, artistId: null };

  if (senderRole === 'admin') {
    if (profile.role !== 'admin' && profile.role !== 'owner') return { role: null, artistId: null };
    return { role: 'admin', artistId: null };
  }

  if (senderRole === 'venue_manager') {
    if (!profile.claimed_venue_ids?.includes(venueId)) return { role: null, artistId: null };
    return { role: 'venue_manager', artistId: null };
  }

  if (senderRole === 'artist') {
    if (!senderArtistId || !profile.claimed_artist_ids?.includes(senderArtistId)) return { role: null, artistId: null };
    return { role: 'artist', artistId: senderArtistId };
  }

  return { role: null, artistId: null };
}

/**
 * POST /api/venue/comment — Create a new venue comment.
 * After inserting, notifies all venue managers (claimed_venue_ids owners).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { venueId, text, tags, imageUrl, isAnonymous, senderRole, senderArtistId } = await req.json();
    if (!venueId) {
      return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
    }
    if (!text?.trim() && (!tags || tags.length === 0) && !imageUrl) {
      return NextResponse.json({ error: 'Comment must have text, tags, or image' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Validate sender identity (anonymous comments always use member identity)
    let validatedRole: string | null = null;
    let validatedArtistId: string | null = null;

    if (!isAnonymous && senderRole) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role, claimed_venue_ids, claimed_artist_ids')
        .eq('id', user.id)
        .single();

      if (profile) {
        const validated = validateSenderRole(profile, venueId, senderRole, senderArtistId);
        validatedRole = validated.role;
        validatedArtistId = validated.artistId;
      }
    }

    const { data: comment, error } = await admin
      .from('venue_comments')
      .insert({
        user_id: user.id,
        venue_id: venueId,
        text: text?.trim() || null,
        tags: tags || [],
        image_url: imageUrl || null,
        is_anonymous: isAnonymous || false,
        sender_role: validatedRole,
        sender_artist_id: validatedArtistId,
      })
      .select('id, user_id, venue_id, text, tags, image_url, is_anonymous, sender_role, sender_artist_id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Notify venue managers ──
    try {
      // Find all users who have claimed this venue
      const { data: managers } = await admin
        .from('profiles')
        .select('id')
        .contains('claimed_venue_ids', [venueId]);

      if (managers && managers.length > 0) {
        // Look up commenter name & venue name
        const [{ data: commenterProfile }, { data: venue }] = await Promise.all([
          admin.from('profiles').select('display_name').eq('id', user.id).single(),
          admin.from('venues').select('display_name, name_local, name_en').eq('venue_id', venueId).single(),
        ]);

        const commenterName = isAnonymous ? 'Anonymous' : (commenterProfile?.display_name || 'Someone');
        const venueName = venue?.display_name || venue?.name_local || venue?.name_en || '';

        // Insert a notification for each manager (skip if manager is the commenter)
        const notifications = managers
          .filter((m: { id: string }) => m.id !== user.id)
          .map((m: { id: string }) => ({
            user_id: m.id,
            title: `💬 New comment on ${venueName}`,
            body: text?.trim()
              ? `${commenterName}: "${text.trim().slice(0, 80)}"`
              : `${commenterName} left a review`,
            type: 'comment_reply' as const,
            reference_type: 'venue',
            reference_id: venueId,
          }));

        if (notifications.length > 0) {
          await admin.from('notifications').insert(notifications);
        }
      }
    } catch (notifErr) {
      console.error('New comment notification error:', notifErr);
    }

    return NextResponse.json({ comment });
  } catch (err) {
    console.error('Create comment error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create comment' },
      { status: 500 },
    );
  }
}
