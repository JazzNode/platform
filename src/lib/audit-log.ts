import { createAdminClient } from '@/utils/supabase/admin';

interface AuditLogEntry {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Write an entry to admin_audit_logs.
 * Uses service_role client so it bypasses RLS.
 * Fire-and-forget: errors are logged but don't block the response.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('admin_audit_logs').insert({
      admin_user_id: entry.adminUserId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      details: entry.details ?? {},
      ip_address: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}
