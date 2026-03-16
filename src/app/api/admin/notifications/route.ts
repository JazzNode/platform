import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/notifications — Fetch admin notifications
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

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count unread
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

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
  const { ids, markAllRead } = body as { ids?: string[]; markAllRead?: boolean };

  const supabase = createAdminClient();

  if (markAllRead) {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
  } else if (ids && ids.length > 0) {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId);
  }

  return NextResponse.json({ ok: true });
}
