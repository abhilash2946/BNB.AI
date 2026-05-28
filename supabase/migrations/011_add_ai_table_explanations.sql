-- Add AI-generated sentence explanations for report tables
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS ai_table_explanations JSONB;
