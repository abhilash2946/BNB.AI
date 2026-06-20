# Fix Missing Competitor Deep Dive and Executive Summary in SEO Report

The issue of the missing "Competitor Deep Dive" section in the SEO report and the potentially empty "Executive Briefing" is caused by a combination of missing mappings in the frontend data transformation and potential logic issues in the backend report generation.

## User Review Required

> [!IMPORTANT]
> I have identified that `buildSeoReport` in `useReportData.ts` was missing the `executiveSummary` field, which caused the UI to potentially show an empty briefing if not for a lucky fallback. I will also be ensuring that `ai_competitor_analysis` is correctly merged in combined reports.

## Proposed Changes

### Frontend Data Transformation

Summary: Fix missing mappings in `useReportData.ts` and `mapper.ts` to ensure all AI-generated fields are correctly passed to the UI components.

#### [useReportData.ts](file:///D:/BNB fast/src/components/command-center/useReportData.ts)

- Add `executiveSummary: narrative1` to the return object of `buildSeoReport`.
- In `buildCombinedReport`, ensure `ai_competitor_analysis` from the SEO part is preserved.

#### [mapper.ts](file:///D:/BNB fast/src/utils/mapper.ts)

- Ensure `aiCompetitorAnalysis` mapping correctly handles the camelCase/snake_case differences and preserves `competitor_breakdown`.

---

### Backend Report Generation

Summary: Improve robustness of AI result merging in backend workers.

#### [seo_worker.py](file:///D:/BNB fast/fastapi-backend/app/workers/seo_worker.py)

- Ensure `ai_result` construction doesn't accidentally lose or overwrite `competitor_breakdown` if multiple Gemini calls return overlapping keys.
- Add more debug logging for the final `competitor_analysis` object before DB insert.

#### [performance_worker.py](file:///D:/BNB fast/fastapi-backend/app/workers/performance_worker.py)

- Apply similar fixes as in `seo_worker.py` for consistency.

---

## Verification Plan

### Automated Tests
- No existing automated tests were found for the report generation logic. I will rely on manual verification and log analysis.

### Manual Verification
- I will verify the fix by checking the generated report data in the frontend using debug logs or by requesting the user to verify if they can see the sections now.
- I will verify that `executiveSummary` is now present in the `marketingReport` object for SEO reports.
- I will verify that `competitor_breakdown` is populated in the `aiCompetitorAnalysis` object.
