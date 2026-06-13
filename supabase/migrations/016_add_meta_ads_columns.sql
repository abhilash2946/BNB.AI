-- Add Meta Ads specific columns to processed_reports
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS meta_ads_kpi JSONB,
ADD COLUMN IF NOT EXISTS meta_ads_details JSONB,
ADD COLUMN IF NOT EXISTS meta_ads_charts JSONB;

COMMENT ON COLUMN processed_reports.meta_ads_kpi IS 'KPI summary for Meta Ads (current/previous period)';
COMMENT ON COLUMN processed_reports.meta_ads_details IS 'Detailed Meta Ads data (campaigns, ad sets, creatives)';
COMMENT ON COLUMN processed_reports.meta_ads_charts IS 'Time-series data for Meta Ads (impressions, spend, etc.)';
