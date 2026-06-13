# Walkthrough - Fix Missing AI Advice in SEO Reports

I have implemented fixes to ensure that every table in the SEO BNB report has its associated AI advice (the purple box).

## Changes

### Backend

#### [seo_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/seo_worker.py)
- Updated `EXPECTED_ADVICE_KEYS` to include `country_advice` and `activity_advice`.
- Implemented robust normalization for `section_advice` to ensure all fields are lists of strings.
- Added debug logging for `section_advice`.

#### [social_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/social_worker.py)
- Added debug logging for `section_advice`.

### Frontend

#### [useReportData.ts](file:///D:/BNB fast new/src/components/command-center/useReportData.ts)
- Updated `buildSeoReport` to correctly map `kpi_advice`, `demographics` (from `country_advice`), and `timeline` (from `activity_advice`).

#### [mapper.ts](file:///D:/BNB fast new/src/utils/mapper.ts)
- Updated SEO mapping to include `kpi_advice`.

#### [ReportViews.tsx](file:///D:/BNB fast new/src/components/ReportViews.tsx)
- Added a new `DataBlock` for "SEO Strategy Summary" at the top of the SEO report. This ensures that the overall SEO strategy has a prominent purple advice box.

## Verification Summary

### Manual Verification
1. **Code Review**: Verified that the mapping keys match between the backend worker and frontend mapper.
2. **Normalization**: Ensured that the backend worker now forces advice fields to be lists, preventing potential UI rendering errors when the AI returns strings.
3. **UI Consistency**: The SEO report now follows the same structure as the Performance report, with a top-level summary advice box and section-specific advice boxes.
