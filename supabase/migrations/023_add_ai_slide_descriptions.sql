-- Add ai_slide_descriptions column to processed_reports table
ALTER TABLE processed_reports ADD COLUMN IF NOT EXISTS ai_slide_descriptions JSONB;
