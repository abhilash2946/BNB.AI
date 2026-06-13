-- 1. Re-apply and enforce RLS policies for all tables
-- This fixes the 'row-level security policy violation' error after a schema reset.

-- Ensure RLS is enabled on all tables
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

-- User Credentials
DROP POLICY IF EXISTS "Users can CRUD own user credentials" ON user_credentials;
CREATE POLICY "Users can CRUD own user credentials" ON user_credentials
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sites
DROP POLICY IF EXISTS "Users can CRUD own sites" ON sites;
CREATE POLICY "Users can CRUD own sites" ON sites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Site Credentials
DROP POLICY IF EXISTS "Users can CRUD own site credentials" ON site_credentials;
CREATE POLICY "Users can CRUD own site credentials" ON site_credentials
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_credentials.site_id AND sites.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sites WHERE sites.id = site_credentials.site_id AND sites.user_id = auth.uid())
  );

-- Report Status
DROP POLICY IF EXISTS "Users can CRUD own report status" ON report_status;
CREATE POLICY "Users can CRUD own report status" ON report_status
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Processed Reports
DROP POLICY IF EXISTS "Users can CRUD own processed reports" ON processed_reports;
CREATE POLICY "Users can CRUD own processed reports" ON processed_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. AUTOMATIC PROFILE CREATION TRIGGER
-- This ensures that even if onboarding is skipped or the database is reset,
-- a profile record is created for every authenticated user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, agency_name, role, tier)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    'My Agency',
    'Member',
    'Standard'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill for existing users who might have lost their profile during the reset
INSERT INTO public.profiles (id, name, email, agency_name, role, tier)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'User'),
  email,
  'My Agency',
  'Member',
  'Standard'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
