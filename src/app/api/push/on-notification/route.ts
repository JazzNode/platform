import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendPushToUser, type PushPayload } from '@/lib/push';

/**
 * Webhook endpoint called by Supabase pg_net trigger
 * whenever a new notification is inserted into the notifications table.
 *
 * This covers ALL notification types:
 *   - message (from artists, venues, members, JazzNode HQ)
 *   - follow_update, claim_status, system, new_member, badge, general
 *
 * Protected by PUSH_WEBHOOK_SECRET (shared with Supabase vault).
 */

const WEBHOOK_SECRET = (process.env.PUSH_WEBHOOK_SECRET || process.env.CRON_SECRET || '').trim();

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get('authorization');
  if (!WEBHOOK_SECRET || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let notification: {
    id: string;
    user_id: string | null;
    title: string;
    body: string | null;
    type: string;
    reference_type: string | null;
    reference_id: string | null;
  };

  try {
    notification = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Must have a user to notify
  if (!notification.user_id) {
    return NextResponse.json({ message: 'No user_id, skipped' }, { status: 200 });
  }

  // Build push payload based on notification type
  const payload = buildPushPayload(notification);

  const supabase = createAdminClient();

  try {
    const result = await sendPushToUser(supabase, notification.user_id, payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPushPayload(notification: {
  title: string;
  body: string | null;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
}): PushPayload {
  const { type, reference_type, reference_id } = notification;

  // Determine deep-link URL based on notification type
  const url = getNotificationUrl(type, reference_type, reference_id);

  // Determine notification tag for grouping
  const tag = getNotificationTag(type, reference_id);

  return {
    title: notification.title,
    body: notification.body || '',
    url,
    tag,
    renotify: true,
    actions: getNotificationActions(type),
  };
}

function getNotificationUrl(
  type: string,
  referenceType: string | null,
  referenceId: string | null,
): string {
  switch (type) {
    case 'message':
      // Link to inbox — conversation will be highlighted
      return '/profile/inbox';

    case 'follow_update':
      // Link to the artist/venue page if available
      if (referenceType === 'artist' && referenceId) return `/artists/${referenceId}`;
      if (referenceType === 'venue' && referenceId) return `/venues/${referenceId}`;
      return '/profile/inbox';

    case 'comment_reply':
      // Link to the venue page where the comment was made
      if (referenceType === 'venue' && referenceId) return `/venues/${referenceId}`;
      return '/profile/comments';

    case 'claim_status':
      return '/profile';

    case 'badge':
      return '/profile/badges';

    case 'new_member':
      // Admin notification — link to admin dashboard
      return '/admin';

    case 'system':
    case 'general':
    default:
      return '/profile/inbox';
  }
}

function getNotificationTag(type: string, referenceId: string | null): string {
  // Group notifications by type + reference to avoid spamming
  if (type === 'message' && referenceId) {
    return `message-${referenceId}`;
  }
  return `jazznode-${type}`;
}

function getNotificationActions(type: string): Array<{ action: string; title: string }> {
  switch (type) {
    case 'message':
      return [{ action: 'reply', title: 'Reply' }];
    case 'follow_update':
      return [{ action: 'view', title: 'View Profile' }];
    case 'comment_reply':
      return [{ action: 'view', title: 'View Comment' }];
    case 'badge':
      return [{ action: 'view', title: 'View Badge' }];
    default:
      return [{ action: 'view', title: 'View' }];
  }
}
