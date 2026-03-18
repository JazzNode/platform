import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/members — List all members with search/filter/pagination
 */
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  const supabase = createAdminClient();

  // Build query
  let query = supabase
    .from('profiles')
    .select('id, display_name, username, handle, avatar_url, role, bio, website, social_links, claimed_artist_ids, claimed_venue_ids, created_at', { count: 'exact' });

  if (role && role !== 'all') {
    query = query.eq('role', role);
  }

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,username.ilike.%${search}%,handle.ilike.%${search}%`);
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data: profiles, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch emails for only the current page's users in parallel.
  // Previously used listUsers({ perPage: 1000 }) which fetched ALL users
  // and filtered client-side — O(n) and slow as user count grows.
  const userIds = (profiles || []).map((p) => p.id);
  const emailMap = new Map<string, string>();

  if (userIds.length > 0) {
    const results = await Promise.all(
      userIds.map((id) => supabase.auth.admin.getUserById(id)),
    );
    for (const { data: { user } } of results) {
      if (user?.email) emailMap.set(user.id, user.email);
    }
  }

  const members = (profiles || []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) || null,
  }));

  return NextResponse.json({
    members,
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}
