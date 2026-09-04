-- Add top_keywords column to processed_reports table
ALTER TABLE processed_reports ADD COLUMN IF NOT EXISTS top_keywords JSONB;
