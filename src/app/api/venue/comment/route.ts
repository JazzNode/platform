import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

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

    const { venueId, text, tags, imageUrl, isAnonymous } = await req.json();
    if (!venueId) {
      return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
    }
    if (!text?.trim() && (!tags || tags.length === 0) && !imageUrl) {
      return NextResponse.json({ error: 'Comment must have text, tags, or image' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: comment, error } = await admin
      .from('venue_comments')
      .insert({
        user_id: user.id,
        venue_id: venueId,
        text: text?.trim() || null,
        tags: tags || [],
        image_url: imageUrl || null,
        is_anonymous: isAnonymous || false,
      })
      .select('id, user_id, venue_id, text, tags, image_url, is_anonymous, created_at')
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
