# Fix AI Report Truncation and Empty Table Explanations

The goal is to fix issues where AI-generated reports (Performance and SEO) are being truncated due to large prompt/response sizes, leading to empty or incomplete `table_explanations`. Additionally, the frontend hang during "Finalizing" will be addressed with better error handling.

## User Review Required

> [!IMPORTANT]
> - **Performance Marketing** will be split into **three platform-specific AI calls**: Google Ads, Meta Ads, and GA4/GBP.
> - **SEO** will be split into **two platform-specific AI calls**: GA4/GBP and Google Search Console.
> - I will add **granular logging** (e.g., `✅ [GEMINI] Success for Google Ads`, `❌ [GEMINI] Failed for Meta Ads`) so you can pinpoint exactly where any future issues occur.
> - The results from these parallel calls will be merged into a single `ai_table_explanations` object before being saved to Supabase.

## Proposed Changes

### Gemini Service

#### [gemini.py](file:///D:/BNB fast new/fastapi-backend/app/services/gemini.py)

- Refine `extract_json_object` and `repair_json` to better handle truncated responses.
- Ensure `normalize_ai_payload` handles merging of partial results correctly.

### Performance Worker

#### [performance_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/performance_worker.py)

- Redefine split prompts:
    - `prompt_google_ads`: Focuses on Google Ads tables and advice.
    - `prompt_meta_ads`: Focuses on Meta Ads tables and advice.
    - `prompt_summary_ga4`: Focuses on the executive summary, slide descriptions, and GA4/GBP context.
- Update `asyncio.gather` to run these three calls in parallel.
- Add specific logging for each call's success/failure.
- Implement a robust merging logic for the final payload.

### SEO Worker

#### [seo_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/seo_worker.py)

- Redefine split prompts:
    - `prompt_gsc`: Focuses on Search Console data and keyword analysis.
    - `prompt_ga4_summary`: Focuses on GA4 metrics, overall summary, and slide descriptions.
- Add granular logging for GSC and GA4 AI steps.
- Improve the merging logic for `table_explanations`.

### Frontend (Intelligence Center)

#### [useReportData.ts](file:///D:/BNB fast new/src/components/command-center/useReportData.ts)

- Add a `try-catch` block inside `loadCompletedReport` to ensure `setIsLoading(false)` is always called.
- Add defensive checks in `buildPerformanceReport` and `buildSeoReport` to prevent crashes when AI data is partially missing or malformed.

---

## Verification Plan

### Automated Tests
- I will verify the fix by checking the backend logs for the new granular success messages (e.g., `✅ [GEMINI] GA4 Success`).
- I will verify that `table_explanations` contains keys from all platforms.

### Manual Verification
- Run the Performance Report and verify that `table_explanations` are populated for Google, Meta, and Overview sections.
- Run the SEO Report and verify that GSC and GA4 descriptions are both present.
- Verify that the "Finalizing" loading screen disappears even if there's a parsing error.
