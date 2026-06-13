from app.supabase_client import supabase
from app.services.social import fetch_fb_insights, fetch_ig_insights
from app.services.gemini import call_gemini, summarize_advice
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
        supabase.table("report_status").update({"status": "fetching_meta"}).eq("report_id", report_id).execute()
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
        ig_daily = next((d for d in ig_cur if d["name"] == "impressions"), {}).get("values", [])

        merged_daily = {}
        for day in fb_daily:
            date = day["end_time"].split('T')[0]
            merged_daily[date] = {"label": date, "valueA": day["value"], "valueB": 0, "valueC": 0}

        for day in ig_daily:
            date = day["end_time"].split('T')[0]
            if date in merged_daily:
                merged_daily[date]["valueB"] = day["value"]
            else:
                merged_daily[date] = {"label": date, "valueA": 0, "valueB": day["value"], "valueC": 0}

        chart_data = sorted(merged_daily.values(), key=lambda x: x["label"])[:30]

        # 5. Call Gemini with split prompts
        print("---> Generating AI Analysis (Split Prompt)...")
        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()

        prompt_main = f"""Generate a Social Media performance report strategy.
        Business Industry: General

        Return ONLY valid JSON with exactly these keys: summary, insights, recommendations, top_keywords_overview, section_specific_advice.

        - summary: A single plain English sentence (no JSON, no markdown, no brackets) that gives an executive overview of the most important changes in performance.
        - insights: A list of 2-4 high-level observations.
        - recommendations: A list of objects with: "title", "description", "impact", "effort".
        - top_keywords_overview: A brief explanation of content performance.
        - section_specific_advice: object with keys: "kpi_advice", "timeline_advice".
          Write 3-6 sentences for each, referencing numbers.

        Data:
        - Facebook Page Impressions: {fb_impr_cur} current vs {fb_impr_prev} previous (change: {change:.1f}%)
        - Instagram Impressions: {ig_impr_cur} current vs {ig_impr_prev} previous

        Now write the JSON."""

        prompt_details = f"""Generate detailed Social Media analysis.

        Return ONLY valid JSON with exactly these keys: table_explanations.

        - table_explanations: MUST contain a key `kpi_overview` and `timeline_insight` with a **detailed, data-driven paragraph (2-3 sentences)** explaining metric changes and business impact.

        Data:
        - Facebook Page Impressions: {fb_impr_cur} current vs {fb_impr_prev} previous
        - Instagram Impressions: {ig_impr_cur} current vs {ig_impr_prev} previous

        Now write the JSON."""

        # Call both concurrently without normalization
        results = await asyncio.gather(
            call_gemini(prompt_main, normalize=False),
            call_gemini(prompt_details, normalize=False)
        )

        result_main = results[0]
        result_details = results[1]

        # Merge results properly
        ai_result = {**result_main, **result_details}
        if isinstance(result_main.get("table_explanations"), dict) and isinstance(result_details.get("table_explanations"), dict):
            ai_result["table_explanations"] = {**result_main["table_explanations"], **result_details["table_explanations"]}

        # Merge section_specific_advice
        ai_result["section_specific_advice"] = {
            **result_main.get("section_specific_advice", {}),
            **result_details.get("section_specific_advice", {})
        }

        # Apply normalization at the end
        from app.services.gemini import normalize_ai_payload
        ai_result = normalize_ai_payload(ai_result)

        print("✅ [SOCIAL] AI ANALYSIS SUCCESS")
        print(f"DEBUG: table_explanations = {ai_result.get('table_explanations', {})}")
        print(f"DEBUG: section_advice = {ai_result.get('section_specific_advice', {})}")

        # --- Normalise section_specific_advice ---
        EXPECTED_ADVICE_KEYS = ["kpi_advice", "timeline_advice"]
        section_advice = ai_result.get("section_specific_advice", {})
        if not isinstance(section_advice, dict):
            section_advice = {}

        # Normalise each value to a list of strings
        for k, v in list(section_advice.items()):
            if isinstance(v, str):
                section_advice[k] = [v]
            elif not isinstance(v, list):
                section_advice[k] = [str(v)]

        # --- Add fallback for missing keys ---
        FALLBACK_MESSAGE = "No specific advice could be generated for this table."
        for key in EXPECTED_ADVICE_KEYS:
            if key not in section_advice or not section_advice[key]:
                section_advice[key] = [FALLBACK_MESSAGE]

        ai_result["section_specific_advice"] = section_advice

        # --- Generate Summarized Recommendations ---
        recommendations = ai_result.get("recommendations", [])
        advice_to_summarize = []
        if isinstance(recommendations, list):
            for item in recommendations:
                if isinstance(item, dict):
                    advice_to_summarize.append(item.get("description", ""))
                elif isinstance(item, str):
                    advice_to_summarize.append(item)

        summarized_recommendations = await summarize_advice(advice_to_summarize)

        # Ensure kpi_overview is a data-driven string (Backend Fallback)
        if not ai_result.get("table_explanations", {}).get("kpi_overview"):
            fallback_msg = f"Facebook impressions reached {fb_impr_cur:,} ({change:+.1f}% change vs {fb_impr_prev:,}) and Instagram impressions were {ig_impr_cur:,} during the selected period."
            if "table_explanations" not in ai_result:
                ai_result["table_explanations"] = {}
            ai_result["table_explanations"]["kpi_overview"] = fallback_msg

        # Ensure summary is a plain string
        summary = ai_result.get("summary")
        if isinstance(summary, (dict, list)):
            print(f"!!! AI returned JSON for summary, resetting it.")
            ai_result["summary"] = "Social performance overview could not be generated."

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
            "ai_recommendations_summarized": summarized_recommendations,
            "ai_table_explanations": ai_result.get("table_explanations", {}),
            "ai_top_keywords_overview": ai_result.get("top_keywords_overview", ""),
            "section_advice": ai_result.get("section_specific_advice", {}),
        }).execute()

        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()

    except Exception as e:
        supabase.table("report_status").update({"status": "failed", "error_message": str(e)}).eq("report_id", report_id).execute()
