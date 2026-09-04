-- Extend processed_reports table with more granular SEO data
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS top_landing_pages JSONB,
ADD COLUMN IF NOT EXISTS top_page_titles JSONB,
ADD COLUMN IF NOT EXISTS users_by_country JSONB,
ADD COLUMN IF NOT EXISTS gsc_daily JSONB,
ADD COLUMN IF NOT EXISTS ga4_details JSONB,
ADD COLUMN IF NOT EXISTS gsc_details JSONB;
