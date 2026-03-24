import { createAdminClient } from '@/utils/supabase/admin';

type NotificationType = 'fan_insights' | 'post_show_recap' | 'weekly_digest';

export interface PremiumNotificationParams {
  userId: string;
  type: NotificationType;
  entityType: 'artist' | 'venue';
  entityId: string;
  entityName: string;
}

/**
 * Insert an inbox notification for a premium feature.
 * The existing pg_net trigger will automatically fire a PWA push notification.
 */
export async function sendPremiumNotification({
  userId,
  type,
  entityType,
  entityId,
  entityName,
}: PremiumNotificationParams) {
  const supabase = createAdminClient();

  const { title, body } = buildNotificationContent(type, entityType, entityName);

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    reference_type: entityType,
    reference_id: entityId,
    status: 'sent',
  });

  if (error) {
    console.error(`[premium-notify] Failed to insert ${type} notification for ${userId}:`, error.message);
  }

  return { error };
}

/**
 * Batch-insert premium notifications for multiple users.
 * Deduplicates by (user_id, type, reference_id) within the same day.
 */
export async function sendPremiumNotificationBatch(
  items: PremiumNotificationParams[],
) {
  if (items.length === 0) return { sent: 0, skipped: 0 };

  const supabase = createAdminClient();

  // Check for existing notifications today to avoid duplicates
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('notifications')
    .select('user_id, type, reference_id')
    .in('type', ['fan_insights', 'post_show_recap', 'weekly_digest'])
    .gte('created_at', todayStart.toISOString());

  const existingKeys = new Set(
    (existing || []).map((n) => `${n.user_id}:${n.type}:${n.reference_id}`),
  );

  const rows = items
    .filter((item) => !existingKeys.has(`${item.userId}:${item.type}:${item.entityId}`))
    .map((item) => {
      const { title, body } = buildNotificationContent(item.type, item.entityType, item.entityName);
      return {
        user_id: item.userId,
        type: item.type,
        title,
        body,
        reference_type: item.entityType,
        reference_id: item.entityId,
        status: 'sent',
      };
    });

  if (rows.length === 0) return { sent: 0, skipped: items.length };

  const { error } = await supabase.from('notifications').insert(rows);

  if (error) {
    console.error(`[premium-notify] Batch insert failed:`, error.message);
    return { sent: 0, skipped: 0, error: error.message };
  }

  return { sent: rows.length, skipped: items.length - rows.length };
}

function buildNotificationContent(
  type: NotificationType,
  entityType: 'artist' | 'venue',
  entityName: string,
): { title: string; body: string } {
  switch (type) {
    case 'weekly_digest':
      return {
        title: `📊 ${entityName} 每週摘要`,
        body: `你的${entityType === 'artist' ? '藝人' : '場地'}本週數據已更新，包含瀏覽量、新粉絲與近期演出。`,
      };
    case 'fan_insights':
      return {
        title: `📈 ${entityName} 粉絲洞察報告`,
        body: `新的粉絲成長分析已準備就緒，查看熱門城市、最佳演出與互動高峰時段。`,
      };
    case 'post_show_recap':
      return {
        title: `🎵 ${entityName} 演出回顧`,
        body: `最近的演出數據已出爐：頁面瀏覽變化、新增粉絲與觸及城市一覽。`,
      };
  }
}
