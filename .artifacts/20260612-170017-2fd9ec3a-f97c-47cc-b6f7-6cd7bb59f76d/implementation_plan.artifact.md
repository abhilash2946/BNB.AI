# Implementation Plan - Fix Missing AI Advice in SEO Reports (Follow-up)

The goal is to ensure that every table in the SEO BNB report has a purple AI advice box at the bottom. We will fix key mismatches, add missing components, and ensure robust data normalization.

## Proposed Changes

### Backend Workers

#### [seo_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/seo_worker.py)

- Update `EXPECTED_ADVICE_KEYS` to include `country_advice` and `activity_advice`.
- Implement robust normalization to ensure all advice fields are lists of strings (handling cases where Gemini returns a single string).
- Add a debug print for `section_advice` to match `performance_worker.py`.

#### [social_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/social_worker.py)

- Ensure similar normalization and key consistency for Social reports.

---

### Frontend Components & Hooks

#### [useReportData.ts](file:///D:/BNB fast new/src/components/command-center/useReportData.ts)

- Update `buildSeoReport` to support `country_advice` and `activity_advice` mapping.
- Ensure `sectionAdvice` (raw) is correctly passed through.

#### [ReportViews.tsx](file:///D:/BNB fast new/src/components/ReportViews.tsx)

- Add a "KPI Summary" `DataBlock` at the top of `SeoReportView` to show the overall SEO strategy advice (purple box).
- Ensure all `DataBlock` components in `SeoReportView` use the correctly mapped advice fields.

#### [mapper.ts](file:///D:/BNB fast new/src/utils/mapper.ts)

- Update SEO mapping to include `kpi_advice`.
- Add a helper function to ensure all advice fields are arrays before returning the final report object.

## Verification Plan

### Manual Verification
1. **Trigger SEO Report Generation**: Generate a new SEO report.
2. **Check Logs**: Verify that `DEBUG: section_advice` appears in the backend logs and contains valid data.
3. **Verify UI**:
    - Every table in the SEO report (Active Users, Keywords, etc.) should have a purple box at the bottom.
    - A new "SEO KPI Summary" section with a purple box should appear at the top.
4. **Inspect Network Response**: Verify that `section_advice` keys match what the frontend expects.
