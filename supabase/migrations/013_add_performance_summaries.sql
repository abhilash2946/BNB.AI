ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS ai_google_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_meta_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_comparison TEXT;
