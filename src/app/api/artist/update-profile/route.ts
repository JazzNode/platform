import { NextRequest, NextResponse } from 'next/server';
import { updateTag } from 'next/cache';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/** Whitelist of fields a claimed artist can directly update */
const ALLOWED_FIELDS = new Set([
  'website_url',
  'spotify_url',
  'youtube_url',
  'instagram',
  'facebook_url',
  'aka',
]);

export async function POST(req: NextRequest) {
  try {
    const { artistId, fields } = await req.json();

    if (!artistId || !fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'Missing artistId or fields' }, { status: 400 });
    }

    // Verify the user has claimed this artist
    const { isAuthorized, userId } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      artistId,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Filter to only allowed fields
    const sanitized: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_FIELDS.has(key)) {
        sanitized[key] = typeof value === 'string' && value.trim() ? value.trim() : null;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from('artists')
      .update({ ...sanitized, updated_at: new Date().toISOString(), data_source: 'user', updated_by: userId })
      .eq('artist_id', artistId);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    updateTag('artists');

    writeAuditLog({
      adminUserId: userId,
      action: 'artist_update_profile',
      entityType: 'artist',
      entityId: artistId,
      details: { fieldsUpdated: Object.keys(sanitized), claimedUser: true },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, fieldsUpdated: Object.keys(sanitized) });
  } catch (err) {
    console.error('Artist profile update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
