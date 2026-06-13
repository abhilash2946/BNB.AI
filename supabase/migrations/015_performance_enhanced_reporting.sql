-- Migration 015: Add fields for enhanced performance reporting (multi-charts and competitor analysis)
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS charts JSONB,
ADD COLUMN IF NOT EXISTS competitor_data JSONB,
ADD COLUMN IF NOT EXISTS ai_competitor_analysis JSONB;

-- Add comment for documentation
COMMENT ON COLUMN processed_reports.charts IS 'Stores multiple time-series datasets (devices, demographics, etc.)';
COMMENT ON COLUMN processed_reports.competitor_data IS 'Stores raw Google Ads Auction Insights data';
COMMENT ON COLUMN processed_reports.ai_competitor_analysis IS 'Stores AI-generated insights and recommendations vs competitors';
