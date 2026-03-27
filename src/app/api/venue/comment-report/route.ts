import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'] as const;

export async function POST(request: NextRequest) {
  try {
    // Verify user via Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const supabase = createAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const { commentId, reason, details } = body;

    if (!commentId || typeof commentId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid commentId' }, { status: 400 });
    }

    if (!reason || !VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
        { status: 400 },
      );
    }

    if (details && (typeof details !== 'string' || details.length > 500)) {
      return NextResponse.json({ error: 'Details must be a string of max 500 characters' }, { status: 400 });
    }

    // Verify the comment exists
    const { data: comment, error: commentError } = await supabase
      .from('venue_comments')
      .select('id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check for duplicate report
    const { data: existing } = await supabase
      .from('comment_reports')
      .select('id')
      .eq('comment_id', commentId)
      .eq('reporter_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already reported' }, { status: 409 });
    }

    // Insert report
    const { data: report, error: insertError } = await supabase
      .from('comment_reports')
      .insert({
        comment_id: commentId,
        reporter_id: user.id,
        reason,
        details: details?.trim() || null,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert comment report:', insertError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (err) {
    console.error('Comment report error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
