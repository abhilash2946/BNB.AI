import httpx
import json
from typing import List, Dict, Any

async def fetch_meta_ads_aggregate(ad_account_id: str, access_token: str, start_date: str, end_date: str) -> Dict[str, Any]:
    """Fetch aggregated metrics for the entire ad account."""
    clean_id = ad_account_id.strip()
    if clean_id.lower().startswith("act_"):
        clean_id = clean_id[4:]

    url = f"https://graph.facebook.com/v20.0/act_{clean_id}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    params = {
        "access_token": access_token,
        "fields": "impressions,clicks,spend,reach,actions,action_values,cpc,ctr",
        "time_range": time_range,
        "level": "account",
        "limit": 1
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            print(f"!!! Meta Aggregate Error: {resp.status_code} - {resp.text}")
            resp.raise_for_status()

        data_list = resp.json().get("data", [])
        if not data_list:
            print(f"---> Meta Aggregate: No data returned for {start_date} to {end_date}")
            return {
                "impressions": 0, "clicks": 0, "spend": 0, "reach": 0,
                "leads": 0, "conversions": 0, "cpc": 0, "ctr": 0, "revenue": 0, "roas": 0
            }
        data = data_list[0]
        actions = data.get("actions", [])
        action_values = data.get("action_values", [])

        leads = sum(int(a.get("value") or 0) for a in actions if a.get("action_type") == "lead")
        # Revenue from purchase or conversion value
        revenue = sum(float(av.get("value") or 0) for av in action_values if av.get("action_type") in ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"])

        spend = float(data.get("spend") or 0)
        roas = (revenue / spend) if spend > 0 else 0

        return {
            "impressions": int(data.get("impressions") or 0),
            "clicks": int(data.get("clicks") or 0),
            "spend": spend,
            "reach": int(data.get("reach") or 0),
            "leads": leads,
            "conversions": leads, # Alias for consistency
            "revenue": revenue,
            "roas": round(roas, 2),
            "cpc": float(data.get("cpc") or 0),
            "ctr": float(data.get("ctr") or 0) * 100,
        }

async def fetch_meta_ads_campaigns(ad_account_id: str, access_token: str, start_date: str, end_date: str, limit: int = 10) -> List[Dict]:
    """Fetch top campaigns with status and interactions."""
    clean_id = ad_account_id.strip()
    if clean_id.lower().startswith("act_"):
        clean_id = clean_id[4:]

    # Step 1: Fetch campaign metadata (effective_status)
    meta_url = f"https://graph.facebook.com/v20.0/act_{clean_id}/campaigns"
    meta_params = {
        "access_token": access_token,
        "fields": "id,name,effective_status",
        "limit": 100
    }

    async with httpx.AsyncClient() as client:
        meta_resp = await client.get(meta_url, params=meta_params)
        if meta_resp.status_code != 200:
            print(f"!!! Meta Campaigns Metadata Error: {meta_resp.status_code} - {meta_resp.text}")
            meta_resp.raise_for_status()

        campaign_meta = {c["id"]: c for c in meta_resp.json().get("data", [])}

        # Step 2: Fetch insights for these campaigns
        insights_url = f"https://graph.facebook.com/v20.0/act_{clean_id}/insights"
        time_range = json.dumps({"since": start_date, "until": end_date})
        insights_params = {
            "access_token": access_token,
            "fields": "campaign_id,campaign_name,impressions,clicks,spend,reach,actions,action_values,cpc,ctr",
            "time_range": time_range,
            "level": "campaign",
            "limit": 100
        }

        ins_resp = await client.get(insights_url, params=insights_params)
        if ins_resp.status_code != 200:
            print(f"!!! Meta Campaigns Insights Error: {ins_resp.status_code} - {ins_resp.text}")
            ins_resp.raise_for_status()

        rows = ins_resp.json().get("data", [])
        if not rows:
             print(f"---> Meta Campaigns: No insight data returned for {start_date} to {end_date}")

        # Sort by spend descending and limit
        sorted_rows = sorted(rows, key=lambda x: float(x.get("spend") or 0), reverse=True)[:limit]

        def get_actions_value(row, action_type):
            actions = row.get("actions", [])
            return sum(int(a.get("value") or 0) for a in actions if a.get("action_type") == action_type)

        def get_revenue_value(row):
            action_values = row.get("action_values", [])
            return sum(float(av.get("value") or 0) for av in action_values if av.get("action_type") in ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"])

        return [{
            "campaign": row.get("campaign_name", "Unknown"),
            "status": campaign_meta.get(row.get("campaign_id"), {}).get("effective_status", "N/A"),
            "impressions": int(row.get("impressions") or 0),
            "clicks": int(row.get("clicks") or 0),
            "interactions": get_actions_value(row, "post_engagement") or get_actions_value(row, "link_click"),
            "spend": float(row.get("spend") or 0),
            "cost": float(row.get("spend") or 0),
            "reach": int(row.get("reach") or 0),
            "leads": get_actions_value(row, "lead"),
            "revenue": get_revenue_value(row),
            "roas": round(get_revenue_value(row) / float(row.get("spend") or 1), 2) if float(row.get("spend") or 0) > 0 else 0,
            "costPerLead": float(row.get("spend") or 0) / get_actions_value(row, "lead") if get_actions_value(row, "lead") > 0 else 0,
            "cpc": float(row.get("cpc") or 0),
            "ctr": float(row.get("ctr") or 0) * 100,
        } for row in sorted_rows]

async def fetch_meta_ads_daily(ad_account_id: str, access_token: str, start_date: str, end_date: str) -> List[Dict]:
    """Fetch daily time-series data (impressions, spend, clicks)."""
    clean_id = ad_account_id.strip()
    if clean_id.lower().startswith("act_"):
        clean_id = clean_id[4:]

    url = f"https://graph.facebook.com/v20.0/act_{clean_id}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    params = {
        "access_token": access_token,
        "fields": "date_start,impressions,clicks,spend",
        "time_range": time_range,
        "level": "account",
        "time_increment": 1,
        "limit": 100
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            print(f"!!! Meta Daily Error: {resp.status_code} - {resp.text}")
            resp.raise_for_status()

        rows = resp.json().get("data", [])
        if not rows:
             print(f"---> Meta Daily: No data returned for {start_date} to {end_date}")
        return [{
            "date": row["date_start"],
            "impressions": int(row.get("impressions") or 0),
            "clicks": int(row.get("clicks") or 0),
            "spend": float(row.get("spend") or 0),
        } for row in rows]

async def fetch_meta_ads_adsets(ad_account_id: str, access_token: str, start_date: str, end_date: str, limit: int = 10) -> List[Dict]:
    """Fetch top adsets (similar to keywords/targeting) by spend."""
    clean_id = ad_account_id.strip()
    if clean_id.lower().startswith("act_"):
        clean_id = clean_id[4:]

    url = f"https://graph.facebook.com/v20.0/act_{clean_id}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    params = {
        "access_token": access_token,
        "fields": "adset_name,impressions,clicks,spend,actions,ctr",
        "time_range": time_range,
        "level": "adset",
        "limit": 50
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            print(f"!!! Meta Adsets Error: {resp.status_code} - {resp.text}")
            return []

        rows = resp.json().get("data", [])
        if not rows:
             print(f"---> Meta Adsets: No data returned for {start_date} to {end_date}")

        sorted_rows = sorted(rows, key=lambda x: float(x.get("spend") or 0), reverse=True)[:limit]

        def get_leads(row):
            actions = row.get("actions", [])
            return sum(int(a.get("value") or 0) for a in actions if a.get("action_type") == "lead")

        return [{
            "adset": row.get("adset_name", "Unknown"),
            "impressions": int(row.get("impressions") or 0),
            "clicks": int(row.get("clicks") or 0),
            "spend": float(row.get("spend") or 0),
            "leads": get_leads(row),
            "ctr": float(row.get("ctr") or 0) * 100,
        } for row in sorted_rows]

async def fetch_meta_ads_devices(ad_account_id: str, access_token: str, start_date: str, end_date: str) -> List[Dict]:
    """Fetch breakdown by device (impression_device)."""
    clean_id = ad_account_id.strip()
    if clean_id.lower().startswith("act_"):
        clean_id = clean_id[4:]

    url = f"https://graph.facebook.com/v20.0/act_{clean_id}/insights"
    time_range = json.dumps({"since": start_date, "until": end_date})
    params = {
        "access_token": access_token,
        "fields": "impressions,clicks,spend",
        "time_range": time_range,
        "breakdowns": "impression_device",
        "level": "account"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            print(f"!!! Meta Devices Error: {resp.status_code} - {resp.text}")
            return []

        rows = resp.json().get("data", [])
        if not rows:
             print(f"---> Meta Devices: No data returned for {start_date} to {end_date}")
        return [{
            "device": row.get("impression_device", "Other"),
            "impressions": int(row.get("impressions") or 0),
            "clicks": int(row.get("clicks") or 0),
            "spend": float(row.get("spend") or 0),
        } for row in rows]
