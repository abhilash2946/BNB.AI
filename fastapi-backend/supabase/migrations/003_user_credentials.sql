-- User Credentials Table (Agency level)
-- This migration ensures `user_credentials` table has an `updated_at` trigger and helpful indexes.

-- Create trigger function to update updated_at columns
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables that have updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_credentials') THEN
    BEGIN
      EXECUTE 'CREATE TRIGGER user_credentials_set_updated_at BEFORE UPDATE ON user_credentials FOR EACH ROW EXECUTE PROCEDURE set_updated_at();';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_credentials') THEN
    BEGIN
      EXECUTE 'CREATE TRIGGER site_credentials_set_updated_at BEFORE UPDATE ON site_credentials FOR EACH ROW EXECUTE PROCEDURE set_updated_at();';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'processed_reports') THEN
    BEGIN
      EXECUTE 'CREATE TRIGGER processed_reports_set_updated_at BEFORE UPDATE ON processed_reports FOR EACH ROW EXECUTE PROCEDURE set_updated_at();';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;

-- Add useful indexes
CREATE INDEX IF NOT EXISTS idx_sites_user_id ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_site_credentials_site_id ON site_credentials(site_id);
CREATE INDEX IF NOT EXISTS idx_report_status_user ON report_status(user_id);
