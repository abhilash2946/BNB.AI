-- Reset and recreate the application schema for BNB.AI.
-- This version is aligned with the current frontend flow:
-- - authenticated users create/update their own profiles, sites, and credentials
-- - report tables remain owner-scoped
-- Full reset migration: drops and recreates the app schema (identical to 001 but idempotent)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS processed_reports CASCADE;
DROP TABLE IF EXISTS report_status CASCADE;
DROP TABLE IF EXISTS site_credentials CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS user_credentials CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Recreate tables (same as 001)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  agency_name TEXT,
  role TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'Standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google_service_account','google_oauth','meta_long_lived_token','google_developer_token')),
  credentials JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_platform_unique UNIQUE (user_id, platform)
);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  industry TEXT,
  seo_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ga4','google_search_console','google_ads','meta_ads','meta_business_suite','instagram')),
  credentials JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_platform_unique UNIQUE (site_id, platform)
);

CREATE TABLE report_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('seo','performance','social')),
  status TEXT NOT NULL CHECK (status IN ('pending','fetching_data','processing','generating_ai','completed','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE processed_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('seo','performance','social')),
  start_date DATE,
  end_date DATE,
  kpi_summary JSONB,
  chart_datasets JSONB,
  top_keywords JSONB,
  ai_summary TEXT,
  ai_insights JSONB,
  ai_recommendations JSONB,
  ai_top_keywords_overview TEXT,
  ai_table_explanations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recreate policies (left to 002 but ensure RLS is enabled here to be safe)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_reports ENABLE ROW LEVEL SECURITY;
