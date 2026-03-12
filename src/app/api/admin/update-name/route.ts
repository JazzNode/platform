import { NextRequest, NextResponse } from 'next/server';
import { updateTag } from 'next/cache';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

const ALLOWED_FIELDS = ['name_local', 'name_en', 'display_name', 'title_local', 'title_en'] as const;

const ENTITY_TABLE: Record<string, string> = {
  artist: 'artists',
  event: 'events',
  venue: 'venues',
};

const ENTITY_PK: Record<string, string> = {
  artist: 'artist_id',
  event: 'event_id',
  venue: 'venue_id',
};

const ENTITY_TAG: Record<string, string> = {
  artist: 'artists',
  event: 'events',
  venue: 'venues',
};

export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entityType, entityId, field, value } = await req.json();

    if (!entityType || !entityId || !field || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!ENTITY_TABLE[entityType]) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const table = ENTITY_TABLE[entityType];
    const pk = ENTITY_PK[entityType];

    const { error: updateError } = await supabase
      .from(table)
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq(pk, entityId);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    updateTag(ENTITY_TAG[entityType]);

    writeAuditLog({
      adminUserId: userId,
      action: 'update_name',
      entityType,
      entityId,
      details: { field, new_value: value },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Name update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
