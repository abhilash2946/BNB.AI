-- Initial schema for BNB.AI application

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  agency_name TEXT,
  role TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'Standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agency-level credentials
CREATE TABLE IF NOT EXISTS user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google_service_account','google_oauth','meta_long_lived_token','google_developer_token')),
  credentials JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_platform_unique UNIQUE (user_id, platform)
);

-- Sites (store seo_settings on parent row)
CREATE TABLE IF NOT EXISTS sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  industry TEXT,
  seo_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-site credentials
CREATE TABLE IF NOT EXISTS site_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ga4','google_search_console','google_ads','meta_ads','meta_business_suite','instagram')),
  credentials JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_platform_unique UNIQUE (site_id, platform)
);

-- Report tracking and results
CREATE TABLE IF NOT EXISTS report_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('seo','performance','social')),
  status TEXT NOT NULL CHECK (status IN ('pending','fetching_data','processing','generating_ai','completed','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS processed_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('seo','performance','social')),
  start_date DATE,
  end_date DATE,
  kpi_summary JSONB,
  chart_datasets JSONB,
  ai_summary TEXT,
  ai_insights JSONB,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep policies in a separate migration (002)
