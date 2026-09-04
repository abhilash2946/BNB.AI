import httpx
import asyncio
from typing import Dict, Any, List
from app.services.google_auth import get_access_token_from_refresh

async def get_ga4_token(user_id: str) -> str:
    return await get_access_token_from_refresh(user_id, ["https://www.googleapis.com/auth/analytics.readonly"])

async def _post_ga4(url: str, access_token: str, body: dict, retries: int = 3) -> dict:
    """Helper to handle GA4 API calls with retries for transient network errors."""
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(http2=False) as client: # Force HTTP/1.1 for stability
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    json=body,
                    timeout=60.0
                )
                if resp.status_code == 200:
                    return resp.json()

                # If we get a rate limit or server error, retry
                if resp.status_code in {429, 500, 502, 503, 504}:
                    error_detail = resp.text[:200]
                    print(f"!!! GA4 API returned {resp.status_code}, retrying (attempt {attempt+1})... Error: {error_detail}")
                    await asyncio.sleep(1 * (attempt + 1))
                    continue

                print(f"!!! GA4 API fatal error {resp.status_code}: {resp.text[:500]}")
                resp.raise_for_status()
        except (httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError) as e:
            print(f"!!! GA4 Network Error: {e}, retrying (attempt {attempt+1})...")
            if attempt == retries - 1:
                raise
            await asyncio.sleep(1 * (attempt + 1))
    return {}

async def fetch_ga4_totals(property_id: str, access_token: str, start_date: str, end_date: str, prev_start: str, prev_end: str) -> dict:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [
            {"startDate": start_date, "endDate": end_date},
            {"startDate": prev_start, "endDate": prev_end}
        ],
        "metrics": [
            {"name": "totalUsers"},
            {"name": "newUsers"},
            {"name": "averageSessionDuration"},
            {"name": "eventCount"},
            {"name": "sessions"},
            {"name": "bounceRate"}
        ],
        "dimensions": []
    }

    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    if len(rows) == 0:
        return {}

    current_vals = rows[0]["metricValues"]
    prev_vals = rows[1]["metricValues"] if len(rows) > 1 else [{"value": "0"} for _ in current_vals]

    result = {}
    metrics_list = ["totalUsers", "newUsers", "averageSessionDuration", "eventCount", "sessions", "bounceRate"]
    for i, metric in enumerate(metrics_list):
        cur = float(current_vals[i]["value"])
        prev = float(prev_vals[i]["value"])
        change = ((cur - prev) / prev * 100) if prev else 0
        result[metric] = {
            "current": cur,
            "previous": prev,
            "change_percent": round(change, 1)
        }
    return result

async def fetch_ga4_landing_pages(property_id: str, access_token: str, start_date: str, end_date: str, limit: int = 10) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "sessions"}, {"name": "bounceRate"}],
        "dimensions": [{"name": "landingPage"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": limit
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {
            "page": row["dimensionValues"][0]["value"],
            "sessions": int(row["metricValues"][0]["value"]),
            "bounceRate": float(row["metricValues"][1]["value"])
        }
        for row in rows
    ]

async def fetch_ga4_geography(property_id: str, access_token: str, start_date: str, end_date: str) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "activeUsers"}],
        "dimensions": [{"name": "country"}, {"name": "city"}],
        "limit": 50
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {"country": row["dimensionValues"][0]["value"], "city": row["dimensionValues"][1]["value"], "users": int(row["metricValues"][0]["value"])}
        for row in rows
    ]

async def fetch_ga4_daily_users(property_id: str, access_token: str, start_date: str, end_date: str) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "totalUsers"}, {"name": "newUsers"}],
        "dimensions": [{"name": "date"}],
        "orderBys": [{"dimension": {"dimensionName": "date"}}]
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {
            "date": row["dimensionValues"][0]["value"],
            "users": int(row["metricValues"][0]["value"]),
            "newUsers": int(row["metricValues"][1]["value"])
        }
        for row in rows
    ]

async def fetch_ga4_page_titles(property_id: str, access_token: str, start_date: str, end_date: str, limit: int = 10) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "screenPageViews"}],
        "dimensions": [{"name": "pageTitle"}],
        "orderBys": [{"metric": {"metricName": "screenPageViews"}, "desc": True}],
        "limit": limit
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {"title": row["dimensionValues"][0]["value"], "views": int(row["metricValues"][0]["value"])}
        for row in rows
    ]

async def fetch_ga4_sessions_by_channel(property_id: str, access_token: str, start_date: str, end_date: str, limit: int = 12) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "sessions"}],
        "dimensions": [{"name": "sessionDefaultChannelGroup"}],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": limit
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {
            "channel": row["dimensionValues"][0]["value"] or "Unassigned",
            "sessions": int(row["metricValues"][0]["value"])
        }
        for row in rows
    ]

async def fetch_ga4_events_by_event_name(property_id: str, access_token: str, start_date: str, end_date: str, limit: int = 12) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "eventCount"}],
        "dimensions": [{"name": "eventName"}],
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": limit
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {
            "eventName": row["dimensionValues"][0]["value"] or "unknown_event",
            "count": int(row["metricValues"][0]["value"])
        }
        for row in rows
    ]

async def fetch_ga4_key_events_by_platform(property_id: str, access_token: str, start_date: str, end_date: str) -> list:
    url = f"https://analyticsdata.googleapis.com/v1beta/properties/{property_id}:runReport"
    body = {
        "dateRanges": [{"startDate": start_date, "endDate": end_date}],
        "metrics": [{"name": "eventCount"}],
        "dimensions": [{"name": "platform"}],
        "orderBys": [{"metric": {"metricName": "eventCount"}, "desc": True}],
        "limit": 10
    }
    data = await _post_ga4(url, access_token, body)
    rows = data.get("rows", [])
    return [
        {
            "platform": row["dimensionValues"][0]["value"] or "web",
            "keyEvents": int(float(row["metricValues"][0]["value"]))
        }
        for row in rows
    ]
