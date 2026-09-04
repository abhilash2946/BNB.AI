-- Ensure RLS is enabled on all tables
-- Enable Row Level Security and create robust owner policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can manage their own profile
DROP POLICY IF EXISTS "Users can CRUD own profile" ON profiles;
CREATE POLICY "Users can CRUD own profile" ON profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User credentials: Users can manage their agency credentials
DROP POLICY IF EXISTS "Users can CRUD own user credentials" ON user_credentials;
CREATE POLICY "Users can CRUD own user credentials" ON user_credentials
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sites: Users can manage their own sites
DROP POLICY IF EXISTS "Users can CRUD own sites" ON sites;
CREATE POLICY "Users can CRUD own sites" ON sites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Site Credentials: Users can manage credentials for sites they own
DROP POLICY IF EXISTS "Users can CRUD own site credentials" ON site_credentials;
CREATE POLICY "Users can CRUD own site credentials" ON site_credentials
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_credentials.site_id AND sites.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_credentials.site_id AND sites.user_id = auth.uid())
  );

-- Report Status: Users can manage their own report statuses
DROP POLICY IF EXISTS "Users can CRUD own report status" ON report_status;
CREATE POLICY "Users can CRUD own report status" ON report_status
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Processed Reports: Users can manage their own processed reports
DROP POLICY IF EXISTS "Users can CRUD own processed reports" ON processed_reports;
CREATE POLICY "Users can CRUD own processed reports" ON processed_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
