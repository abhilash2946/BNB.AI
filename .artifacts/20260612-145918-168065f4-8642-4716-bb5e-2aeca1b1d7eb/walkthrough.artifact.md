# Walkthrough - Fixing Empty SEO Graphs and Missing Metrics

I have addressed the issues with empty graphs in the SEO Intelligence "Graphs" section and the missing Bounce Rate metric.

## Changes

### 1. Backend: Fetching Bounce Rate
Updated `ga4.py` to include `bounceRate` in the GA4 report request. Previously, this metric was not being requested, resulting in `0.0%` being displayed in the UI.

### 2. Frontend: Chart Rendering Stability
Modified `GraphBlock` in `ReportViews.tsx`:
- Added a `min-h-[320px]` to the chart container to ensure Recharts' `ResponsiveContainer` has a non-zero height to render into.
- Added a placeholder UI that displays "Awaiting Intelligence Feed..." when no data is present, instead of just showing an empty box.
- Optimized `XAxis` with `interval="preserveStartEnd"` and `minTickGap={30}` to handle long time-series data cleanly.
- Increased `YAxis` width to `120px` for horizontal charts to better accommodate long Page Titles.

### 3. Frontend: Data Mapping Robustness
Updated `mapper.ts` to be more flexible when pulling data for SEO graphs:
- It now checks `report.topCountries`, `report.ga4_details.top_countries`, and `report.users_by_country` to ensure geographical data is captured regardless of which backend node populated it.
- Improved the timeline mapping to fallback to `report.chart_datasets` if specialized GA4 timeline data is missing.

## Verification Summary

- **Bounce Rate**: Verified that the backend now requests and processes the `bounceRate` metric.
- **Graph Populating**: The mapping logic now covers all possible data keys returned by the backend for SEO reports.
- **Layout**: The charts now have a guaranteed minimum height, preventing them from being invisible due to CSS flexbox collapsing.
