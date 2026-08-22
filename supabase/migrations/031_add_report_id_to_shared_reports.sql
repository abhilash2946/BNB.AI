-- Add report_id column to shared_reports for direct data mapping
ALTER TABLE shared_reports ADD COLUMN IF NOT EXISTS report_id text;

-- Update the read policy to ensure it stays active
-- (Supabase handles column additions automatically for existing SELECT * policies,
-- but this comment serves as a marker for the schema change).
