import asyncio
import time
from typing import List, Dict, Any
from google.ads.googleads.client import GoogleAdsClient
from app.supabase_client import supabase
from app.config import settings

async def get_google_ads_client(user_id: str) -> GoogleAdsClient:
    """Initialize the Google Ads Client using credentials from Supabase with retries."""
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            resp = supabase.table("user_credentials").select("credentials").eq("user_id", user_id).eq("platform", "google_oauth").single().execute()
            if not resp.data:
                raise Exception(f"No Google OAuth credentials found for user {user_id}")
            refresh_token = resp.data["credentials"]["refresh_token"]

            dev_resp = supabase.table("user_credentials").select("credentials").eq("user_id", user_id).eq("platform", "google_developer_token").single().execute()
            if not dev_resp.data:
                raise Exception("Google Ads Developer Token missing. Please set it in Agency Settings.")
            developer_token = dev_resp.data["credentials"]["developer_token"]

            credentials = {
                "developer_token": developer_token,
                "refresh_token": refresh_token,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "use_proto_plus": True
            }

            # This can trigger a token refresh which might fail due to network issues
            return GoogleAdsClient.load_from_dict(credentials)
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"!!! Error getting Google Ads client (attempt {attempt+1}): {e}. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
            else:
                print(f"!!! Failed to get Google Ads client after {max_retries} attempts.")
                raise e

async def _run_gaql_query(user_id: str, customer_id: str, query: str) -> List[Any]:
    """Execute a GAQL query using the official Google Ads library with retries."""
    customer_id = str(customer_id).replace("-", "").replace(" ", "").strip().strip("'").strip('"')
    print(f"[DEBUG GADS] Customer ID: {customer_id}")
    print(f"[DEBUG GADS] Query: {query.strip()}")

    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            client = await get_google_ads_client(user_id)
            ga_service = client.get_service("GoogleAdsService")

            def sync_search():
                response = ga_service.search(customer_id=customer_id, query=query)
                return [row for row in response]

            loop = asyncio.get_event_loop()
            rows = await loop.run_in_executor(None, sync_search)
            print(f"[DEBUG GADS] Rows returned: {len(rows)}")
            return rows
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"!!! Google Ads query failed (attempt {attempt+1}): {e}. Retrying...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
            else:
                print(f"!!! Google Ads query failed after {max_retries} attempts: {e}")
                raise e

async def fetch_google_ads_data(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    """Fetch daily aggregated metrics for the account."""
    query = f"""
        SELECT segments.date,
               metrics.impressions, metrics.clicks,
               metrics.cost_micros, metrics.conversions,
               metrics.interactions, metrics.ctr, metrics.average_cpm
        FROM customer
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "metrics": {
            "impressions": int(r.metrics.impressions or 0),
            "clicks": int(r.metrics.clicks or 0),
            "interactions": int(r.metrics.interactions or 0),
            "cost_micros": int(r.metrics.cost_micros or 0),
            "conversions": float(r.metrics.conversions or 0),
            "ctr": float(r.metrics.ctr or 0),
            "average_cpm": float(r.metrics.average_cpm or 0)
        },
        "segments": {"date": r.segments.date}
    } for r in rows]

async def fetch_google_ads_totals(user_id: str, customer_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
    """Fetch total aggregated metrics for the account (no date segmentation)."""
    # Try querying the 'customer' resource first (standard)
    query = f"""
        SELECT metrics.impressions, metrics.clicks,
               metrics.cost_micros, metrics.conversions,
               metrics.interactions, metrics.ctr
        FROM customer
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """

    rows = await _run_gaql_query(user_id, customer_id, query)

    if not rows:
        # Fallback: aggregate from 'campaign' resource if 'customer' view is empty/buggy
        print(f"[DEBUG GADS] 'customer' resource returned no rows for {customer_id}, trying 'campaign' fallback...")
        fb_query = f"""
            SELECT metrics.impressions, metrics.clicks,
                   metrics.cost_micros, metrics.conversions,
                   metrics.interactions
            FROM campaign
            WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        """
        rows = await _run_gaql_query(user_id, customer_id, fb_query)
        if not rows:
            return {
                "impressions": 0, "clicks": 0, "interactions": 0,
                "cost": 0, "conversions": 0, "ctr": 0, "cpm": 0, "cost_per_lead": 0
            }

        # Manual aggregation from campaign rows
        total_impr = sum(int(r.metrics.impressions or 0) for r in rows)
        total_clicks = sum(int(r.metrics.clicks or 0) for r in rows)
        total_cost_micros = sum(int(r.metrics.cost_micros or 0) for r in rows)
        total_conv = sum(float(r.metrics.conversions or 0) for r in rows)
        cost = total_cost_micros / 1_000_000

        return {
            "impressions": total_impr,
            "clicks": total_clicks,
            "interactions": sum(int(r.metrics.interactions or 0) for r in rows),
            "cost": round(cost, 2),
            "conversions": total_conv,
            "ctr": round((total_clicks / total_impr * 100), 2) if total_impr > 0 else 0,
            "cpm": round((cost / total_impr * 1000), 2) if total_impr > 0 else 0,
            "cost_per_lead": round(cost / total_conv, 2) if total_conv > 0 else 0
        }

    r = rows[0]
    cost = float(r.metrics.cost_micros or 0) / 1_000_000
    conversions = float(r.metrics.conversions or 0)
    return {
        "impressions": int(r.metrics.impressions or 0),
        "clicks": int(r.metrics.clicks or 0),
        "interactions": int(r.metrics.interactions or 0),
        "cost": round(cost, 2),
        "conversions": conversions,
        "ctr": round(float(r.metrics.ctr or 0) * 100, 2),
        "cpm": 0,
        "cost_per_lead": round(cost / conversions, 2) if conversions > 0 else 0
    }

async def fetch_google_ads_campaigns(user_id: str, customer_id: str, start_date: str, end_date: str, limit: int = 10) -> List[Dict]:
    query = f"""
        SELECT campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr, metrics.conversions, metrics.interactions
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY metrics.cost_micros DESC
        LIMIT {limit}
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "campaign": r.campaign.name,
        "status": r.campaign.status.name,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "interactions": r.metrics.interactions,
        "cost": r.metrics.cost_micros / 1_000_000,
        "ctr": r.metrics.ctr * 100,
        "conversions": r.metrics.conversions,
    } for r in rows]

async def fetch_google_ads_keywords(user_id: str, customer_id: str, start_date: str, end_date: str, limit: int = 20) -> List[Dict]:
    query = f"""
        SELECT ad_group_criterion.keyword.text, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr
        FROM keyword_view
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        AND ad_group_criterion.status = 'ENABLED'
        ORDER BY metrics.cost_micros DESC
        LIMIT {limit}
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "keyword": r.ad_group_criterion.keyword.text,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
        "ctr": r.metrics.ctr * 100,
    } for r in rows]

async def fetch_google_ads_search_terms(user_id: str, customer_id: str, start_date: str, end_date: str, limit: int = 20) -> List[Dict]:
    query = f"""
        SELECT search_term_view.search_term, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr
        FROM search_term_view
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY metrics.impressions DESC
        LIMIT {limit}
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "search_term": r.search_term_view.search_term,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
        "ctr": r.metrics.ctr * 100,
    } for r in rows]

async def fetch_google_ads_devices(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.device, metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    device_map = {}
    for r in rows:
        device = r.segments.device.name
        if device not in device_map:
            device_map[device] = {"impressions": 0, "clicks": 0, "cost": 0}
        device_map[device]["impressions"] += r.metrics.impressions
        device_map[device]["clicks"] += r.metrics.clicks
        device_map[device]["cost"] += r.metrics.cost_micros / 1_000_000
    return [{"device": k, **v} for k, v in device_map.items()]

async def fetch_google_ads_demographics(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    # Age range and Gender cannot be queried from 'campaign' view.
    # We query gender_view as a representative demographic proxy.
    query = f"""
        SELECT ad_group_criterion.gender.type, metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM gender_view
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "age_range": "ALL",
        "gender": r.ad_group_criterion.gender.type_.name,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
    } for r in rows]

async def fetch_google_ads_day_hour(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.day_of_week, segments.hour, metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "day_of_week": r.segments.day_of_week.name if r.segments.day_of_week else "N/A",
        "hour": r.segments.hour,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
    } for r in rows]

async def fetch_google_ads_networks(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.ad_network_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "network": r.segments.ad_network_type.name,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
        "ctr": r.metrics.ctr * 100,
    } for r in rows]

async def fetch_google_ads_assets(user_id: str, customer_id: str, start_date: str, end_date: str, limit: int = 10) -> List[Dict]:
    query = f"""
        SELECT ad_group_ad.ad.id, ad_group_ad.status, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.ctr
        FROM ad_group_ad
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY metrics.cost_micros DESC
        LIMIT {limit}
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "ad_id": r.ad_group_ad.ad.id,
        "status": r.ad_group_ad.status.name,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
        "ctr": r.metrics.ctr * 100,
    } for r in rows]

async def fetch_google_ads_devices_daily(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.date, segments.device,
               metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    daily = []
    for r in rows:
        daily.append({
            "date": r.segments.date,
            "device": r.segments.device.name,
            "impressions": r.metrics.impressions,
            "clicks": r.metrics.clicks,
            "cost": r.metrics.cost_micros / 1_000_000,
        })
    return daily

async def fetch_google_ads_demographics_daily(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.date, ad_group_criterion.gender.type,
               metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM gender_view
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "date": r.segments.date,
        "gender": r.ad_group_criterion.gender.type_.name,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
    } for r in rows]

async def fetch_google_ads_search_terms_daily(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.date, search_term_view.search_term,
               metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM search_term_view
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "date": r.segments.date,
        "search_term": r.search_term_view.search_term,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
    } for r in rows]

async def fetch_google_ads_campaigns_daily(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    query = f"""
        SELECT segments.date, campaign.name,
               metrics.impressions, metrics.clicks, metrics.cost_micros
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """
    rows = await _run_gaql_query(user_id, customer_id, query)
    return [{
        "date": r.segments.date,
        "campaign": r.campaign.name,
        "impressions": r.metrics.impressions,
        "clicks": r.metrics.clicks,
        "cost": r.metrics.cost_micros / 1_000_000,
    } for r in rows]

async def fetch_auction_insights(user_id: str, customer_id: str, start_date: str, end_date: str) -> List[Dict]:
    """
    Fetch Auction Insights – often restricted. Return empty list to avoid errors.
    """
    # Many Google Ads accounts don't have access to Auction Insights.
    # Instead of breaking the report, we return no data.
    return []
