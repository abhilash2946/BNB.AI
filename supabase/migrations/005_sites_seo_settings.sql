-- Add seo_settings to sites (idempotent) and backfill from existing site_credentials
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS seo_settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill seo_settings from site_credentials where available
UPDATE sites
SET seo_settings = jsonb_strip_nulls(
  jsonb_build_object(
    'ga4Id', (SELECT credentials->>'property_id' FROM site_credentials WHERE site_credentials.site_id = sites.id AND platform = 'ga4' LIMIT 1),
    'gscUrl', (SELECT credentials->>'site_url' FROM site_credentials WHERE site_credentials.site_id = sites.id AND platform = 'google_search_console' LIMIT 1),
    'googleAdsId', (SELECT credentials->>'customer_id' FROM site_credentials WHERE site_credentials.site_id = sites.id AND platform = 'google_ads' LIMIT 1),
    'metaAdsId', (SELECT credentials->>'ad_account_id' FROM site_credentials WHERE site_credentials.site_id = sites.id AND platform = 'meta_ads' LIMIT 1),
    'fbPageId', (SELECT credentials->>'page_id' FROM site_credentials WHERE site_credentials.site_id = sites.id AND platform = 'meta_business_suite' LIMIT 1),
    'igBusId', (SELECT credentials->>'instagram_business_id' FROM site_credentials WHERE site_credentials.site_id = sites.id AND platform = 'instagram' LIMIT 1)
  )
)
WHERE EXISTS (SELECT 1 FROM site_credentials WHERE site_credentials.site_id = sites.id);
