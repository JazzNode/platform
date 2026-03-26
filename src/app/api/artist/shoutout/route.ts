import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Validate sender role against user profile.
 * Returns sanitised { role, artistId, venueId } — falls back to member (null) on mismatch.
 */
function validateSenderRole(
  profile: { role: string | null; claimed_venue_ids: string[] | null; claimed_artist_ids: string[] | null },
  senderRole: string | null | undefined,
  senderArtistId: string | null | undefined,
  senderVenueId: string | null | undefined,
): { role: string | null; artistId: string | null; venueId: string | null } {
  if (!senderRole) return { role: null, artistId: null, venueId: null };

  if (senderRole === 'admin') {
    if (profile.role !== 'admin' && profile.role !== 'owner') return { role: null, artistId: null, venueId: null };
    return { role: 'admin', artistId: null, venueId: null };
  }

  if (senderRole === 'venue_manager') {
    if (!senderVenueId || !profile.claimed_venue_ids?.includes(senderVenueId)) return { role: null, artistId: null, venueId: null };
    return { role: 'venue_manager', artistId: null, venueId: senderVenueId };
  }

  if (senderRole === 'artist') {
    if (!senderArtistId || !profile.claimed_artist_ids?.includes(senderArtistId)) return { role: null, artistId: null, venueId: null };
    return { role: 'artist', artistId: senderArtistId, venueId: null };
  }

  return { role: null, artistId: null, venueId: null };
}

/**
 * POST /api/artist/shoutout — Create a new artist shoutout.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { artistId, text, tags, imageUrl, isAnonymous, senderRole, senderArtistId, senderVenueId } = await req.json();
    if (!artistId) {
      return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
    }
    if (!text?.trim() && (!tags || tags.length === 0) && !imageUrl) {
      return NextResponse.json({ error: 'Shoutout must have text, tags, or image' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Validate sender identity
    let validatedRole: string | null = null;
    let validatedArtistId: string | null = null;
    let validatedVenueId: string | null = null;

    if (!isAnonymous && senderRole) {
      const { data: profile } = await admin
        .from('profiles')
        .select('role, claimed_venue_ids, claimed_artist_ids')
        .eq('id', user.id)
        .single();

      if (profile) {
        const validated = validateSenderRole(profile, senderRole, senderArtistId, senderVenueId);
        validatedRole = validated.role;
        validatedArtistId = validated.artistId;
        validatedVenueId = validated.venueId;
      }
    }

    const { data: shoutout, error } = await admin
      .from('artist_shoutouts')
      .insert({
        user_id: user.id,
        artist_id: artistId,
        text: text?.trim() || null,
        tags: tags || [],
        image_url: imageUrl || null,
        is_anonymous: isAnonymous || false,
        sender_role: validatedRole,
        sender_artist_id: validatedArtistId,
        sender_venue_id: validatedVenueId,
      })
      .select('id, user_id, artist_id, text, tags, image_url, is_anonymous, sender_role, sender_artist_id, sender_venue_id, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ── Notify artist owners ──
    try {
      const { data: owners } = await admin
        .from('profiles')
        .select('id')
        .contains('claimed_artist_ids', [artistId]);

      if (owners && owners.length > 0) {
        const [{ data: commenterProfile }, { data: artist }] = await Promise.all([
          admin.from('profiles').select('display_name').eq('id', user.id).single(),
          admin.from('artists').select('display_name, name_local, name_en').eq('artist_id', artistId).single(),
        ]);

        const commenterName = isAnonymous ? 'Anonymous' : (commenterProfile?.display_name || 'Someone');
        const artistName = artist?.display_name || artist?.name_local || artist?.name_en || '';

        const notifications = owners
          .filter((o: { id: string }) => o.id !== user.id)
          .map((o: { id: string }) => ({
            user_id: o.id,
            title: `\uD83C\uDFA4 ${commenterName} left a shoutout on your profile`,
            body: text?.trim()
              ? `On ${artistName}: "${text.trim().slice(0, 80)}"`
              : `${commenterName} left a shoutout for ${artistName}`,
            type: 'shoutout' as const,
            reference_type: 'artist',
            reference_id: artistId,
          }));

        if (notifications.length > 0) {
          await admin.from('notifications').insert(notifications);
        }
      }
    } catch (notifErr) {
      console.error('Shoutout notification error:', notifErr);
    }

    return NextResponse.json({ shoutout });
  } catch (err) {
    console.error('Create shoutout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create shoutout' },
      { status: 500 },
    );
  }
}
