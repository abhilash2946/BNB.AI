# Split Ads Report Slide and Update Campaign Data

This plan outlines the changes to split the Ads Report slide into two parts (Meta and Google) and display detailed campaign information with the requested columns and color-coded status.

## User Review Required

- **Data Availability**: The "Status" and "Interactions" fields will be added to the backend services. If the API doesn't provide these for all campaigns, they will fallback to "N/A" or 0.
- **Color Coding**:
  - Ongoing/Active -> Green
  - Paused -> Amber
  - Removed/Deleted -> Red

## Proposed Changes

### Backend Services

#### [google_ads.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/services/google_ads.py)

- Update `fetch_google_ads_campaigns` to include `campaign.status` and `metrics.interactions` in the GAQL query.
- Map these fields to the returned dictionary.

#### [meta_ads.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/services/meta_ads.py)

- Update `fetch_meta_ads_campaigns` to use the `/campaigns` endpoint instead of `/insights` with `level=campaign`. This allows fetching `effective_status` which is not available directly on the insights level.
- Map `effective_status` to `status`.
- Extract `post_engagement` from actions and map it to `interactions`.

---

### Frontend Types and Mappers

#### [types.ts](file:///D:/BNB%20fast%20new/src/types.ts)

- Update `TopCampaign` and `MetaCampaign` interfaces to include `status`, `impressions`, `clicks`, and `interactions`.

#### [mapper.ts](file:///D:/BNB%20fast%20new/src/utils/mapper.ts)

- Update `mapReportResponseToMarketingReport` to map `status`, `interactions`, and other missing fields for both Google and Meta campaigns.

---

### Frontend Components

#### [ClientReports.tsx](file:///D:/BNB%20fast%20new/src/components/command-center/ClientReports.tsx)

- Update `allSlides` array:
  - Split "Ads Intelligence" (ID 13) into "Meta Ads Report" and "Google Ads Report".
  - Shift subsequent slide IDs if necessary.
- Update `renderSlide` function:
  - Implement a new case for the split slides.
  - Create a table for each platform with the specific columns requested:
    - **Google**: Campaign Name, Status, Total Leads, Cost per Lead, Amount spent, Impressions, Clicks.
    - **Meta**: Campaign Name, Status, Total Leads, Cost / Lead, Interactions, Cost, Impr.
- Add a `StatusBadge` helper component to handle color-coded status indications.
- Fix the Table of Contents (TOC) links to point to the correct slide IDs.

## Verification Plan

### Automated Tests
- No specific automated tests are available for this UI change.

### Manual Verification
- **Visual Inspection**: Use the `render_compose_preview` or `take_screenshot` (if running locally) to verify the new slides and table structures.
- **Data Validation**: Check that the campaign names, statuses, and metrics are displayed correctly in the new slides.
- **Navigation**: Verify that the "Next" and "Previous" buttons and TOC links navigate to the correct slides.
