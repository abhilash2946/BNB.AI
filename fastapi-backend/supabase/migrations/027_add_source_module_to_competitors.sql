-- Add source_module column to distinguish between SEO and Performance competitors
ALTER TABLE competitor_insights ADD COLUMN IF NOT EXISTS source_module TEXT DEFAULT 'seo';

-- Drop the old unique constraint
ALTER TABLE competitor_insights DROP CONSTRAINT IF EXISTS competitor_insights_site_id_competitor_url_key;

-- Add a new unique constraint including source_module
ALTER TABLE competitor_insights ADD CONSTRAINT competitor_insights_site_id_url_module_key UNIQUE (site_id, competitor_url, source_module);

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_competitor_insights_module ON competitor_insights(site_id, source_module);
