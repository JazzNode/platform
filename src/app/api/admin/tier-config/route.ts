import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/tier-config — Read tier config (public, no auth needed)
 */
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tier_config')
    .select('entity_type, features, visible_tiers, updated_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return as a map: { artist: {...}, venue: {...} }
  const config: Record<string, unknown> = {};
  for (const row of data || []) {
    config[row.entity_type] = {
      features: row.features,
      visible_tiers: row.visible_tiers ?? [0, 1, 2, 3],
      updated_at: row.updated_at,
    };
  }

  return NextResponse.json(config);
}

/**
 * PUT /api/admin/tier-config — Update tier config (admin only)
 * Body: { entityType: 'artist' | 'venue', features: Record<string, number> }
 */
export async function PUT(request: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { entityType, features, visibleTiers } = body;

  if (!entityType || !['artist', 'venue'].includes(entityType)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Build update payload — only include fields that were sent
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
  if (features) updatePayload.features = features;
  if (visibleTiers !== undefined) updatePayload.visible_tiers = visibleTiers;

  const { error } = await supabase
    .from('tier_config')
    .update(updatePayload)
    .eq('entity_type', entityType);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  if (userId) {
    await writeAuditLog({
      adminUserId: userId,
      action: 'update_tier_config',
      entityType,
      entityId: entityType,
      details: { features, visibleTiers },
    });
  }

  return NextResponse.json({ success: true });
}
