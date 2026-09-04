import httpx
from typing import Dict, Any, List
from app.services.google_auth import get_access_token_from_refresh

async def get_gbp_token(user_id: str) -> str:
    return await get_access_token_from_refresh(user_id, ["https://www.googleapis.com/auth/business.manage"])

async def fetch_gbp_metrics(location_id: str, access_token: str, start_date: str, end_date: str) -> dict:
    """
    Fetches performance metrics from Google Business Profile Performance API.
    Ref: https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries
    """
    if not location_id:
        return {}

    url = f"https://businessprofileperformance.googleapis.com/v1/locations/{location_id}:fetchMultiDailyMetricsTimeSeries"

    # Converting dates to yyyy-mm-dd if they are in yyyymmdd format
    def format_date(d):
        if len(d) == 8: return f"{d[:4]}-{d[4:6]}-{d[6:]}"
        return d

    start = format_date(start_date)
    end = format_date(end_date)

    # Metrics to fetch
    metrics = [
        "BUSINESS_CALLS",
        "BUSINESS_DIRECTION_REQUESTS",
        "BUSINESS_BOOKINGS",
        "BUSINESS_WEBSITE_CLICKS"
    ]

    body = {
        "dailyMetrics": metrics,
        "dailyRange": {
            "startDate": {"year": int(start[:4]), "month": int(start[5:7]), "day": int(start[8:])},
            "endDate": {"year": int(end[:4]), "month": int(end[5:7]), "day": int(end[8:])}
        }
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                json=body,
                timeout=60.0
            )
            if resp.status_code != 200:
                print(f"!!! GBP API Error: {resp.status_code} - {resp.text}")
                return {}

            data = resp.json()
            return process_gbp_response(data)
    except Exception as e:
        print(f"!!! GBP Fetch Exception: {e}")
        return {}

def process_gbp_response(data: dict) -> dict:
    """
    Processes the raw GBP API response into a more usable format for the frontend.
    """
    multi_time_series = data.get("multiDailyMetricTimeSeries", [])

    aggregated = {
        "calls": 0,
        "directions": 0,
        "bookings": 0,
        "website_clicks": 0,
        "total_interactions": 0
    }

    daily_data = {} # date -> {calls, directions, bookings, website_clicks}

    metric_map = {
        "BUSINESS_CALLS": "calls",
        "BUSINESS_DIRECTION_REQUESTS": "directions",
        "BUSINESS_BOOKINGS": "bookings",
        "BUSINESS_WEBSITE_CLICKS": "website_clicks"
    }

    for series in multi_time_series:
        metric_name = series.get("dailyMetric")
        short_name = metric_map.get(metric_name)
        if not short_name: continue

        time_series = series.get("dailyMetricTimeSeries", {}).get("dailyValues", [])
        for val in time_series:
            date_obj = val.get("date", {})
            date_str = f"{date_obj.get('year')}-{date_obj.get('month'):02d}-{date_obj.get('day'):02d}"
            count = int(val.get("value", 0))

            aggregated[short_name] += count
            aggregated["total_interactions"] += count

            if date_str not in daily_data:
                daily_data[date_str] = {"date": date_str, "calls": 0, "directions": 0, "bookings": 0, "website_clicks": 0}

            daily_data[date_str][short_name] = count

    return {
        "aggregated": aggregated,
        "daily": sorted(daily_data.values(), key=lambda x: x["date"])
    }
