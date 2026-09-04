-- Add a durable email anchor to profiles so returning users can be resolved by email.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
ON profiles (lower(email))
WHERE email IS NOT NULL;

UPDATE profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id
  AND profiles.email IS NULL;