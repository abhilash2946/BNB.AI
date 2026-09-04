-- Update user_credentials platform check constraint to include only Google and Meta App credentials
-- This allows storing Google OAuth Client ID/Secret and Meta App ID/Secret per agency.

ALTER TABLE user_credentials DROP CONSTRAINT IF EXISTS user_credentials_platform_check;

ALTER TABLE user_credentials ADD CONSTRAINT user_credentials_platform_check
CHECK (platform IN (
    'google_service_account',
    'google_oauth',
    'meta_long_lived_token',
    'google_developer_token',
    'meta_app_creds'
));
