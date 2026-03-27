import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/badges — Fetch all badges
 */
export async function GET(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('target_type', { ascending: true, nullsFirst: false })
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ badges: data });
}

/**
 * PUT /api/admin/badges — Update a single badge
 * Body: { badge_id, is_active?, name_en?, name_zh?, ..., description_en?, ..., criteria_target? }
 */
export async function PUT(request: NextRequest) {
  const { isHQ, role, userId } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { badge_id, ...updates } = body;

  if (!badge_id || typeof badge_id !== 'string') {
    return NextResponse.json({ error: 'badge_id is required' }, { status: 400 });
  }

  // Only allow known fields
  const ALLOWED_FIELDS = new Set([
    'is_active', 'criteria_target',
    'name_en', 'name_zh', 'name_ja', 'name_ko', 'name_th', 'name_id',
    'description_en', 'description_zh', 'description_ja', 'description_ko', 'description_th', 'description_id',
  ]);

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(key)) payload[key] = value;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('badges')
    .update(payload)
    .eq('badge_id', badge_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (userId) {
    await writeAuditLog({
      adminUserId: userId,
      action: 'update_badge',
      entityType: 'badge',
      entityId: badge_id,
      details: payload,
    });
  }

  return NextResponse.json({ success: true });
}
