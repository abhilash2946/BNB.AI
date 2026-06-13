import httpx
import asyncio
from typing import Dict, Any, List
import urllib.parse
from app.services.google_auth import get_access_token_from_refresh

async def get_gsc_token(user_id: str) -> str:
    return await get_access_token_from_refresh(user_id, ["https://www.googleapis.com/auth/webmasters.readonly"])

async def _post_gsc(url: str, access_token: str, body: dict, retries: int = 3) -> dict:
    """Helper to handle GSC API calls with retries for transient network errors."""
    for attempt in range(retries):
        try:
            # Force HTTP/1.1 for stability as RemoteProtocolError often occurs with HTTP/2 or keep-alive issues
            async with httpx.AsyncClient(http2=False) as client:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    json=body,
                    timeout=60.0
                )
                if resp.status_code == 200:
                    return resp.json()

                # Retry on rate limits or server-side errors
                if resp.status_code in {429, 500, 502, 503, 504}:
                    print(f"!!! GSC API returned {resp.status_code}, retrying (attempt {attempt+1})...")
                    await asyncio.sleep(1 * (attempt + 1))
                    continue

                print(f"!!! GSC API fatal error {resp.status_code}: {resp.text[:500]}")
                resp.raise_for_status()
        except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as e:
            print(f"!!! GSC Network Error: {type(e).__name__}: {e}, retrying (attempt {attempt+1})...")
            if attempt == retries - 1:
                raise
            await asyncio.sleep(1 * (attempt + 1))
    return {}

async def fetch_gsc_aggregates(site_url: str, access_token: str, start_date: str, end_date: str) -> dict:
    encoded_url = urllib.parse.quote_plus(site_url)
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded_url}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": [],   # no dimension -> single row aggregate
        "rowLimit": 1
    }
    data = await _post_gsc(url, access_token, body)
    rows = data.get("rows", [])
    if not rows:
        return {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}
    row = rows[0]
    return {
        "clicks": row["clicks"],
        "impressions": row["impressions"],
        "ctr": row["ctr"],
        "position": row["position"]
    }

async def fetch_gsc_daily(site_url: str, access_token: str, start_date: str, end_date: str) -> list:
    encoded_url = urllib.parse.quote_plus(site_url)
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded_url}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["date"],
        "rowLimit": 31
    }
    data = await _post_gsc(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {"date": row["keys"][0], "clicks": row["clicks"], "impressions": row["impressions"], "ctr": row["ctr"], "position": row["position"]}
        for row in rows
    ]

async def fetch_gsc_keywords(site_url: str, access_token: str, start_date: str, end_date: str, limit: int = 100) -> list:
    encoded_url = urllib.parse.quote_plus(site_url)
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded_url}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["query"],
        "rowLimit": limit
    }
    data = await _post_gsc(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {"keyword": row["keys"][0], "clicks": row["clicks"], "impressions": row["impressions"], "ctr": row["ctr"], "position": row["position"]}
        for row in rows
    ]

async def fetch_gsc_pages(site_url: str, access_token: str, start_date: str, end_date: str, limit: int = 500) -> list:
    encoded_url = urllib.parse.quote_plus(site_url)
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded_url}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": ["page"],
        "rowLimit": limit
    }
    data = await _post_gsc(url, access_token, body)
    rows = data.get("rows", [])
    return [row["keys"][0] for row in rows]

# The worker expects a list of page strings for detect_new_posts and detect_internal_links
# However, the worker currently does: [p["page"] for p in top_landing] for internal links
# And detect_new_posts expects: current_gsc_pages, prev_gsc_pages
# Let's check seo_worker.py's usage of fetch_gsc_pages
