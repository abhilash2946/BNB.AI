import httpx
from typing import List, Dict, Any
import json

async def fetch_meta_insights(ad_account_id: str, access_token: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    all_data = []
    # Note: Using act_{ad_account_id} for Meta API
    url = f"https://graph.facebook.com/v19.0/act_{ad_account_id}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    params = {
        "access_token": access_token,
        "fields": "impressions,clicks,spend",
        "time_range": time_range,
        "level": "campaign",
        "limit": 100
    }

    async with httpx.AsyncClient() as client:
        while url:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            all_data.extend(data.get("data", []))
            url = data.get("paging", {}).get("next")
            # After first request, params are already in the 'next' URL
            params = {}

    return all_data
