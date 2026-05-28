import httpx
from typing import List, Dict, Any
from app.services.google_auth import get_access_token_from_refresh

async def get_google_ads_token(user_id: str) -> str:
    # The OAuth token for Google Ads uses the same refresh token but with adwords scope
    return await get_access_token_from_refresh(user_id, ["https://www.googleapis.com/auth/adwords"])

async def fetch_google_ads_data(customer_id: str, access_token: str, developer_token: str, start_date: str, end_date: str) -> List[Dict]:
    all_results = []
    page_token = None
    while True:
        query = f"""
            SELECT campaign.name, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
            FROM campaign
            WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        """
        body = {"query": query, "pageSize": 1000}
        if page_token:
            body["pageToken"] = page_token
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:search",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "developer-token": developer_token,
                },
                json=body,
                timeout=60.0,
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            all_results.extend(results)
            page_token = data.get("nextPageToken")
            if not page_token:
                break
    return all_results
