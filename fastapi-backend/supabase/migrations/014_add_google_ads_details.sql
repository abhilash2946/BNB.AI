ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS google_ads_details JSONB;
