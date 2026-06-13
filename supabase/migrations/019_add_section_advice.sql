-- Add section_advice column to processed_reports
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS section_advice JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN processed_reports.section_advice IS 'AI-generated actionable advice per report section (e.g., kpi_advice, campaign_advice)';
