from app.supabase_client import supabase
from app.services.social import fetch_fb_insights, fetch_ig_insights
from app.services.gemini import call_gemini
from app.utils.date_utils import compute_previous_period
from datetime import datetime, timezone
import asyncio

async def run_social_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str):
    print(f"---> Background Task Started for Social report {report_id}")
    supabase.table("report_status").update({"status": "fetching_data"}).eq("report_id", report_id).execute()

    try:
        # 1. Fetch credentials
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["meta_business_suite", "instagram"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data}
        fb_creds = creds_map.get("meta_business_suite")
        ig_creds = creds_map.get("instagram")

        if not fb_creds or not ig_creds:
            raise Exception("Missing FB or Instagram credentials for site")

        prev_start, prev_end = compute_previous_period(start_date, end_date)

        # 2. Fetch Data
        print("---> Fetching Facebook & Instagram insights...")
        fb_cur = await fetch_fb_insights(fb_creds["page_id"], fb_creds["access_token"], start_date, end_date)
        fb_prev = await fetch_fb_insights(fb_creds["page_id"], fb_creds["access_token"], prev_start, prev_end)

        ig_cur = await fetch_ig_insights(ig_creds["instagram_business_id"], ig_creds["access_token"], start_date, end_date)
        ig_prev = await fetch_ig_insights(ig_creds["instagram_business_id"], ig_creds["access_token"], prev_start, prev_end)

        # 3. Aggregate Metrics
        print("---> Aggregating social metrics...")
        def sum_metric(data, name):
            metric_obj = next((d for d in data if d["name"] == name), None)
            if not metric_obj: return 0
            return sum(day["value"] for day in metric_obj.get("values", []))

        fb_impr_cur = sum_metric(fb_cur, "page_impressions")
        fb_impr_prev = sum_metric(fb_prev, "page_impressions")
        ig_impr_cur = sum_metric(ig_cur, "impressions")
        ig_impr_prev = sum_metric(ig_prev, "impressions")

        change = ((fb_impr_cur - fb_impr_prev) / fb_impr_prev * 100) if fb_impr_prev else 0

        # 4. Build Chart Data
        fb_daily = next((d for d in fb_cur if d["name"] == "page_impressions"), {}).get("values", [])
        chart_data = [
            {"label": day["end_time"].split('T')[0], "valueA": day["value"], "valueB": 0, "valueC": 0}
            for day in fb_daily
        ]
        chart_data = sorted(chart_data, key=lambda x: x["label"])[:30]

        # 5. Call Gemini
        prompt = f"""Generate a social media performance report.
        Facebook impressions: {fb_impr_cur} ({change:.1f}% change).
        Instagram impressions: {ig_impr_cur}.

        Return ONLY valid JSON with exactly these keys:
        {{
            "summary": "2-3 sentences summarizing engagement and reach trends",
            "insights": ["insight 1", "insight 2"],
            "recommendations": [
                {{
                    "title": "Short title",
                    "description": "Actionable advice",
                    "impact": "High/Medium/Low",
                    "effort": "High/Medium/Low"
                }}
            ],
            "top_keywords_overview": "Brief explanation of content performance",
            "table_explanations": {{
                "kpi_overview": "Explanation of the FB and IG impression metrics"
            }}
        }}"""

        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()
        ai_result = await call_gemini(prompt)

        # 6. Store Result
        supabase.table("processed_reports").insert({
            "report_id": report_id,
            "user_id": user_id,
            "site_id": site_id,
            "module": "social",
            "start_date": start_date,
            "end_date": end_date,
            "kpi_summary": {
                "fb_impressions": {"current": fb_impr_cur, "previous": fb_impr_prev, "change_percent": f"{change:.1f}"},
                "ig_impressions": {"current": ig_impr_cur, "previous": ig_impr_prev}
            },
            "chart_datasets": chart_data,
            "ai_summary": ai_result.get("summary"),
            "ai_insights": ai_result.get("insights", []),
            "ai_recommendations": ai_result.get("recommendations", []),
        }).execute()

        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()

    except Exception as e:
        supabase.table("report_status").update({"status": "failed", "error_message": str(e)}).eq("report_id", report_id).execute()
