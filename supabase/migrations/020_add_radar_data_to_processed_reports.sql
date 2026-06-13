-- Add radar_data column to processed_reports table
ALTER TABLE processed_reports ADD COLUMN IF NOT EXISTS radar_data JSONB;

-- Update schema cache (Supabase specific, though usually automatic, it's good practice in some environments)
-- NOTIFY pgrst, 'reload schema';
