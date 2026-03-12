import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/admin/claims — List all claims (admin only)
 */
export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user profile info
  const userIds = [...new Set((data || []).map((c) => c.user_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, role')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const enriched = (data || []).map((claim) => ({
    ...claim,
    user_profile: claim.user_id ? profileMap.get(claim.user_id) ?? null : null,
  }));

  return NextResponse.json({ claims: enriched });
}

/**
 * PATCH /api/admin/claims — Approve or reject a claim (admin only)
 */
export async function PATCH(request: NextRequest) {
  const { isAdmin, userId: adminUserId } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin || !adminUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { claimId, action, rejectionReason } = body as {
    claimId: string;
    action: 'approve' | 'reject';
    rejectionReason?: string;
  };

  if (!claimId || !action) {
    return NextResponse.json({ error: 'Missing claimId or action' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the claim
  const { data: claim, error: fetchError } = await supabase
    .from('claims')
    .select('*')
    .eq('claim_id', claimId)
    .single();

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.status !== 'pending') {
    return NextResponse.json({ error: `Claim already ${claim.status}` }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    // Update claim status
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: adminUserId,
      })
      .eq('claim_id', claimId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Upgrade user role to 'artist' if currently 'member'
    if (claim.user_id && claim.target_type === 'artist') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', claim.user_id)
        .single();

      if (profile?.role === 'member') {
        await supabase
          .from('profiles')
          .update({ role: 'artist', updated_at: now })
          .eq('id', claim.user_id);
      }
    }

    // Audit log
    writeAuditLog({
      adminUserId,
      action: 'approve_claim',
      entityType: claim.target_type,
      entityId: claim.target_id,
      details: { claimId, userId: claim.user_id },
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ status: 'approved' });
  }

  if (action === 'reject') {
    const { error: updateError } = await supabase
      .from('claims')
      .update({
        status: 'rejected',
        reviewed_at: now,
        reviewed_by: adminUserId,
        rejection_reason: rejectionReason || null,
      })
      .eq('claim_id', claimId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    writeAuditLog({
      adminUserId,
      action: 'reject_claim',
      entityType: claim.target_type,
      entityId: claim.target_id,
      details: { claimId, userId: claim.user_id, rejectionReason },
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ status: 'rejected' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
