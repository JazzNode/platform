import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/editor-profile?userId=xxx
 * Returns the profile info (role, display name, email) for a given user.
 * Used to display "edited by" attribution in admin mode.
 */
export async function GET(req: NextRequest) {
  const { isHQ, role } = await verifyHQToken(req.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'editor', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const supabase = createAdminClient();

  const [{ data: profile }, { data: { user: authUser } }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, username, role').eq('id', userId).single(),
    supabase.auth.admin.getUserById(userId),
  ]);

  return NextResponse.json({
    id: userId,
    display_name: profile?.display_name ?? null,
    username: profile?.username ?? null,
    role: profile?.role ?? null,
    email: authUser?.email ?? null,
  });
}
