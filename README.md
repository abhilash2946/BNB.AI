# BNB.AI Marketing Intelligence API

This is the core backend service for generating marketing intelligence reports using Python and FastAPI.

## Setup

1.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

2.  **Environment Variables:**
    Copy `.env` template and fill in your credentials:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `GEMINI_API_KEY`
    - `PAGESPEED_API_KEY` (optional, used for Core Web Vitals / PageSpeed Insights)

3.  **Run the Server:**
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

## Endpoints

- `POST /performance-report`: Generates Google Ads + Meta Ads reports.
- `POST /seo-report`: Generates GA4 + GSC reports.
- `POST /social-report`: Generates Facebook Page + Instagram reports.

All endpoints accept:
```json
{
  "user_id": "string",
  "site_id": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```

## Architecture

- **FastAPI:** High-performance web framework for the API layer.
- **Background Tasks:** Handles long-running API calls and AI generation asynchronously.
- **Supabase:** Used for credential storage, report status tracking, and persisting processed reports.
- **Gemini 2.0:** Powers the AI narrative analysis and recommendations.
- **PageSpeed Insights:** Used for Core Web Vitals when `PAGESPEED_API_KEY` is configured.
