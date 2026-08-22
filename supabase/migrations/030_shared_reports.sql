-- Create shared_reports table
create table shared_reports (
  id uuid default gen_random_uuid() primary key,
  site_id uuid references sites(id) on delete cascade not null,
  date_range jsonb not null,
  access_type text check (access_type in ('public', 'private')) not null,
  shared_pages text[] not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table shared_reports enable row level security;

-- Rule: Allow anyone with the unique ID to read the share configuration
create policy "Anyone can read shared report by id"
  on shared_reports for select
  using (true);

-- Rule: Only the site owner can create new share links
create policy "Owners can create shared reports"
  on shared_reports for insert
  with check (
    exists (
      select 1 from sites
      where sites.id = site_id
      and sites.user_id = auth.uid()
    )
  );

-- Rule: Allow guests to read the actual report data if a share link exists for that site
create policy "Allow guest read for shared reports"
  on processed_reports for select
  using (
    exists (
      select 1 from shared_reports
      where shared_reports.site_id = processed_reports.site_id
    )
  );

-- Rule: Allow guests to read basic site info (name/logo) for the shared site
create policy "Allow guest read for shared sites"
  on sites for select
  using (
    exists (
      select 1 from shared_reports
      where shared_reports.site_id = sites.id
    )
  );
