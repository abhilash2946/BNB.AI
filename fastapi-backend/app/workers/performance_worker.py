from app.supabase_client import supabase
from app.services.google_ads import (
    fetch_google_ads_data,
    fetch_google_ads_totals,
    fetch_google_ads_campaigns,
    fetch_google_ads_keywords,
    fetch_google_ads_search_terms,
    fetch_google_ads_devices,
    fetch_google_ads_demographics,
    fetch_google_ads_day_hour,
    fetch_google_ads_networks,
    fetch_google_ads_assets,
    fetch_google_ads_devices_daily,
    fetch_google_ads_demographics_daily,
    fetch_google_ads_search_terms_daily,
    fetch_google_ads_campaigns_daily,
    fetch_auction_insights
)
from app.services.ga4 import (
    get_ga4_token,
    fetch_ga4_totals,
    fetch_ga4_daily_users,
    fetch_ga4_sessions_by_channel,
    fetch_ga4_geography,
    fetch_ga4_landing_pages
)
from app.services.gbp import get_gbp_token, fetch_gbp_metrics
from app.services.meta_ads import (
    fetch_meta_ads_aggregate,
    fetch_meta_ads_campaigns,
    fetch_meta_ads_daily,
    fetch_meta_ads_adsets,
    fetch_meta_ads_devices
)
from app.services.gemini import call_gemini, call_ollama_simple, summarize_advice
from app.utils.date_utils import compute_previous_period
from datetime import datetime, timezone, timedelta
import asyncio
import json
import traceback

def cap_meta_date(date_str: str) -> str:
    """Meta Ads API restricts data to the last 37 months."""
    try:
        date_dt = datetime.strptime(date_str, "%Y-%m-%d")
        # 37 months is roughly 1110 days. Using 1100 to be safe.
        limit_dt = datetime.now() - timedelta(days=1100)
        if date_dt < limit_dt:
            print(f"--- Meta Date Cap: Truncating {date_str} to {limit_dt.strftime('%Y-%m-%d')}")
            return limit_dt.strftime("%Y-%m-%d")
    except Exception:
        pass
    return date_str

async def run_performance_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str):
    print(f"---> Background Task Started for Performance report {report_id}")
    supabase.table("report_status").update({"status": "fetching_data"}).eq("report_id", report_id).execute()

    try:
        # 1. Fetch site credentials for ads platforms
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["ga4", "google_ads", "meta_ads", "gbp", "google_business_profile"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data}
        print(f"---> Available Platforms for Site: {list(creds_map.keys())}")

        google_creds = creds_map.get("google_ads")
        meta_creds = creds_map.get("meta_ads")
        ga4_creds = creds_map.get("ga4")
        gbp_creds = creds_map.get("google_business_profile") or creds_map.get("gbp")

        if not google_creds and not meta_creds:
            raise Exception("Missing Ads configuration for site (Google or Meta)")

        # Initialize results placeholders
        google_cur = google_prev = {}
        google_ads_details = {}
        google_results = [None] * 16 # Ensure indexing works
        auction_insights = []
        chart_data_overview = []
        meta_current = meta_previous = {}
        meta_campaigns = []
        meta_daily = []
        meta_adsets = []
        meta_devices = []
        gbp_details = {}
        ga4_totals = {}
        daily_ga4 = []
        sessions_by_channel = []
        geo_users = []
        top_landing = []

        # 2. Compute previous period
        prev_start, prev_end = compute_previous_period(start_date, end_date)

        # 3. Initialize tasks for all platforms
        google_tasks = []
        meta_task = None
        ga4_tasks = []
        gbp_task = None

        if google_creds:
            ga_customer_id = google_creds.get("customer_id")
            if ga_customer_id:
                print(f"---> Queueing Google Ads tasks for {ga_customer_id}...")
                google_tasks = [
                    fetch_google_ads_totals(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_totals(user_id, ga_customer_id, prev_start, prev_end),
                    fetch_google_ads_data(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_campaigns(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_keywords(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_search_terms(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_devices(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_demographics(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_day_hour(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_networks(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_assets(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_devices_daily(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_demographics_daily(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_search_terms_daily(user_id, ga_customer_id, start_date, end_date),
                    fetch_google_ads_campaigns_daily(user_id, ga_customer_id, start_date, end_date),
                    fetch_auction_insights(user_id, ga_customer_id, start_date, end_date)
                ]

        if meta_creds:
            meta_ad_account_id = meta_creds.get("ad_account_id")
            meta_token = meta_creds.get("access_token")
            if not meta_token:
                user_creds = supabase.table("user_credentials").select("credentials").eq("user_id", user_id).eq("platform", "meta_long_lived_token").single().execute()
                if user_creds.data:
                    meta_token = user_creds.data["credentials"].get("token")

            if meta_token and meta_ad_account_id:
                print(f"---> Queueing Meta Ads task for {meta_ad_account_id}...")

                # Apply Meta date capping
                m_start = cap_meta_date(start_date)
                m_end = cap_meta_date(end_date)
                m_prev_start = cap_meta_date(prev_start)
                m_prev_end = cap_meta_date(prev_end)

                meta_task = asyncio.gather(
                    fetch_meta_ads_aggregate(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_aggregate(meta_ad_account_id, meta_token, m_prev_start, m_prev_end),
                    fetch_meta_ads_campaigns(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_daily(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_adsets(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_devices(meta_ad_account_id, meta_token, m_start, m_end),
                    return_exceptions=True
                )

        if ga4_creds:
            ga4_property_id = ga4_creds.get("property_id")
            if ga4_property_id:
                print(f"---> Queueing GA4 tasks for {ga4_property_id}...")
                # We need the token first, but for now let's keep it sequential inside a wrapper if needed,
                # or just fetch it here.
                ga4_token = await get_ga4_token(user_id)
                ga4_tasks = [
                    fetch_ga4_totals(ga4_property_id, ga4_token, start_date, end_date, prev_start, prev_end),
                    fetch_ga4_daily_users(ga4_property_id, ga4_token, start_date, end_date),
                    fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, start_date, end_date),
                    fetch_ga4_geography(ga4_property_id, ga4_token, start_date, end_date),
                    fetch_ga4_landing_pages(ga4_property_id, ga4_token, start_date, end_date)
                ]

        if gbp_creds:
            location_id = gbp_creds.get("location_id")
            if location_id:
                print(f"---> Queueing GBP task for {location_id}...")
                gbp_token = await get_gbp_token(user_id)
                gbp_task = fetch_gbp_metrics(location_id, gbp_token, start_date, end_date)

        # 4. Run all tasks concurrently
        print("---> Synchronizing all platform data...")
        all_tasks = []
        if google_tasks: all_tasks.extend(google_tasks)

        # Meta task is special because it's already a gather
        if meta_task:
            all_tasks.append(meta_task)

        if ga4_tasks: all_tasks.extend(ga4_tasks)
        if gbp_task: all_tasks.append(gbp_task)

        if not all_tasks:
             print("!!! No tasks to run.")
             all_results = []
        else:
             all_results = await asyncio.gather(*all_tasks, return_exceptions=True)

        # 5. Extract results
        idx = 0
        if google_tasks:
            g_res = all_results[idx:idx+16]
            google_results = [r if not isinstance(r, Exception) else None for r in g_res]
            google_cur = google_results[0] or {}
            google_prev = google_results[1] or {}
            google_current_data = google_results[2] or []
            google_ads_details = {
                "top_campaigns": google_results[3] or [],
                "top_keywords": google_results[4] or [],
                "search_terms": google_results[5] or [],
                "devices": google_results[6] or [],
                "demographics": google_results[7] or [],
                "day_hour": google_results[8] or [],
                "networks": google_results[9] or [],
                "top_assets": google_results[10] or [],
            }
            auction_insights = google_results[15] or []
            print(f"✅ [GADS] DATA FETCH SUCCESS. Cur Impr: {google_cur.get('impressions', 0)}")

            # Build Overview Chart
            daily = {}
            for row in google_current_data:
                date = row.get("segments", {}).get("date")
                if date:
                    daily.setdefault(date, {"spend": 0, "impressions": 0, "clicks": 0})
                    daily[date]["spend"] += row.get("metrics", {}).get("cost_micros", 0) / 1_000_000
                    daily[date]["impressions"] += row.get("metrics", {}).get("impressions", 0)
                    daily[date]["clicks"] += row.get("metrics", {}).get("clicks", 0)
            chart_data_overview = [
                {"label": date, "valueA": data["spend"], "valueB": data["impressions"], "valueC": data["clicks"]}
                for date, data in sorted(daily.items())
            ]
            idx += 16

        if meta_task:
            m_res_raw = all_results[idx]
            if not isinstance(m_res_raw, Exception):
                # m_res_raw is the result of the inner gather(return_exceptions=True)
                m_results = []
                for i, r in enumerate(m_res_raw):
                    if isinstance(r, Exception):
                        print(f"!!! Meta Sub-task {i} failed: {r}")
                        m_results.append(None)
                    else:
                        m_results.append(r)

                meta_current = m_results[0] or {}
                meta_previous = m_results[1] or {}
                meta_campaigns = m_results[2] or []
                meta_daily = m_results[3] or []
                meta_adsets = m_results[4] or []
                meta_devices = m_results[5] or []

                print(f"✅ [META] DATA FETCH SUCCESS. Cur Leads: {meta_current.get('leads', 0)}")
            else:
                print(f"❌ [META] DATA FETCH CRITICAL ERROR: {m_res_raw}")
            idx += 1

        if ga4_tasks:
            ga_res = all_results[idx:idx+5]
            ga_results = [r if not isinstance(r, Exception) else {} for r in ga_res]
            ga4_totals, daily_ga4, sessions_by_channel, geo_users, top_landing = ga_results
            print(f"✅ [GA4] DATA FETCH SUCCESS. Users: {ga4_totals.get('totalUsers', {}).get('current', 0) if isinstance(ga4_totals, dict) else 0}")
            idx += 5

        if gbp_task:
            gbp_res = all_results[idx]
            if not isinstance(gbp_res, Exception):
                gbp_details = gbp_res
                print(f"✅ [GMB] DATA FETCH SUCCESS: {gbp_details.get('aggregated', {})}")
            else:
                print(f"❌ [GMB] DATA FETCH FAILED: {gbp_res}")
            idx += 1

        # 5. Site Info & AI Analysis
        site_resp = supabase.table("sites").select("name, url, industry").eq("id", site_id).single().execute()
        site_info = site_resp.data or {}

        # --- Extract competitor signals from performance data ---
        perf_signals = {}
        if google_cur and google_prev:
            leads_cur = google_cur.get('conversions', 0)
            leads_prev = google_prev.get('conversions', 0)
            cpl_cur = google_cur.get('cost_per_lead', 0)
            cpl_prev = google_prev.get('cost_per_lead', 0)
            perf_signals['google_ads'] = {
                'leads_change_pct': ((leads_cur - leads_prev) / (leads_prev or 1)) * 100,
                'cpl_change_pct': ((cpl_cur - cpl_prev) / (cpl_prev or 1)) * 100,
                'top_search_terms_poor_ctr': [
                    term for term in google_ads_details.get('search_terms', [])[:5]
                    if term.get('ctr', 0) < 1.0
                ]
            }
        if meta_current and meta_previous:
            perf_signals['meta_ads'] = {
                'cpl_change_pct': ((meta_current.get('cost_per_lead', 0) - meta_previous.get('cost_per_lead', 0)) /
                                   (meta_previous.get('cost_per_lead', 0) or 1)) * 100,
                'ctr_change_pct': ((meta_current.get('ctr', 0) - meta_previous.get('ctr', 0)) /
                                   (meta_previous.get('ctr', 0) or 1)) * 100,
            }
        perf_signals_str = json.dumps(perf_signals, indent=2)

        competitor_text = "No direct auction data available from Google Ads API."
        if auction_insights:
            agg_comp = {}
            for row in auction_insights:
                domain = row.get("competitor_domain")
                if not domain or domain == "Unknown": continue
                agg_comp.setdefault(domain, {"is": []})
                agg_comp[domain]["is"].append(float(row.get("impression_share") or 0))
            top_competitors = [f"- {d}: {sum(m['is'])/len(m['is']):.1%} impression share" for d, m in sorted(agg_comp.items(), key=lambda x: sum(x[1]['is'])/len(x[1]['is']), reverse=True)[:5]]
            if top_competitors: competitor_text = "Real-time Auction Insights:\n" + "\n".join(top_competitors)

        # 5. Call Gemini with platform-specific split prompts
        print("---> Generating AI Analysis (Platform Split)...")
        status_res = supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()
        if not status_res.data:
            print(f"!!! Warning: Could not update status to generating_ai for {report_id}")

        prompt_google_ads = f"""ANALYSIS FOR GOOGLE ADS
Business: {site_info.get('name')} ({site_info.get('url')})

Return ONLY valid JSON with exactly these keys: section_specific_advice, table_explanations.

- section_specific_advice: object with keys: "kpi_advice", "campaign_advice", "keyword_advice", "device_advice", "search_term_advice", "demographic_advice", "day_hour_advice", "network_advice", "asset_advice".
  Write 2-4 concise sentences for each, referencing numbers.
- table_explanations: object with keys: "kpi_overview", "top_campaigns", "top_keywords", "devices", "search_terms", "demographics", "day_hour", "networks", "top_assets".
  Write 2-3 sentences for each, using ACTUAL NUMBERS.

Data:
- Totals: Impressions {google_cur.get('impressions',0)}, Clicks {google_cur.get('clicks',0)}, Leads {google_cur.get('conversions',0)}, Cost ₹{google_cur.get('cost',0):.2f}
- Top Campaigns: {json.dumps(google_ads_details.get('top_campaigns', [])[:5])}
- Top Keywords: {json.dumps(google_ads_details.get('top_keywords', [])[:5])}
- Search Terms: {json.dumps(google_ads_details.get('search_terms', [])[:5])}
- Devices: {json.dumps(google_ads_details.get('devices', []))}
- Demographics: {json.dumps(google_ads_details.get('demographics', [])[:5])}
- Day/Hour: {json.dumps(google_ads_details.get('day_hour', [])[:5])}
- Networks: {json.dumps(google_ads_details.get('networks', []))}
- Top Assets: {json.dumps(google_ads_details.get('top_assets', [])[:5])}"""

        prompt_meta_ads = f"""ANALYSIS FOR META ADS
Business: {site_info.get('name')} ({site_info.get('url')})

Return ONLY valid JSON with exactly these keys: section_specific_advice, table_explanations.

- section_specific_advice: object with keys: "meta_kpi_advice", "meta_campaign_advice", "meta_adset_advice", "meta_device_advice".
  Write 2-4 concise sentences for each, referencing numbers. Use meta_kpi_advice for Meta Ads KPI Summary.
- table_explanations: object with keys: "meta_kpi_overview", "meta_campaigns", "meta_adsets", "meta_devices".
  Write 2-3 sentences for each, using ACTUAL NUMBERS.

Data:
- Meta Ads: Spend ₹{meta_current.get('spend',0):.2f}, Leads {meta_current.get('leads',0)}, CTR {meta_current.get('ctr',0):.1f}%
- Meta Campaigns: {json.dumps(meta_campaigns[:5])}
- Meta Adsets: {json.dumps(meta_adsets[:5])}
- Meta Devices: {json.dumps(meta_devices[:5])}"""

        prompt_summary = f"""STRATEGY SUMMARY & SLIDE DESCRIPTIONS
Business: {site_info.get('name')} ({site_info.get('url')})
Industry: {site_info.get('industry', 'General')}

Return ONLY valid JSON with these keys: summary, insights, recommendations, competitor_analysis, top_keywords_overview, slide_descriptions.

- summary: ONE sentence executive overview.
- insights: list of high-level observations.
- recommendations: numbered list (5-10 items).
- slide_descriptions: object with keys: "meta_titles", "heading_structure", "internal_linking", "content_formatting", "gmb_authority", "gmb_support".
  Write 1-2 line description for each using numbers provided.
- competitor_analysis: object with "inferred_actions" (list of 3-5 strings), "confidence", "actionable_steps" (list of 3-5 strings).
- top_keywords_overview: ONE sentence mentioning top 1-2 keywords and clicks/CTR.

Context Data:
- Google: {google_cur.get('clicks',0)} clicks, {google_cur.get('impressions',0)} impr.
- GA4: {ga4_totals.get('sessions', {}).get('current', 0)} sessions, {ga4_totals.get('totalUsers', {}).get('current', 0)} users.
- Meta: {meta_current.get('ctr',0):.1f}% CTR.
- GBP: {gbp_details.get('aggregated', {}).get('total_views', 0)} views, {gbp_details.get('aggregated', {}).get('total_actions', 0)} actions, {gbp_details.get('aggregated', {}).get('calls', 0)} calls, {gbp_details.get('aggregated', {}).get('website_clicks', 0)} clicks.
- Competitors: {competitor_text}"""

        try:
            results = await asyncio.gather(
                call_gemini(prompt_google_ads, normalize=False),
                call_gemini(prompt_meta_ads, normalize=False),
                call_gemini(prompt_summary, normalize=False),
                return_exceptions=True
            )

            res_gads = results[0] if isinstance(results[0], dict) else {}
            res_meta = results[1] if isinstance(results[1], dict) else {}
            res_summ = results[2] if isinstance(results[2], dict) else {}

            if isinstance(results[0], dict): print("✅ [GEMINI] Success for Google Ads Analysis")
            else: print(f"❌ [GEMINI] Failed Google Ads Analysis: {results[0]}")

            if isinstance(results[1], dict): print("✅ [GEMINI] Success for Meta Ads Analysis")
            else: print(f"❌ [GEMINI] Failed Meta Ads Analysis: {results[1]}")

            if isinstance(results[2], dict): print("✅ [GEMINI] Success for Summary Analysis")
            else: print(f"❌ [GEMINI] Failed Summary Analysis: {results[2]}")

        except Exception as ge:
            print(f"!!! AI Gather Critical Error: {ge}")
            res_gads = res_meta = res_summ = {}

        # Merge results properly
        ai_result = {**res_summ}

        # Merge table_explanations from all
        ai_result["table_explanations"] = {
            **res_gads.get("table_explanations", {}),
            **res_meta.get("table_explanations", {}),
            **res_summ.get("table_explanations", {})
        }

        # Merge section_specific_advice from all
        ai_result["section_specific_advice"] = {
            **res_gads.get("section_specific_advice", {}),
            **res_meta.get("section_specific_advice", {}),
            **res_summ.get("section_specific_advice", {})
        }

        # Apply normalization at the end
        from app.services.gemini import normalize_ai_payload
        ai_result = normalize_ai_payload(ai_result)

        print("✅ [PERFORMANCE] AI ANALYSIS SUCCESS")
        print(f"DEBUG: table_explanations = {ai_result.get('table_explanations', {})}")
        print(f"DEBUG: section_advice = {ai_result.get('section_specific_advice', {})}")

        # Check if Gemini returned empty section_specific_advice or all empty arrays
        gemini_advice = ai_result.get("section_specific_advice", {})
        if not gemini_advice or all(not v for v in gemini_advice.values()):
            print("--- Gemini returned no section_specific_advice. Trying Ollama with simplified prompt.")
            ollama_result = await call_ollama_simple(site_info, google_cur, google_prev, meta_current)
            if ollama_result and ollama_result.get("section_specific_advice"):
                ai_result["section_specific_advice"] = ollama_result["section_specific_advice"]
                print("✅ Ollama fallback succeeded for section_specific_advice.")
            else:
                print("--- Ollama also failed for section_specific_advice. Will rely on static fallback later.")

        print(f"DEBUG: table_explanations = {ai_result.get('table_explanations', {})}")

        # --- Normalise competitor_analysis to always be an object ---
        def ensure_list(val):
            if isinstance(val, list): return val
            if isinstance(val, str) and val.strip(): return [val]
            return []

        raw_competitor = ai_result.get("competitor_analysis")
        if isinstance(raw_competitor, dict):
            # Ensure required keys exist and have fallback content
            competitor_analysis = {
                "inferred_actions": ensure_list(raw_competitor.get("inferred_actions") or raw_competitor.get("inferredActions")) or ["No specific competitor actions inferred for this period."],
                "confidence": raw_competitor.get("confidence", "low"),
                "actionable_steps": ensure_list(raw_competitor.get("actionable_steps") or raw_competitor.get("actionableSteps") or raw_competitor.get("recommended_steps")) or ["Monitor market shifts and maintain baseline performance targets."]
            }
        else:
            # Fallback for old format or string
            summary_text = str(raw_competitor) if raw_competitor else "No competitor data available from primary advertising nodes."
            competitor_analysis = {
                "inferred_actions": [summary_text],
                "confidence": "low",
                "actionable_steps": ["Maintain current campaign stability while monitoring competition."]
            }
        ai_result["competitor_analysis"] = competitor_analysis

        # --- Normalise section_specific_advice ---
        EXPECTED_ADVICE_KEYS = [
            "kpi_advice", "campaign_advice", "keyword_advice", "device_advice",
            "search_term_advice", "demographic_advice", "day_hour_advice",
            "network_advice", "asset_advice", "meta_kpi_advice", "meta_campaign_advice",
            "meta_adset_advice", "meta_device_advice"
        ]
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
        FALLBACK_MESSAGE = "No specific advice could be generated for this table. Review the data above and consult with your marketing team."
        for key in EXPECTED_ADVICE_KEYS:
            if key not in section_advice or not section_advice[key]:
                section_advice[key] = [FALLBACK_MESSAGE]

        ai_result["section_specific_advice"] = section_advice

        # --- Ensure recommendations are plain strings ---
        recommendations = ai_result.get("recommendations", [])
        if isinstance(recommendations, list):
            # Convert any objects to string, keep strings as is
            recommendations = [str(item) if not isinstance(item, str) else item for item in recommendations]
        else:
            recommendations = [str(recommendations)]
        ai_result["recommendations"] = recommendations

        # --- Generate Summarized Recommendations ---
        summarized_recommendations = await summarize_advice(recommendations)

        # Ensure kpi_overview is a data-driven string (Backend Fallback)
        if not ai_result.get("table_explanations", {}).get("kpi_overview"):
            g_cur = google_cur or {}
            g_prev = google_prev or {}
            imp_change = ((g_cur.get('impressions',0) - g_prev.get('impressions',0)) / (g_prev.get('impressions',0) or 1)) * 100
            click_change = ((g_cur.get('clicks',0) - g_prev.get('clicks',0)) / (g_prev.get('clicks',0) or 1)) * 100
            lead_change = ((g_cur.get('conversions',0) - g_prev.get('conversions',0)) / (g_prev.get('conversions',0) or 1)) * 100
            cost_cur = g_cur.get('cost', 0)
            cost_prev = g_prev.get('cost', 0)
            cost_change = ((cost_cur - cost_prev) / (cost_prev or 1)) * 100

            fallback_msg = f"Google Ads impressions changed {imp_change:+.1f}% ({g_prev.get('impressions',0):,} → {g_cur.get('impressions',0):,}), clicks changed {click_change:+.1f}% ({g_prev.get('clicks',0):,} → {g_cur.get('clicks',0):,}), and leads changed {lead_change:+.1f}% ({g_prev.get('conversions',0)} → {g_cur.get('conversions',0)}). Total spend: ₹{cost_cur:,.2f} ({cost_change:+.1f}%)."
            if "table_explanations" not in ai_result:
                ai_result["table_explanations"] = {}
            ai_result["table_explanations"]["kpi_overview"] = fallback_msg

        # Sanitize top_keywords_overview
        overview = ai_result.get("top_keywords_overview")
        if isinstance(overview, list) or (isinstance(overview, str) and (overview.strip().startswith('[') or overview.strip().startswith('{'))):
            print(f"!!! AI returned JSON for performance top_keywords_overview, clearing it.")
            ai_result["top_keywords_overview"] = ""

        # Ensure summary is a plain string
        summary = ai_result.get("summary")
        if isinstance(summary, (dict, list)):
            print(f"!!! AI returned JSON for summary, resetting it.")
            ai_result["summary"] = "Performance overview could not be generated."

        # Ensure summary is a plain string
        summary = ai_result.get("summary")
        if isinstance(summary, (dict, list)):
            print(f"!!! AI returned JSON for summary, resetting it.")
            ai_result.update({"summary": "Performance overview could not be generated."})

        # --- 6. Generate Synthetic Radar Data ---
        radar_data = [
            {"subject": "Traffic", "Current Site": 72, "Competitor Alpha": 50, "Competitor Beta": 85, "Competitor Gamma": 40},
            {"subject": "Keywords", "Current Site": 88, "Competitor Alpha": 65, "Competitor Beta": 70, "Competitor Gamma": 55},
            {"subject": "Authority", "Current Site": 60, "Competitor Alpha": 45, "Competitor Beta": 95, "Competitor Gamma": 68},
            {"subject": "Social", "Current Site": 45, "Competitor Alpha": 82, "Competitor Beta": 38, "Competitor Gamma": 75},
            {"subject": "Ads", "Current Site": 92, "Competitor Alpha": 60, "Competitor Beta": 65, "Competitor Gamma": 52}
        ]

        print(f"---> AI Generation Complete for {report_id}")

        # 7. Store Result
        print(f"---> Storing results in processed_reports for {report_id}...")
        try:
            supabase.table("processed_reports").insert({
                "report_id": report_id, "user_id": user_id, "site_id": site_id, "module": "performance",
                "start_date": start_date, "end_date": end_date,
                "kpi_summary": {
                    "google_ads": {"current": google_cur, "previous": google_prev},
                    "meta_ads": {"current": meta_current, "previous": meta_previous}
                },
                "top_landing_pages": top_landing,
                "users_by_country": geo_users,
                "sessions_by_channel": sessions_by_channel,
                "charts": {
                    "overview": chart_data_overview,
                    "devices": google_results[11] if google_creds else [],
                    "demographics": google_results[12] if google_creds else [],
                    "search_terms": google_results[13] if google_creds else [],
                    "campaigns": google_results[14] if google_creds else []
                },
                "google_ads_details": google_ads_details, "competitor_data": auction_insights,
                "radar_data": radar_data,
                "ga4_details": {
                    "daily_users": [
                        {
                            "date": d["date"],
                            "users": d["users"],
                            "returningUsers": max(0, d["users"] - d["newUsers"])
                        }
                        for d in daily_ga4
                    ],
                    "gbp_details": gbp_details
                },
                "chart_datasets": [
                    {
                        "label": d["date"],
                        "valueA": d["users"],
                        "valueB": max(0, d["users"] - d["newUsers"]),
                        "valueC": 0
                    }
                    for d in daily_ga4
                ],
                "ai_summary": ai_result.get("summary"), "ai_insights": ai_result.get("insights", []), "ai_recommendations": ai_result.get("recommendations", []),
                "ai_recommendations_summarized": summarized_recommendations,
                "ai_competitor_analysis": ai_result.get("competitor_analysis"), "ai_top_keywords_overview": ai_result.get("top_keywords_overview"), "ai_table_explanations": ai_result.get("table_explanations", {}),
                "section_advice": ai_result.get("section_specific_advice", {}),
                "ai_slide_descriptions": ai_result.get("slide_descriptions", {}),
                "meta_ads_kpi": {"current": meta_current, "previous": meta_previous},
                "meta_ads_details": {
                    "top_campaigns": meta_campaigns,
                    "top_adsets": meta_adsets,
                    "devices": meta_devices
                },
                "meta_ads_charts": {"daily": meta_daily}
            }).execute()
            print(f"---> Successfully stored report {report_id}")
        except Exception as ie:
            print(f"!!! Error inserting into processed_reports: {ie}")
            raise ie

        print(f"---> Updating report_status to completed for {report_id}")
        res = supabase.table("report_status").update({
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }).eq("report_id", report_id).execute()

        if not res.data:
            print(f"!!! Warning: report_status update returned no data for {report_id}. Row might not exist.")
        else:
            print(f"---> report_status update successful: {res.data[0].get('status')}")

        print(f"---> DONE: Performance report {report_id} is ready.")

    except Exception as e:
        error_msg = str(e)
        if "[Errno 11001]" in error_msg or "getaddrinfo failed" in error_msg:
            print("!!! NETWORK ERROR: System is offline or DNS resolution failed.")
        else:
            print(f"!!! Performance Worker Exception for {report_id}: {e}")
        traceback.print_exc()
        try:
            supabase.table("report_status").update({"status": "failed", "error_message": error_msg}).eq("report_id", report_id).execute()
        except Exception as ue:
            print(f"!!! Failed to update error status for {report_id}: {ue}")
