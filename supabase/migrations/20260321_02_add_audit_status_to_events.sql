-- Add audit_status column to events for admin review workflow
-- Values: NULL (not reviewed), 'need_fix', 'checked'
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS audit_status text DEFAULT NULL;

-- Add a check constraint for valid values
ALTER TABLE events
  ADD CONSTRAINT events_audit_status_check
  CHECK (audit_status IS NULL OR audit_status IN ('need_fix', 'checked'));
