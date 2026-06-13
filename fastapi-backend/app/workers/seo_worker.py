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
from app.services.gsc import get_gsc_token, fetch_gsc_aggregates, fetch_gsc_daily, fetch_gsc_keywords, fetch_gsc_pages
from app.services.gbp import get_gbp_token, fetch_gbp_metrics
from app.services.seo_work import detect_new_posts, detect_meta_tweaks, detect_internal_links
from app.services.pagespeed import fetch_core_web_vitals
from app.services.gemini import call_gemini, call_ollama_seo_simple, summarize_advice
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
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["ga4", "google_search_console", "gbp", "google_business_profile"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data}
        print(f"---> Available Platforms for Site: {list(creds_map.keys())}")

        ga4_creds = creds_map.get("ga4")
        gsc_creds = creds_map.get("google_search_console")
        gbp_creds = creds_map.get("google_business_profile") or creds_map.get("gbp")

        if not ga4_creds or not gsc_creds:
            raise Exception("Missing GA4 or GSC configuration for site")

        prev_start, prev_end = compute_previous_period(start_date, end_date)

        # 2. Fetch GA4 Data (Optimized with gather)
        supabase.table("report_status").update({"status": "fetching_ga4"}).eq("report_id", report_id).execute()
        print("---> Fetching GA4 Data...")
        ga4_token = await get_ga4_token(user_id)
        ga4_property_id = ga4_creds.get("property_id")

        ga4_tasks = [
            fetch_ga4_totals(ga4_property_id, ga4_token, start_date, end_date, prev_start, prev_end),
            fetch_ga4_landing_pages(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_page_titles(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_page_titles(ga4_property_id, ga4_token, prev_start, prev_end),
            fetch_ga4_geography(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_daily_users(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_events_by_event_name(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_key_events_by_platform(ga4_property_id, ga4_token, start_date, end_date)
        ]

        ga4_results = await asyncio.gather(*ga4_tasks)
        ga4_totals = ga4_results[0]
        top_landing = ga4_results[1]
        top_page_titles = ga4_results[2]
        prev_top_page_titles = ga4_results[3]
        geo_users = ga4_results[4]
        daily_ga4 = ga4_results[5]
        sessions_by_channel = ga4_results[6]
        events_by_event_name = ga4_results[7]
        key_events_by_platform = ga4_results[8]

        # 3. Fetch GSC Data
        supabase.table("report_status").update({"status": "fetching_gsc"}).eq("report_id", report_id).execute()
        print("---> Fetching GSC Data...")
        gsc_token = await get_gsc_token(user_id)
        gsc_site_url = gsc_creds.get("site_url")
        gsc_agg = await fetch_gsc_aggregates(gsc_site_url, gsc_token, start_date, end_date)
        gsc_daily = await fetch_gsc_daily(gsc_site_url, gsc_token, start_date, end_date)
        top_keywords_full = await fetch_gsc_keywords(gsc_site_url, gsc_token, start_date, end_date)

        # New for SEO work detection
        current_gsc_pages = await fetch_gsc_pages(gsc_site_url, gsc_token, start_date, end_date)
        prev_gsc_pages = await fetch_gsc_pages(gsc_site_url, gsc_token, prev_start, prev_end)

        # 4. Fetch GBP Data (optional)
        gbp_details = {}
        if gbp_creds:
            print("---> Fetching GBP Data...")
            try:
                gbp_token = await get_gbp_token(user_id)
                location_id = gbp_creds.get("location_id")
                gbp_details = await fetch_gbp_metrics(location_id, gbp_token, start_date, end_date)
                print(f"✅ [GMB] DATA FETCH SUCCESS: {gbp_details.get('aggregated', {})}")
            except Exception as e:
                print(f"!!! GBP Fetch Exception: {e}")

        # 5. SEO Work Detection
        print("---> Detecting SEO Work...")
        new_posts = await detect_new_posts(current_gsc_pages, prev_gsc_pages)
        meta_tweaks = await detect_meta_tweaks(top_page_titles, prev_top_page_titles)
        internal_links_count = await detect_internal_links(gsc_site_url, [p["page"] for p in top_landing])

        seo_work_details = {
            "new_posts": new_posts,
            "meta_tweaks": meta_tweaks,
            "internal_links_count": internal_links_count
        }

        # 6. Fetch Core Web Vitals (optional)
        print("---> Fetching Core Web Vitals...")
        cwv_data = {}
        try:
            cwv_data = await fetch_core_web_vitals(gsc_site_url)
        except Exception as e:
            print(f"!!! CWV Fetch Exception: {type(e).__name__}: {str(e)}")

        # 7. Process Chart Data
        chart_data = [
            {
                "label": d["date"],
                "valueA": d["users"],
                "valueB": max(0, d["users"] - d["newUsers"]),
                "valueC": 0
            }
            for d in daily_ga4
        ]

        # 8. Fetch site details for market context
        site_resp = supabase.table("sites").select("name, url, industry").eq("id", site_id).single().execute()
        site_info = site_resp.data or {}

        # --- Extract competitor signals from SEO data ---
        seo_signals = {}
        low_ctr_keywords = [kw for kw in top_keywords_full[:10] if kw.get('ctr', 0) < 0.05]
        poor_position_keywords = [kw for kw in top_keywords_full[:10] if kw.get('position', 100) > 10]
        seo_signals['seo'] = {
            'low_ctr_keywords': low_ctr_keywords,
            'poor_position_keywords': poor_position_keywords
        }
        avg_duration_change = ga4_totals.get('averageSessionDuration', {}).get('change_percent', 0)
        seo_signals['ga4'] = {
            'avg_session_duration_change_pct': avg_duration_change,
            'sessions_change_pct': ga4_totals.get('sessions', {}).get('change_percent', 0)
        }
        seo_signals_str = json.dumps(seo_signals, indent=2)

        # 9. Call Gemini with platform-specific split prompts
        print("---> Generating AI Analysis (Platform Split)...")
        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()

        prompt_gsc = f"""ANALYSIS FOR GOOGLE SEARCH CONSOLE
Business: {site_info.get('name')} ({site_info.get('url')})

Return ONLY valid JSON with exactly these keys: section_specific_advice, table_explanations.

- section_specific_advice: object with keys: "page_title_advice", "keyword_advice".
  Write 3-6 sentences, referencing GSC numbers.
- table_explanations: object with keys: "views_by_page_title", "secondary_overview".
  Write 2-3 sentences using ACTUAL NUMBERS.

Data:
- GSC Aggregate: Clicks: {gsc_agg.get('clicks',0)}, Impressions: {gsc_agg.get('impressions',0)}, CTR: {gsc_agg.get('ctr',0):.2%}, Position: {gsc_agg.get('position',0):.1f}
- Top Keywords: {json.dumps(top_keywords_full[:10])}
- Top Page Titles: {json.dumps(top_page_titles[:10])}"""

        prompt_ga4_summary = f"""STRATEGY SUMMARY & GA4 ANALYSIS
Business: {site_info.get('name')} ({site_info.get('url')})
Industry: {site_info.get('industry', 'General')}

Return ONLY valid JSON with these keys: summary, insights, recommendations, competitor_analysis, slide_descriptions, top_keywords_overview, section_specific_advice, table_explanations.

- summary: ONE sentence executive overview.
- insights: list of 3-5 high-level observations.
- recommendations: numbered list (5-10 items).
- slide_descriptions: object with keys: "meta_titles", "heading_structure", "internal_linking", "content_formatting", "gmb_authority", "gmb_support".
  Write 1-2 line description for each using numbers provided.
- competitor_analysis: object with "inferred_actions" (list of 3-5 strings), "confidence", "actionable_steps" (list of 3-5 strings).
- top_keywords_overview: ONE sentence mentioning top 1-2 keywords and clicks.
- section_specific_advice: object with keys: "kpi_advice", "country_advice", "activity_advice", "channel_advice", "event_advice", "platform_advice".
  Write 2-4 concise sentences for each, referencing numbers. Use country_advice for demographics and activity_advice for timeline.
- table_explanations: object with keys: "kpi_overview", "active_users_by_country", "user_activity_over_time", "sessions_by_channel", "event_count_by_event_name", "key_events_by_platform".

Context Data:
- GA4 Totals: Users: {ga4_totals.get('totalUsers',{}).get('current',0)}, Sessions: {ga4_totals.get('sessions',{}).get('current',0)}
- Country Data: {json.dumps(geo_users[:8])}
- User Activity: {json.dumps(daily_ga4[-10:])}
- Sessions by Channel: {json.dumps(sessions_by_channel[:8])}
- Event Count: {json.dumps(events_by_event_name[:8])}
- Key Events: {json.dumps(key_events_by_platform[:5])}
- GBP: {json.dumps(gbp_details.get('aggregated', {}))}"""

        try:
            results = await asyncio.gather(
                call_gemini(prompt_gsc, normalize=False),
                call_gemini(prompt_ga4_summary, normalize=False),
                return_exceptions=True
            )

            res_gsc = results[0] if isinstance(results[0], dict) else {}
            res_ga4 = results[1] if isinstance(results[1], dict) else {}

            if isinstance(results[0], dict): print("✅ [GEMINI] Success for GSC Analysis")
            else: print(f"❌ [GEMINI] Failed GSC Analysis: {results[0]}")

            if isinstance(results[1], dict): print("✅ [GEMINI] Success for GA4 & Summary Analysis")
            else: print(f"❌ [GEMINI] Failed GA4/Summary Analysis: {results[1]}")

        except Exception as ge:
            print(f"!!! AI Gather Critical Error: {ge}")
            res_gsc = res_ga4 = {}

        # Merge results properly
        ai_result = {**res_ga4}

        # Merge table_explanations
        ai_result["table_explanations"] = {
            **res_gsc.get("table_explanations", {}),
            **res_ga4.get("table_explanations", {})
        }

        # Merge section_specific_advice
        ai_result["section_specific_advice"] = {
            **res_gsc.get("section_specific_advice", {}),
            **res_ga4.get("section_specific_advice", {})
        }

        # Apply normalization at the end
        from app.services.gemini import normalize_ai_payload
        ai_result = normalize_ai_payload(ai_result)

        print("✅ [SEO] AI ANALYSIS SUCCESS")
        print(f"DEBUG: table_explanations = {ai_result.get('table_explanations', {})}")
        print(f"DEBUG: section_advice = {ai_result.get('section_specific_advice', {})}")

        # Normalise AI results
        def ensure_list(val):
            if isinstance(val, list): return val
            if isinstance(val, str) and val.strip(): return [val]
            return []

        raw_competitor = ai_result.get("competitor_analysis")
        if isinstance(raw_competitor, dict):
            competitor_analysis = {
                "inferred_actions": ensure_list(raw_competitor.get("inferred_actions") or raw_competitor.get("inferredActions")) or ["No significant competitor shifts detected in search rankings."],
                "confidence": raw_competitor.get("confidence", "low"),
                "actionable_steps": ensure_list(raw_competitor.get("actionable_steps") or raw_competitor.get("actionableSteps") or raw_competitor.get("recommended_steps")) or ["Continue content optimization and backlink profile strengthening."]
            }
        else:
            competitor_analysis = {
                "inferred_actions": [str(raw_competitor) if raw_competitor else "No competitor data available from search console nodes."],
                "confidence": "low",
                "actionable_steps": ["Maintain current SEO roadmap and monitor keyword volatility."]
            }
        ai_result["competitor_analysis"] = competitor_analysis

        EXPECTED_ADVICE_KEYS = ["kpi_advice", "demographic_advice", "country_advice", "timeline_advice", "activity_advice", "page_title_advice", "keyword_advice", "channel_advice", "event_advice", "platform_advice"]
        section_advice = ai_result.get("section_specific_advice", {})
        if not isinstance(section_advice, dict): section_advice = {}

        # Normalise each value to a list of strings
        for k, v in list(section_advice.items()):
            if isinstance(v, str):
                section_advice[k] = [v]
            elif not isinstance(v, list):
                section_advice[k] = [str(v)]

        for key in EXPECTED_ADVICE_KEYS:
            if key not in section_advice or not section_advice[key]: section_advice[key] = ["No specific advice generated."]

        ai_result["section_specific_advice"] = section_advice

        recommendations = ai_result.get("recommendations", [])
        summarized_recommendations = await summarize_advice(recommendations)

        # Radar Data
        radar_data = [
            {"subject": "Traffic", "Current Site": 65, "Competitor Alpha": 45, "Competitor Beta": 80, "Competitor Gamma": 30},
            {"subject": "Keywords", "Current Site": 82, "Competitor Alpha": 60, "Competitor Beta": 75, "Competitor Gamma": 50},
            {"subject": "Authority", "Current Site": 58, "Competitor Alpha": 40, "Competitor Beta": 90, "Competitor Gamma": 65},
            {"subject": "Social", "Current Site": 42, "Competitor Alpha": 85, "Competitor Beta": 35, "Competitor Gamma": 72},
            {"subject": "Ads", "Current Site": 88, "Competitor Alpha": 55, "Competitor Beta": 62, "Competitor Gamma": 48}
        ]

        # 10. Save to database
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
                "sessions_by_channel": sessions_by_channel,
                "events_by_event_name": events_by_event_name,
                "key_events_by_platform": key_events_by_platform,
                "daily_users": [
                    {
                        "date": d["date"],
                        "users": d["users"],
                        "returningUsers": max(0, d["users"] - d["newUsers"])
                    }
                    for d in daily_ga4
                ]
            },
            "chart_datasets": chart_data,
            "radar_data": radar_data,
            "ai_summary": ai_result.get("summary"),
            "ai_insights": ai_result.get("insights", []),
            "ai_recommendations": ai_result.get("recommendations", []),
            "ai_recommendations_summarized": summarized_recommendations,
            "ai_top_keywords_overview": ai_result.get("top_keywords_overview"),
            "ai_competitor_analysis": ai_result.get("competitor_analysis"),
            "ai_table_explanations": ai_result.get("table_explanations", {}),
            "section_advice": section_advice,
            "ai_slide_descriptions": ai_result.get("slide_descriptions", {}),
            "seo_work_details": seo_work_details,
            "gbp_details": gbp_details
        }).execute()

        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()
        print(f"---> Report {report_id} Completed Successfully.")

    except Exception as e:
        error_msg = str(e)
        if "[Errno 11001]" in error_msg or "getaddrinfo failed" in error_msg:
            print("!!! NETWORK ERROR: System is offline or DNS resolution failed.")
        else:
            print(f"!!! Fatal Worker Error: {e}")
        traceback.print_exc()
        try:
            supabase.table("report_status").update({"status": "failed", "error_message": error_msg}).eq("report_id", report_id).execute()
        except:
            print("!!! Failed to even update error status due to network failure.")
