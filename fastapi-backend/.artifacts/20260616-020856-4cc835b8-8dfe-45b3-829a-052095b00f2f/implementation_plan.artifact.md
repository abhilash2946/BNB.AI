# Fix Competitor Data Synchronization and Freshness

The user reported that the frontend only shows a subset of competitors (the cached ones), while some are skipped and others might be missing. The goal is to ensure the "Competitor Deep Dive" shows a comprehensive, current, and accurate list of competitors by merging historical data with fresh discovery and ensuring all data is up-to-date.

## User Review Required

> [!IMPORTANT]
> I will be merging all historically discovered competitors for a site with the ones found in the current search. This means the list of competitors will grow over time as more are discovered. Does this align with the "real, current, and accurate" requirement, or should we strictly only show what search engines currently return?

## Proposed Changes

### Backend (SEO Worker)

#### [seo_worker.py](file:///D:/BNB fast/fastapi-backend/app/workers/seo_worker.py)

- **Merge Competitor Sources**: Combine competitors found via OpenSERP with competitors already stored in `competitor_insights` for the given `site_id`.
- **Force Freshness**: If a competitor's data is older than 7 days, or if it has no `full_text` (perhaps from a previous failed extraction), attempt a fresh extraction.
- **Improved Logging**: Clarify logs to distinguish between "Found in Search", "Loaded from History", and "Freshly Analyzed".

```python
            # 1. Gather all potential competitor domains
            competitor_domains = set()

            # Source A: Search (OpenSERP)
            for kw in keywords:
                # ... (existing OpenSERP logic) ...
                # Add to competitor_domains

            # Source B: History (Existing in DB)
            history = supabase.table("competitor_insights").select("competitor_url").eq("site_id", site_id).execute()
            if history.data:
                for item in history.data:
                    d = item["competitor_url"].replace("https://", "").replace("http://", "").split('/')[0]
                    competitor_domains.add(d)

            # 2. Process each domain
            for domain in competitor_domains:
                url = f"https://{domain}"
                cached = supabase.table("competitor_insights").select("*").eq("site_id", site_id).eq("competitor_url", url).maybe_single().execute()

                is_stale = True
                if cached.data and cached.data.get("extracted_at"):
                    last = datetime.fromisoformat(cached.data["extracted_at"].replace('Z', '+00:00'))
                    if last > datetime.now(timezone.utc) - timedelta(days=7):
                        is_stale = False

                if not is_stale and cached.data.get("full_text"):
                    # Use Cache
                    competitor_insights.append({ ... })
                else:
                    # Fresh Extraction
                    content = await extract_with_webclaw(url)
                    if content:
                        # Analyze and Store
                        # ...
                    elif cached.data:
                        # Fallback to old cache if fresh failed, but log it
                        competitor_insights.append({ ... })
```

## Verification Plan

### Automated Tests
- I will trigger a mock SEO report generation (or use a script to call the worker logic) and verify the `competitor_insights` list contains both historical and new entries.
- Command: `python -m app.workers.seo_worker` (I will create a small test script if needed).

### Manual Verification
- Check logs for "Loaded from History" and "Freshly Analyzed".
- Verify the "Discovered" count in logs matches the total number of competitors shown in the UI.
- Verify that stale competitors (older than 7 days) trigger a fresh extraction.
