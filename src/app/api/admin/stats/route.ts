import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/stats — Platform overview stats (all HQ)
 */
export async function GET(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['editor', 'moderator', 'marketing', 'admin', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Run all count queries in parallel
  const [
    { count: artistCount },
    { count: venueCount },
    { count: eventCount },
    { count: cityCount },
    { count: profileCount },
    { count: pendingClaimCount },
    { count: approvedClaimCount },
    { count: followCount },
  ] = await Promise.all([
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('venues').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('cities').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('follows').select('*', { count: 'exact', head: true }),
  ]);

  // Recent claims (last 10)
  const { data: recentClaims } = await supabase
    .from('claims')
    .select('claim_id, user_id, target_type, target_id, status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(10);

  // Recent audit logs (last 10)
  const { data: recentAuditLogs } = await supabase
    .from('admin_audit_logs')
    .select('action, entity_type, entity_id, created_at, admin_user_id')
    .order('created_at', { ascending: false })
    .limit(10);

  // Enrich recent claims with user display names
  const claimUserIds = [...new Set((recentClaims || []).map((c) => c.user_id).filter(Boolean))];
  const auditUserIds = [...new Set((recentAuditLogs || []).map((l) => l.admin_user_id).filter(Boolean))];
  const allUserIds = [...new Set([...claimUserIds, ...auditUserIds])];

  let profileMap = new Map<string, { display_name: string | null; username: string | null }>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', allUserIds);
    profileMap = new Map((profiles || []).map((p) => [p.id, p]));
  }

  return NextResponse.json({
    counts: {
      artists: artistCount ?? 0,
      venues: venueCount ?? 0,
      events: eventCount ?? 0,
      cities: cityCount ?? 0,
      users: profileCount ?? 0,
      pendingClaims: pendingClaimCount ?? 0,
      approvedClaims: approvedClaimCount ?? 0,
      follows: followCount ?? 0,
    },
    recentClaims: (recentClaims || []).map((c) => ({
      ...c,
      user_display: profileMap.get(c.user_id)?.display_name || profileMap.get(c.user_id)?.username || null,
    })),
    recentAuditLogs: (recentAuditLogs || []).map((l) => ({
      ...l,
      admin_display: profileMap.get(l.admin_user_id)?.display_name || profileMap.get(l.admin_user_id)?.username || null,
    })),
  });
}
