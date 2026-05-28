-- Add Gemini-generated top keywords overview sentence to processed_reports
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS ai_top_keywords_overview TEXT;
