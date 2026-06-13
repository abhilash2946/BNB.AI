# Split Ads Report Slide and Updated Campaign Data

I have split the "Ads Report" slide into two dedicated parts for Meta Ads and Google Ads, and updated the campaign data to show detailed information for each campaign, including their current status.

## Changes Accomplished

### Backend Enhancements
- **Google Ads**: Updated `fetch_google_ads_campaigns` to include `campaign.status` and `metrics.interactions`.
- **Meta Ads**: Updated `fetch_meta_ads_campaigns` to fetch `effective_status` from the `/campaigns` endpoint and map `post_engagement` actions to interactions.

### Frontend Updates
- **Type Safety**: Updated `TopCampaign` and `MetaCampaign` interfaces in `types.ts` to support new fields: `status`, `interactions`, etc.
- **Data Mapping**: Updated `mapper.ts` to correctly populate these new fields from the backend response.
- **Split Slides**:
  - The single "Ads Intelligence" slide (ID 13) in `ClientReports.tsx` has been replaced by two new slides: **Meta Ads Report** (ID 13) and **Google Ads Report** (ID 14).
  - All subsequent slide IDs and Table of Contents (TOC) links have been updated accordingly.
- **Detailed Tables**:
  - Implemented new tables for both platforms with the requested columns.
  - Added a `StatusBadge` component that color-codes campaign status:
    - **Ongoing/Active** (Green)
    - **Paused** (Amber)
    - **Removed/Deleted** (Red)

## Verification Results

### Static Analysis
- Ran `analyze_file` on all modified files (`ClientReports.tsx`, `mapper.ts`, `google_ads.py`, `meta_ads.py`). No errors or warnings were found.

### Manual Verification Suggestion
- Navigate to the **Client PPT** view.
- Open the Table of Contents (Slide 2) and verify that "Meta Ads Intelligence" and "Google Ads Intelligence" have separate entries and correct page numbers.
- Go to Slide 13 and 14 to verify the new table structures and color-coded status badges.
- Ensure that the "Next" and "Previous" navigation buttons work correctly through the split slides.
