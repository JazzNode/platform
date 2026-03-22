import webpush from 'web-push';
import { type SupabaseClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@jazznode.com';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured');
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  image?: string;
  renotify?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

interface SendResult {
  sent: number;
  failed: number;
  cleaned: number;
}

/**
 * Send a push notification to all devices registered by a specific user.
 * Automatically cleans up stale subscriptions (410/404).
 */
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<SendResult> {
  ensureVapid();

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/profile/inbox',
    tag: payload.tag || 'jazznode-notification',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/badge-96.png',
    ...(payload.image && { image: payload.image }),
    timestamp: Date.now(),
    renotify: payload.renotify ?? true,
    actions: payload.actions || [{ action: 'view', title: 'View' }],
  });

  let sent = 0;
  let failed = 0;
  const staleEndpoints: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
      );
      sent++;
    } catch (err: unknown) {
      failed++;
      if (err && typeof err === 'object' && 'statusCode' in err) {
        const code = (err as { statusCode: number }).statusCode;
        if (code === 404 || code === 410) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }
  }

  // Clean stale subscriptions
  if (staleEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }

  return { sent, failed, cleaned: staleEndpoints.length };
}
