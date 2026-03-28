-- Add hq_status column to conversations for admin inbox labeling
-- Values: null (read/no action), 'pending' (needs follow-up), 'replied' (admin responded)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS hq_status text
    CHECK (hq_status IN ('pending', 'replied'));
