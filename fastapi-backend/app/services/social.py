import httpx
from typing import List, Dict, Any

async def fetch_fb_insights(page_id: str, access_token: str, since: str, until: str) -> List[Dict[str, Any]]:
    all_data = []
    url = f"https://graph.facebook.com/v19.0/{page_id}/insights?metric=page_impressions,page_engaged_users&period=day&since={since}&until={until}&limit=100"

    async with httpx.AsyncClient() as client:
        while url:
            resp = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
            resp.raise_for_status()
            data = resp.json()
            all_data.extend(data.get("data", []))
            url = data.get("paging", {}).get("next")

    return all_data

async def fetch_ig_insights(ig_id: str, access_token: str, since: str, until: str) -> List[Dict[str, Any]]:
    all_data = []
    url = f"https://graph.facebook.com/v19.0/{ig_id}/insights?metric=impressions,reach&period=day&since={since}&until={until}&limit=100"

    async with httpx.AsyncClient() as client:
        while url:
            resp = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
            resp.raise_for_status()
            data = resp.json()
            all_data.extend(data.get("data", []))
            url = data.get("paging", {}).get("next")

    return all_data
