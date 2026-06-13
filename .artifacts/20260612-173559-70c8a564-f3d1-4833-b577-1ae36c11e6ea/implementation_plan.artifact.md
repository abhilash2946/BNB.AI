# Fix Meta Ads Data Fetching and Visibility

The user reports that Meta Ads data is being fetched (backend logs show success) but shows nothing in the UI (all zeros and empty tables). Research indicates that the backend is receiving empty data from the Meta Ads API, possibly due to an underlying error that is being swallowed or a mismatch in the requested data.

## Proposed Changes

### Backend Services

#### [meta_ads.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/services/meta_ads.py)

- Add detailed logging of the requested URL and the raw API response when it's empty or errors.
- Fix sorting logic to be safer against `None` values.
- Ensure all calls check for `resp.status_code != 200` and raise exceptions with descriptive messages.
- Correct the log message in `fetch_meta_ads_adsets` which incorrectly says "Meta Devices Error".

#### [performance_worker.py](file:///D:/BNB%20fast%20new/fastapi-backend/app/workers/performance_worker.py)

- Fix the bug in error handling where exceptions in Meta tasks were being swallowed and replaced with empty dicts without logging the actual error.
- Correct the logic to check `m_res_raw` for exceptions instead of `m_results` (which has already been mapped to `None`).

### Backend Models/Utils (Optional)

- Investigate if `meta_ads_kpi` mapping in `performance_worker.py` needs more robust fallback for missing keys like `cost_per_lead`.

## Verification Plan

### Automated Tests
- I'll add a temporary test script to call the Meta Ads service functions directly with a mock/test token if possible, or just rely on manual verification by checking logs.
- Run `uvicorn app.main:app --reload` and trigger a report generation, then check the console output for the new detailed logs.

### Manual Verification
- Trigger a Performance Report for a site with Meta Ads enabled.
- Verify in the logs that the Meta Ads API URL is correct and the response is being handled.
- Check if the "Data Fetch Success" message now reflects actual data if found, or provides a clear error if not.
