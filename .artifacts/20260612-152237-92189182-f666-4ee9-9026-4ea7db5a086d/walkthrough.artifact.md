# Walkthrough - Fixing Missing Report Data

I have fixed the issue where report data (tables, graphs, etc.) was not showing up in the frontend. This was primarily due to conflicting mapping logic between `useReportData.ts` and `mapper.ts`, overly lenient caching, and numeric parsing bugs.

## Changes

### 1. Unified Mapping Logic
- **Simplified `useReportData.ts`**: Removed redundant mapping logic and ensured it passes raw data to `mapper.ts` with consistent keys.
- **Enhanced `mapper.ts`**: Updated `mapReportResponseToMarketingReport` to be the single source of truth for mapping raw report data to the UI model. It now correctly handles:
    - `Performance Marketing` detail fields (Campaigns, Keywords, Devices).
    - `SEO` detail fields (Geography, Timeline, Page Titles, Channels, Events, Platforms).
    - `Combined Intelligence` reports.

### 2. Fixed Numeric Parsing
- **Comma Handling**: Fixed `parseNumeric` in `mapper.ts` to correctly handle numeric strings with commas (e.g., "1,234"). Previously, `parseFloat` would stop at the comma, returning "1" instead of "1234".

### 3. Improved Cache Integrity
- **Stricter Completion Checks**: Updated `isCompletePerformanceDatabaseReport` and others in `useReportData.ts` to verify the existence of detail fields (`google_ads_details`, `ga4_details`, and `ai_table_explanations`) before loading a cached report. This ensures that old, incomplete reports are not loaded, forcing a fresh sync when necessary.

### 4. UI Stability & Advice Key Sync
- **Defensive Rendering**: Added checks in `ReportViews.tsx` to prevent crashes if `report` data is missing.
- **Advice Key Alignment**: Synced the advice keys between `useReportData.ts`, `mapper.ts`, and `ReportViews.tsx` so that "Internal Strategy" tips show up correctly.

## Verification Results

### Automated Tests
- Ran `npm run build` which completed successfully, ensuring no type errors or broken imports were introduced.

### Manual Verification Steps (Recommended for User)
1.  **Trigger a New Sync**: Click "Generate AI Report" for a site with performance or SEO data.
2.  **Verify Tables**: Ensure that tables like "GOOGLE TOP CAMPAIGNS" or "TOP SEARCH KEYWORDS" are now populated with data.
3.  **Check KPI Ribbon**: Verify that the top KPI cards show correct values with proper formatting (e.g., currency symbols and commas).
4.  **Verify Views**: Switch between "AI Analysis", "Visual Charts", and "Internal Strategy" to ensure all sections are populated correctly.
