-- Add city column to sites table for competitor search
ALTER TABLE sites ADD COLUMN IF NOT EXISTS city TEXT;

-- Add missing columns to processed_reports for BnB reports
ALTER TABLE processed_reports
ADD COLUMN IF NOT EXISTS improvement_roadmap JSONB,
ADD COLUMN IF NOT EXISTS competitor_intelligence JSONB,
ADD COLUMN IF NOT EXISTS radar_self JSONB;
