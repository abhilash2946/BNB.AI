# Implementation Plan - Fix Missing AI Advice in Reports

The goal is to ensure that every table in both SEO and Performance BNB reports has an AI advice section (the purple box at the bottom of data blocks). Currently, some tables are missing these because of key mismatches between the backend workers and the frontend mapper, and some missing mappings in the frontend.

## Proposed Changes

### Frontend Utilities

#### [mapper.ts](file:///D:/BNB fast new/src/utils/mapper.ts)

- Update SEO `sectionAdvice` mapping to support both naming conventions (`demographic_advice` / `country_advice` and `timeline_advice` / `activity_advice`).
- Add missing `device_advice` and `meta_kpi_advice` mappings for the Performance report.
- Add `sectionAdvice` mapping for the Social report.
- Implement a helper to ensure all advice fields are returned as arrays of strings.

### Backend Workers

#### [seo_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/seo_worker.py)

- Ensure that all expected keys are correctly requested in the Gemini prompt.
- Add `country_advice` and `activity_advice` as aliases or replacements to ensure consistency.

#### [performance_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/performance_worker.py)

- Ensure `meta_kpi_advice` is explicitly requested in the Meta Ads prompt.
- Verify `device_advice` is correctly handled.

### Frontend Components

#### [ReportViews.tsx](file:///D:/BNB fast new/src/components/ReportViews.tsx)

- Double check that all `DataBlock` components are receiving the correct `advice` prop.

## Verification Plan

### Manual Verification
1. **Frontend Code Review**: Verify that `mapper.ts` now correctly maps all fields from the `ReportResponse`.
2. **Backend Code Review**: Verify that the workers are sending the correct keys to the frontend.
3. **Trigger Report Generation**: Generate new SEO and Performance reports and verify that every table has a purple advice box at the bottom.
4. **Mock Data Test**: If possible, mock an API response with various advice formats (string, array, empty) and verify the frontend renders them correctly.
