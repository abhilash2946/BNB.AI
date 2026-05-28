import httpx
from typing import Dict, Any, List
import urllib.parse
from app.services.google_auth import get_access_token_from_refresh

async def get_gsc_token(user_id: str) -> str:
    return await get_access_token_from_refresh(user_id, ["https://www.googleapis.com/auth/webmasters.readonly"])

async def fetch_gsc_aggregates(site_url: str, access_token: str, start_date: str, end_date: str) -> dict:
    encoded_url = urllib.parse.quote_plus(site_url)
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded_url}/searchAnalytics/query"
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": [],   # no dimension -> single row aggregate
        "rowLimit": 1
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers={"Authorization": f"Bearer {access_token}"}, json=body, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
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
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers={"Authorization": f"Bearer {access_token}"}, json=body, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
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
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers={"Authorization": f"Bearer {access_token}"}, json=body, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
        rows = data.get("rows", [])
        return [
            {"keyword": row["keys"][0], "clicks": row["clicks"], "impressions": row["impressions"], "ctr": row["ctr"], "position": row["position"]}
            for row in rows
        ]
