-- Add ai_enabled column to leads table
-- This allows toggling AI auto-responses per lead
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN leads.ai_enabled IS 'Controls whether AI should automatically respond to communications for this lead. Default is true.';
