# Fix Missing Table Advice in SEO BNB Report

Align the data keys between the backend worker and the frontend components to ensure table-specific strategic advice is correctly rendered in the SEO report.

## Proposed Changes

### [Backend Worker]

#### [seo_worker.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/workers/seo_worker.py)

- Change the database storage key from `section_advice` to `sectionAdvice` to match the expected property in `SEOReport.tsx`.

```python
        # Store Result (around line 308)
        supabase.table("processed_reports").insert({
            # ...
            "sectionAdvice": section_advice, # Changed from "section_advice"
            # ...
        }).execute()
```

### [Performance Worker]

#### [performance_worker.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/workers/performance_worker.py)

- Change the database storage key from `section_advice` to `sectionAdvice` for consistency across all marketing modules.

```python
        # Store Result (around line 492)
        supabase.table("processed_reports").insert({
            # ...
            "sectionAdvice": ai_result.get("section_specific_advice", {}), # Changed from "section_advice"
            # ...
        }).execute()
```

## Verification Plan

### Manual Verification
1.  Trigger a new **SEO Report** generation.
2.  Inspect the "BNB Report" section in the frontend.
3.  Verify that the "Strategic Protocol" blocks (blue boxes) appear below the tables (Country, Activity, etc.).
4.  Repeat for a **Performance Report** to ensure its advice blocks also appear correctly.
