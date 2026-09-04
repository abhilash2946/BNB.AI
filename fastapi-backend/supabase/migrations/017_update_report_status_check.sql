-- Update report_status status check constraint to include more granular steps
ALTER TABLE report_status
DROP CONSTRAINT IF EXISTS report_status_status_check;

ALTER TABLE report_status
ADD CONSTRAINT report_status_status_check
CHECK (status IN (
  'pending',
  'fetching_credentials',
  'fetching_ga4',
  'fetching_gsc',
  'fetching_gads',
  'fetching_meta',
  'fetching_data',
  'processing',
  'generating_ai',
  'completed',
  'failed'
));

COMMENT ON COLUMN report_status.status IS 'Status of the report generation process, including granular fetching steps.';
