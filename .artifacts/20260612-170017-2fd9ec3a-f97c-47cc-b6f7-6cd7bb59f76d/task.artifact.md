# Task: Fix Missing AI Advice in SEO Reports

- [x] Investigate why AI advice is missing in SEO reports
    - [x] Analyze backend logs
    - [x] Research `seo_worker.py` for advice generation logic
    - [x] Research `mapper.ts` for SEO advice mapping
- [x] Create implementation plan
- [x] Implement fixes in backend
    - [x] Update `seo_worker.py` (normalization and keys)
    - [x] Update `social_worker.py` (consistency)
- [x] Implement fixes in frontend
    - [x] Update `useReportData.ts` (mapping)
    - [x] Update `mapper.ts` (helper and kpi_advice)
    - [x] Update `ReportViews.tsx` (KPI DataBlock)
- [x] Verify fixes
    - [x] Review code for potential regressions
    - [x] Check mapping consistency
