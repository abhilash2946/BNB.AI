-- Create competitor insights table for caching extracted competitor data
CREATE TABLE IF NOT EXISTS competitor_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  competitor_name TEXT,
  key_phrases JSONB,
  cta JSONB,
  entities JSONB,
  trust_signals JSONB,
  raw_text_preview TEXT,
  discovery_query TEXT,
  extracted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, competitor_url)
);

CREATE INDEX IF NOT EXISTS idx_competitor_insights_site ON competitor_insights(site_id, extracted_at);
