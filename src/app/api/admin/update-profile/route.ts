import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/** Fields an admin can update via this endpoint */
const ALLOWED_FIELDS = new Set([
  // Social
  'website_url',
  'spotify_url',
  'youtube_url',
  'instagram',
  'facebook_url',
  // Instruments
  'primary_instrument',
  'instrument_list',
]);

const ENTITY_TABLE: Record<string, string> = {
  artist: 'artists',
  venue: 'venues',
};

const ENTITY_PK: Record<string, string> = {
  artist: 'artist_id',
  venue: 'venue_id',
};

export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entityType, entityId, fields } = await req.json();

    if (!entityType || !entityId || !fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!ENTITY_TABLE[entityType]) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    // Filter to only allowed fields
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_FIELDS.has(key)) {
        if (Array.isArray(value)) {
          sanitized[key] = value.filter((v: unknown) => typeof v === 'string');
        } else {
          sanitized[key] = typeof value === 'string' && value.trim() ? value.trim() : null;
        }
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const table = ENTITY_TABLE[entityType];
    const pk = ENTITY_PK[entityType];

    const { error: updateError } = await supabase
      .from(table)
      .update({
        ...sanitized,
        updated_at: new Date().toISOString(),
        data_source: 'admin',
        updated_by: userId,
      })
      .eq(pk, entityId);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    revalidateTag('artists', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'admin_update_profile',
      entityType,
      entityId,
      details: { fieldsUpdated: Object.keys(sanitized) },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, fieldsUpdated: Object.keys(sanitized) });
  } catch (err) {
    console.error('Admin profile update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
