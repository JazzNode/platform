import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const ALLOWED_ROLES = ['moderator', 'admin', 'owner'];

/**
 * GET /api/admin/comment-reports — List reports with status filter
 */
export async function GET(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ALLOWED_ROLES)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  // Validate status
  if (!['pending', 'dismissed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }

  // Get total count
  const { count: total } = await supabase
    .from('comment_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);

  // Fetch reports
  const { data: reports, error } = await supabase
    .from('comment_reports')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!reports || reports.length === 0) {
    return NextResponse.json({ reports: [], total: total || 0, totalPages: 0 });
  }

  // Collect IDs for joins
  const commentIds = [...new Set(reports.map((r) => r.comment_id))];
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];

  // Fetch comments
  const { data: comments } = await supabase
    .from('venue_comments')
    .select('id, text, venue_id, user_id, is_hidden')
    .in('id', commentIds);

  // Collect comment author IDs
  const commentAuthorIds = [...new Set((comments || []).map((c) => c.user_id).filter(Boolean))];
  const allUserIds = [...new Set([...reporterIds, ...commentAuthorIds])];

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', allUserIds);

  // Build lookup maps
  const commentMap = new Map((comments || []).map((c) => [c.id, c]));
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Enrich reports
  const enrichedReports = reports.map((report) => {
    const comment = commentMap.get(report.comment_id);
    const reporter = profileMap.get(report.reporter_id);
    const commentAuthor = comment ? profileMap.get(comment.user_id) : null;

    return {
      ...report,
      comment: comment
        ? {
            id: comment.id,
            text: comment.text,
            venue_id: comment.venue_id,
            is_hidden: comment.is_hidden,
            author: commentAuthor
              ? { display_name: commentAuthor.display_name, avatar_url: commentAuthor.avatar_url }
              : null,
          }
        : null,
      reporter: reporter
        ? { display_name: reporter.display_name, avatar_url: reporter.avatar_url }
        : null,
    };
  });

  const totalCount = total || 0;
  return NextResponse.json({
    reports: enrichedReports,
    total: totalCount,
    totalPages: Math.ceil(totalCount / limit),
  });
}

/**
 * PATCH /api/admin/comment-reports — Resolve a report
 */
export async function PATCH(request: NextRequest) {
  const { isHQ, role, userId } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ALLOWED_ROLES) || !userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { reportId, action } = body;

    if (!reportId || !['dismissed', 'hidden', 'deleted'].includes(action)) {
      return NextResponse.json({ error: 'Invalid reportId or action' }, { status: 400 });
    }

    // Fetch the report
    const { data: report, error: fetchError } = await supabase
      .from('comment_reports')
      .select('id, comment_id, status')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (report.status !== 'pending') {
      return NextResponse.json({ error: 'Report already resolved' }, { status: 400 });
    }

    // Apply action to the comment
    if (action === 'hidden') {
      const { error: hideError } = await supabase
        .from('venue_comments')
        .update({ is_hidden: true })
        .eq('id', report.comment_id);

      if (hideError) {
        console.error('Failed to hide comment:', hideError);
        return NextResponse.json({ error: 'Failed to hide comment' }, { status: 500 });
      }
    } else if (action === 'deleted') {
      const { error: deleteError } = await supabase
        .from('venue_comments')
        .delete()
        .eq('id', report.comment_id);

      if (deleteError) {
        console.error('Failed to delete comment:', deleteError);
        return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
      }
    }

    // Update the report
    const newStatus = action === 'dismissed' ? 'dismissed' : 'actioned';
    const { error: updateError } = await supabase
      .from('comment_reports')
      .update({
        status: newStatus,
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        resolution_action: action,
      })
      .eq('id', reportId);

    if (updateError) {
      console.error('Failed to update report:', updateError);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    // Also resolve any other pending reports for the same comment (if action was taken)
    if (action !== 'dismissed') {
      await supabase
        .from('comment_reports')
        .update({
          status: newStatus,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
          resolution_action: action,
        })
        .eq('comment_id', report.comment_id)
        .eq('status', 'pending');
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Comment report PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
