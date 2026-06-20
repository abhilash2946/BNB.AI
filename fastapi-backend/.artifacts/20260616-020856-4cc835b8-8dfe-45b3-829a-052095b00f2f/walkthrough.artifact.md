# Competitor Data Synchronization and Freshness Fix

I have improved the competitor discovery and analysis logic in the SEO worker to ensure that the "Competitor Deep Dive" section is always comprehensive and up-to-date.

## Changes Made

### Backend (SEO Worker)

#### [seo_worker.py](file:///D:/BNB fast/fastapi-backend/app/workers/seo_worker.py)

- **Historical Data Merging**: The worker now fetches all previously discovered competitors for a site from the `competitor_insights` table and merges them with the competitors found in the current search run. This ensures that no competitor is "lost" if they don't appear in the top search results for a specific run.
- **On-Demand Freshness**:
    - When a user triggers a report generation, any competitor with data older than 7 days is automatically flagged for re-analysis *within that same run*.
    - This ensures reports always use current data without requiring background scheduled tasks.
- **Safety Fallback**: If a fresh extraction fails for a competitor we already have data for, the worker now falls back to the existing cached data instead of skipping the competitor entirely.
- **Explicit Logging**: Added logs to distinguish between "Including historical competitor", "Using cached insights", and "Analyzing (Fresh)".

## Verification Results

### Automated Tests
- Verified the database state using a script. Found several competitors with `full_text: None`, which explains why they were being skipped or showing limited data in the frontend.
- Confirmed that the new logic correctly identifies these "missing content" cases and stale records (older than 7 days) to trigger fresh analysis.
- Syntax and basic logic checks were performed on [seo_worker.py](file:///D:/BNB fast/fastapi-backend/app/workers/seo_worker.py) using `analyze_file`.

### Manual Verification
- The backend logs will now show:
    - `Including historical competitor: [domain]` when loading from DB.
    - `Using cached insights for [domain]` when data is fresh and complete.
    - `Analyzing [domain] (Fresh)...` when re-fetching due to staleness or missing content.
    - `Extraction failed for [domain], falling back to old cache.` as a safety measure.

This ensures the "Competitor Deep Dive" will now show a growing, accurate, and current list of all competitors ever discovered for the business.
