# Walkthrough - AI Advice Fix in Reports

I have fixed the issue where AI advice (purple boxes) was missing from several tables in the SEO and Performance reports.

## Changes Made

### Frontend

-   **[mapper.ts](file:///D:/BNB fast new/src/utils/mapper.ts)**:
    -   Updated SEO mapping to handle both `demographic_advice`/`country_advice` and `timeline_advice`/`activity_advice` keys.
    -   Added mapping for `device_advice` and `meta_kpi_advice` in the Performance report.
    -   Enabled section-specific advice mapping for the Social report (KPIs and Timeline).

### Backend Workers

-   **[seo_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/seo_worker.py)**:
    -   Updated the Gemini prompt to explicitly use `country_advice` and `activity_advice` to match the frontend expectations.
-   **[performance_worker.py](file:///D:/BNB fast new/fastapi-backend/app/workers/performance_worker.py)**:
    -   Refined the Meta Ads prompt to ensure `meta_kpi_advice` is generated.

## Verification Summary

-   **Code Audit**: Verified that all `DataBlock` components in `ReportViews.tsx` use keys that are now correctly mapped in `mapper.ts`.
-   **Key Consistency**: Confirmed that the backend workers and frontend mapper are now synchronized on the advice keys.
-   **Social Report Support**: The Social report now correctly displays AI advice for its two main sections.

## Impact

Every table in the SEO, Performance, and Social reports should now consistently display the purple AI advice box, providing strategic insights for all data points.
