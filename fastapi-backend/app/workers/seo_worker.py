from app.supabase_client import supabase
from app.services.ga4 import (
    get_ga4_token,
    fetch_ga4_totals,
    fetch_ga4_landing_pages,
    fetch_ga4_geography,
    fetch_ga4_daily_users,
    fetch_ga4_page_titles,
    fetch_ga4_sessions_by_channel,
    fetch_ga4_events_by_event_name,
    fetch_ga4_key_events_by_platform,
)
from app.services.gsc import get_gsc_token, fetch_gsc_aggregates, fetch_gsc_daily, fetch_gsc_keywords
from app.services.pagespeed import fetch_core_web_vitals
from app.services.gemini import call_gemini
from app.utils.date_utils import compute_previous_period
from datetime import datetime, timezone
import asyncio
import json
import traceback

async def run_seo_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str):
    print(f"---> Background Task Started for SEO report {report_id}")
    supabase.table("report_status").update({"status": "fetching_data"}).eq("report_id", report_id).execute()

    try:
        # 1. Fetch site credentials
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["ga4", "google_search_console"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data}
        ga4_creds = creds_map.get("ga4")
        gsc_creds = creds_map.get("google_search_console")

        if not ga4_creds or not gsc_creds:
            raise Exception("Missing GA4 or GSC configuration for site")

        prev_start, prev_end = compute_previous_period(start_date, end_date)

        # 2. Fetch GA4 Data
        print("---> Fetching GA4 Data...")
        ga4_token = await get_ga4_token(user_id)
        ga4_property_id = ga4_creds.get("property_id")
        ga4_totals = await fetch_ga4_totals(ga4_property_id, ga4_token, start_date, end_date, prev_start, prev_end)
        top_landing = await fetch_ga4_landing_pages(ga4_property_id, ga4_token, start_date, end_date)
        top_page_titles = await fetch_ga4_page_titles(ga4_property_id, ga4_token, start_date, end_date)
        geo_users = await fetch_ga4_geography(ga4_property_id, ga4_token, start_date, end_date)
        daily_ga4 = await fetch_ga4_daily_users(ga4_property_id, ga4_token, start_date, end_date)
        sessions_by_channel = await fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, start_date, end_date)
        events_by_event_name = await fetch_ga4_events_by_event_name(ga4_property_id, ga4_token, start_date, end_date)
        key_events_by_platform = await fetch_ga4_key_events_by_platform(ga4_property_id, ga4_token, start_date, end_date)

        # 3. Fetch GSC Data
        print("---> Fetching GSC Data...")
        gsc_token = await get_gsc_token(user_id)
        gsc_site_url = gsc_creds.get("site_url")
        gsc_agg = await fetch_gsc_aggregates(gsc_site_url, gsc_token, start_date, end_date)
        gsc_daily = await fetch_gsc_daily(gsc_site_url, gsc_token, start_date, end_date)
        top_keywords_full = await fetch_gsc_keywords(gsc_site_url, gsc_token, start_date, end_date)

        # 4. Fetch Core Web Vitals (optional)
        print("---> Fetching Core Web Vitals...")
        cwv_data = {}
        try:
            cwv_data = await fetch_core_web_vitals(gsc_site_url)
        except Exception as e:
            print(f"!!! CWV Fetch Exception: {type(e).__name__}: {str(e)}")

        # 5. Process Chart Data
        chart_data = [{"label": d["date"], "valueA": d["users"], "valueB": 0, "valueC": 0} for d in daily_ga4]

        # 6. Call Gemini with the full prompt
        print("---> Generating AI Analysis...")
        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()

        prompt = f"""Generate an SEO report for {gsc_site_url}.

        Return ONLY valid JSON with exactly these keys:
        {{
            "summary": "2-4 complete sentences for an executive summary with specific metrics and a clear business interpretation",
            "insights": ["complete sentence insight 1", "complete sentence insight 2", "complete sentence insight 3"],
            "recommendations": [
                {{
                    "title": "Short catchy title for advice",
                    "description": "1-2 sentences of detailed, actionable advice",
                    "impact": "High/Medium/Low",
                    "effort": "High/Medium/Low"
                }}
            ],
            "top_keywords_overview": "1-2 complete sentences explaining the top keywords table and what it means for organic search",
            "table_explanations": {{
                "kpi_overview": "1-2 complete sentences explaining the KPI table with the most important change or contrast",
                "active_users_by_country": "1 complete sentence about the country table with the leading country named",
                "user_activity_over_time": "1 complete sentence about the daily users table with a peak or trend named if available",
                "views_by_page_title": "1 complete sentence about the page-title views table with the top page named if available",
                "sessions_by_channel": "1 complete sentence about the sessions by channel table with the leading channel named if available",
                "event_count_by_event_name": "1 complete sentence about the event-count table with the top event named if available",
                "key_events_by_platform": "1 complete sentence about the platform key-events table with the leading platform named if available"
            }}
        }}

        Rules:
        - Return every key listed above.
        - Use clear, natural English sentences, not fragments.
        - Write like a senior analyst explaining the data to a business owner.
        - Make the summary and insights detailed enough to feel useful, not generic.
        - Include the actual numbers or trend direction when the data makes it obvious.
        - Make recommendations specific, actionable, and improvement-oriented.
        - Ensure the table_explanations text matches the table names exactly.

    Use this data:
    - GSC aggregate: {gsc_agg}
    - GA4 totals: {ga4_totals}
    - Top keywords: {top_keywords_full[:10]}
    - Top landing pages: {top_landing[:10]}
    - Top page titles: {top_page_titles[:10]}
    - Users by country: {geo_users[:10]}
    - Sessions by channel: {sessions_by_channel[:10]}
    - Events by event name: {events_by_event_name[:10]}
    - Key events by platform: {key_events_by_platform[:10]}
    - Daily GSC: {gsc_daily[:10]}
    - Daily GA4: {daily_ga4[:10]}

    Do not wrap the JSON in markdown fences or add any extra text."""

        ai_result = await call_gemini(prompt)

        # 7. Save everything to processed_reports
        supabase.table("processed_reports").insert({
            "report_id": report_id,
            "user_id": user_id,
            "site_id": site_id,
            "module": "seo",
            "start_date": start_date,
            "end_date": end_date,
            "kpi_summary": {"ga4": ga4_totals, "gsc": gsc_agg, "cwv": cwv_data},
            "top_keywords": top_keywords_full,
            "top_landing_pages": top_landing,
            "top_page_titles": top_page_titles,
            "users_by_country": geo_users,
            "gsc_daily": gsc_daily,
            "sessions_by_channel": sessions_by_channel,
            "events_by_event_name": events_by_event_name,
            "key_events_by_platform": key_events_by_platform,
            "ga4_details": {
                "daily_users": daily_ga4,
                "top_landing_pages": top_landing,
                "top_page_titles": top_page_titles,
                "users_by_country": geo_users,
                "sessions_by_channel": sessions_by_channel,
                "events_by_event_name": events_by_event_name,
                "key_events_by_platform": key_events_by_platform,
            },
            "gsc_details": {
                "aggregates": gsc_agg,
                "daily": gsc_daily,
                "top_keywords": top_keywords_full,
            },
            "chart_datasets": chart_data,
            "ai_summary": ai_result.get("summary"),
            "ai_insights": ai_result.get("insights", []),
            "ai_recommendations": ai_result.get("recommendations", []),
            "ai_top_keywords_overview": ai_result.get("top_keywords_overview"),
            "ai_table_explanations": ai_result.get("table_explanations", {}),
        }).execute()

        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()
        print(f"---> Report {report_id} Completed Successfully.")

    except Exception as e:
        print(f"!!! Fatal Worker Error: {e}")
        traceback.print_exc()
        supabase.table("report_status").update({"status": "failed", "error_message": str(e)}).eq("report_id", report_id).execute()
