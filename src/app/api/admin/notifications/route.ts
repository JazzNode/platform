import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

// Notification types that belong to HQ admin (not personal user notifications)
const HQ_NOTIFICATION_TYPES = ['new_member', 'system', 'claim_review'];

/**
 * GET /api/admin/notifications — Fetch HQ admin notifications only
 */
export async function GET(request: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  const archived = searchParams.get('archived') === 'true';

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .in('type', HQ_NOTIFICATION_TYPES);

  // Filter by archived status
  if (archived) {
    query = query.not('archived_at', 'is', null);
  } else {
    query = query.is('archived_at', null);
  }

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count unread (HQ types only, excluding archived)
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', HQ_NOTIFICATION_TYPES)
    .is('read_at', null)
    .is('archived_at', null);

  return NextResponse.json({
    notifications: data || [],
    total: count ?? 0,
    unread: unreadCount ?? 0,
    page,
    limit,
  });
}

/**
 * PATCH /api/admin/notifications — Mark notifications as read
 */
export async function PATCH(request: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { ids, markAllRead, archive, archiveAll } = body as {
    ids?: string[];
    markAllRead?: boolean;
    archive?: boolean;
    archiveAll?: boolean;
  };

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Archive operations (soft-delete)
  if (archiveAll) {
    await supabase
      .from('notifications')
      .update({ archived_at: now })
      .eq('user_id', userId)
      .in('type', HQ_NOTIFICATION_TYPES)
      .is('archived_at', null);
    return NextResponse.json({ ok: true });
  }

  if (archive && ids && ids.length > 0) {
    await supabase
      .from('notifications')
      .update({ archived_at: now })
      .in('id', ids)
      .eq('user_id', userId);
    return NextResponse.json({ ok: true });
  }

  // Mark read operations
  if (markAllRead) {
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
  } else if (ids && ids.length > 0) {
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .in('id', ids)
      .eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}
