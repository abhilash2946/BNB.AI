-- Add GA4 chart-specific datasets for SEO reporting visuals
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS sessions_by_channel JSONB,
ADD COLUMN IF NOT EXISTS events_by_event_name JSONB,
ADD COLUMN IF NOT EXISTS key_events_by_platform JSONB;
