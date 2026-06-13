-- Add summarized advice column to processed_reports
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS ai_recommendations_summarized JSONB;
