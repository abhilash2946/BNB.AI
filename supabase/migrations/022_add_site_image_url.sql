-- Add image_url column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS image_url TEXT;
