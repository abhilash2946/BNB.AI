from app.supabase_client import supabase
from app.services.google_ads import get_google_ads_token, fetch_google_ads_data
from app.services.meta_ads import fetch_meta_insights
from app.services.gemini import call_gemini
from app.utils.date_utils import compute_previous_period
from datetime import datetime, timezone
import asyncio
import uuid

async def run_performance_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str):
    print(f"---> Background Task Started for Performance report {report_id}")
    supabase.table("report_status").update({"status": "fetching_data"}).eq("report_id", report_id).execute()

    try:
        # 2. Fetch site credentials for google_ads and meta_ads
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["google_ads", "meta_ads"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data}
        google_creds = creds_map.get("google_ads")
        meta_creds = creds_map.get("meta_ads")
        if not google_creds or not meta_creds:
            raise Exception("Missing Google Ads or Meta Ads configuration for site")

        # 3. Fetch Agency-level credentials (Service Account & Developer Token)
        agency_creds_resp = supabase.table("user_credentials").select("platform, credentials").eq("user_id", user_id).in_("platform", ["google_developer_token"]).execute()
        agency_map = {row["platform"]: row["credentials"] for row in agency_creds_resp.data}

        developer_token = agency_map.get("google_developer_token", {}).get("developer_token")
        if not developer_token:
            # Fallback check if it was stored directly
            developer_token = agency_map.get("google_developer_token") if isinstance(agency_map.get("google_developer_token"), str) else None

        if not developer_token:
            raise Exception("Google Ads Developer Token missing in Agency settings")

        # 4. Compute previous period
        prev_start, prev_end = compute_previous_period(start_date, end_date)

        # 5. Fetch Google Ads data
        print("---> Fetching Google Ads metrics...")
        ga_token = await get_google_ads_token(user_id)
        ga_customer_id = google_creds.get("customer_id")
        if not ga_customer_id:
            raise Exception("Google Ads Customer ID missing in site credentials")

        google_current = await fetch_google_ads_data(ga_customer_id, ga_token, developer_token, start_date, end_date)
        google_previous = await fetch_google_ads_data(ga_customer_id, ga_token, developer_token, prev_start, prev_end)

        # 6. Fetch Meta Ads data
        print("---> Fetching Meta Ads metrics...")
        meta_current = await fetch_meta_insights(meta_creds["ad_account_id"], meta_creds["access_token"], start_date, end_date)
        meta_previous = await fetch_meta_insights(meta_creds["ad_account_id"], meta_creds["access_token"], prev_start, prev_end)

        # 7. Aggregate metrics
        print("---> Aggregating performance metrics...")
        supabase.table("report_status").update({"status": "processing"}).eq("report_id", report_id).execute()

        def sum_google_metrics(data):
            impressions = sum(row.get("metrics", {}).get("impressions", 0) for row in data)
            clicks = sum(row.get("metrics", {}).get("clicks", 0) for row in data)
            cost = sum(row.get("metrics", {}).get("cost_micros", 0) for row in data) / 1_000_000
            conversions = sum(row.get("metrics", {}).get("conversions", 0) for row in data)
            return {"impressions": impressions, "clicks": clicks, "cost": cost, "conversions": conversions}

        cur = sum_google_metrics(google_current)
        prev = sum_google_metrics(google_previous)
        spend_cur = cur["cost"]
        spend_prev = prev["cost"]
        change = ((spend_cur - spend_prev) / spend_prev * 100) if spend_prev else 0

        meta_impressions_cur = sum(int(row.get("impressions", 0)) for row in meta_current)
        meta_impressions_prev = sum(int(row.get("impressions", 0)) for row in meta_previous)

        # 8. Build daily chart data from Google Ads
        daily = {}
        for row in google_current:
            date = row.get("segments", {}).get("date")
            if date:
                daily.setdefault(date, {"spend": 0, "impressions": 0, "clicks": 0})
                daily[date]["spend"] += row.get("metrics", {}).get("cost_micros", 0) / 1_000_000
                daily[date]["impressions"] += row.get("metrics", {}).get("impressions", 0)
                daily[date]["clicks"] += row.get("metrics", {}).get("clicks", 0)
        chart_data = [
            {"label": date, "valueA": data["spend"], "valueB": data["impressions"], "valueC": data["clicks"]}
            for date, data in sorted(daily.items())[:30]
        ]

        # 9. Call Gemini
        prompt = f"""Generate a performance marketing report for a campaign with ${spend_cur:.2f} spend and {meta_impressions_cur} Meta impressions.

        Return ONLY valid JSON with exactly these keys:
        {{
            "summary": "2-3 sentences summarizing the performance and ROI trend",
            "insights": ["insight 1", "insight 2"],
            "recommendations": [
                {{
                    "title": "Short title",
                    "description": "Actionable advice",
                    "impact": "High/Medium/Low",
                    "effort": "High/Medium/Low"
                }}
            ],
            "top_keywords_overview": "Brief explanation of performance drivers",
            "table_explanations": {{
                "kpi_overview": "Explanation of the spend and impression metrics"
            }}
        }}"""
        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()
        ai_result = await call_gemini(prompt)

        # 10. Store processed report
        supabase.table("processed_reports").insert({
            "report_id": report_id,
            "user_id": user_id,
            "site_id": site_id,
            "module": "performance",
            "start_date": start_date,
            "end_date": end_date,
            "kpi_summary": {
                "ad_spend": {"current": spend_cur, "previous": spend_prev, "change_percent": f"{change:.1f}"},
                "meta_impressions": {"current": meta_impressions_cur, "previous": meta_impressions_prev},
            },
            "chart_datasets": chart_data,
            "ai_summary": ai_result.get("summary"),
            "ai_insights": ai_result.get("insights", []),
            "ai_recommendations": ai_result.get("recommendations", []),
        }).execute()

        # 11. Update status to completed
        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()

    except Exception as e:
        supabase.table("report_status").update({"status": "failed", "error_message": str(e)}).eq("report_id", report_id).execute()
