-- Update user_credentials platform check constraint to include 'google_oauth'

-- First, drop the existing constraint. 
-- Note: Postgres automatically names the check constraint something like 'user_credentials_platform_check'
ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_platform_check;

-- Add the new constraint including 'google_oauth'
ALTER TABLE user_credentials ADD CONSTRAINT user_credentials_platform_check 
CHECK (platform IN ('google_service_account', 'google_oauth', 'meta_long_lived_token', 'google_developer_token'));
