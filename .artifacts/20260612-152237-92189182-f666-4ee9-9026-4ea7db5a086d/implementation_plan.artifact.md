# Fix Missing Report Data and Unify Mapping Logic

The goal is to fix the issue where report data (tables, graphs, etc.) is missing in the frontend despite being fetched in the backend. This is primarily due to conflicting and buggy mapping logic between `useReportData.ts` and `mapper.ts`, and overly lenient caching checks.

## User Review Required

> [!IMPORTANT]
> - I will unify the mapping logic. `useReportData.ts` will focus on fetching and providing raw-ish data in a structured `ReportResponse`, and `mapper.ts` will handle the final mapping to the `MarketingReport` UI model.
> - I will tighten the "is complete" check for cached reports to ensure we don't load old reports that are missing the new `google_ads_details` or `ai_table_explanations` columns.
> - I will fix a bug in `mapper.ts` where numeric strings with commas (e.g., "1,234") were being incorrectly parsed by `parseFloat`.

## Proposed Changes

### Frontend (Intelligence Center)

#### [useReportData.ts](file:///D:/BNB fast new/src/components/command-center/useReportData.ts)

- Update `isCompletePerformanceDatabaseReport` and others to check for existence of detail fields (`google_ads_details`, `ga4_details`, etc.).
- Simplify `buildPerformanceReport` and `buildSeoReport` to pass through raw data more directly, ensuring field names match what `mapper.ts` expects.
- Fix advice key mapping to match what `ReportViews.tsx` expects.

#### [mapper.ts](file:///D:/BNB fast new/src/utils/mapper.ts)

- Fix `parseNumeric` to handle commas correctly.
- Ensure mapping for `Performance Marketing` and `SEO` correctly accesses the raw data passed from `useReportData.ts`.
- Fix the logic that overwrites `result.performance` and `result.seo` to be more robust.
- Fix formatting issues (e.g., CTR being multiplied by 100 twice).

#### [ReportViews.tsx](file:///D:/BNB fast new/src/components/ReportViews.tsx)

- Add defensive checks to ensure tables don't crash if data is missing.
- Ensure advice sections use consistent keys.

### Backend (Performance Worker)

#### [performance_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/performance_worker.py)

- Ensure `google_ads_details` is always a valid dict and contains all expected keys even if data is missing (as empty lists).
- Add more logging during the storage phase.

---

## Verification Plan

### Manual Verification
1. Run a Performance Report for a site with Google/Meta data.
2. Verify that "GOOGLE TOP CAMPAIGNS" and other tables are populated.
3. Verify that the "Executive Briefing" box is visible and contains AI text.
4. Verify that the KPI Ribbon at the top shows correct numbers (with commas).
5. Switch between "AI Analysis", "Visual Charts", and "Internal Strategy" views and verify data is present in all.
6. Run an SEO Report and verify similar consistency.
