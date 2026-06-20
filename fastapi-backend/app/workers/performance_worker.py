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
from app.analytics.performance_analytics import *
from app.analytics.radar_builder import build_dynamic_radar
from app.config import settings
import requests
from app.services.gemini import call_gemini, call_ollama_simple
from app.services.prompt_builders import build_performance_exec_prompt, build_performance_deep_dive_prompt, build_competitor_batch_prompt
from app.utils.date_utils import compute_previous_period
from datetime import datetime, timezone, timedelta
import asyncio
import json
import traceback
import re
import shutil
from bs4 import BeautifulSoup
from keybert import KeyBERT
import spacy
import httpx

# Load NLP models once (to avoid reloading per report)
try:
    kw_model = KeyBERT()
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    print(f"!!! Error loading NLP models: {e}")
    kw_model = None
    nlp = None

def clean_domain(domain: str) -> str:
    """Remove www. and common TLDs, capitalise first letter."""
    domain = domain.lower()
    if domain.startswith("www."):
        domain = domain[4:]
    for tld in [".com", ".in", ".co.in", ".org", ".net"]:
        if domain.endswith(tld):
            domain = domain[:-len(tld)]
    return domain.capitalize()

def is_valid_competitor_domain(domain: str) -> bool:
    """Filter out social media and invalid TLDs."""
    invalid_keywords = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'whatsapp', 'pinterest']
    if any(kw in domain for kw in invalid_keywords):
        return False
    parts = domain.split('.')
    if len(parts) < 2:
        return False
    tld = parts[-1]
    return tld in ['com', 'in', 'co.in', 'org', 'net', 'co', 'io', 'travel']

EXCLUDED_DOMAINS = {
    "justdial.com", "sulekha.com", "indiamart.com", "facebook.com",
    "instagram.com", "twitter.com", "linkedin.com", "youtube.com",
    "gov.in", "nic.in", "tourism.telangana.gov.in", "redbus.in",
    "tripadvisor.in", "scribd.com", "yourstory.com",
    "whatsapp.com", "pinterest.com"
}

async def extract_with_webclaw(url: str) -> str:
    # Multiple user‑agents to avoid blocking
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    for ua in user_agents:
        try:
            async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=25) as client:
                resp = await client.get(url, headers={"User-Agent": ua})
                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "lxml")
                    for tag in soup(["script", "style", "nav", "footer", "header"]):
                        tag.decompose()
                    text = soup.get_text(separator=" ", strip=True)
                    text = " ".join(text.split())
                    if len(text) > 200:
                        return text[:8000]   # keep up to 8000 chars
        except Exception:
            continue

    # Fallback to Webclaw
    webclaw_path = shutil.which('webclaw')
    if webclaw_path:
        try:
            proc = await asyncio.create_subprocess_exec(
                webclaw_path, '--only-main-content', '--format', 'llm', url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=20)
            if proc.returncode == 0 and stdout:
                return stdout.decode().strip()[:8000]
        except Exception:
            pass
    return ""

def analyse_competitor_text(content: str) -> dict:
    """Extract key phrases, CTAs, entities, trust signals."""
    if not content:
        return {"key_phrases": [], "cta": [], "entities": {}, "trust_signals": []}

    # Key phrases using KeyBERT
    key_phrases = []
    if kw_model:
        try:
            keywords = kw_model.extract_keywords(content, keyphrase_ngram_range=(1,3), top_n=5)
            key_phrases = [kw[0] for kw in keywords]
        except Exception:
            pass

    # Named entities using spaCy
    entities = {"ORGS": [], "GPE": []}
    if nlp:
        try:
            doc = nlp(content[:10000])
            for ent in doc.ents:
                if ent.label_ == "ORG":
                    entities["ORGS"].append(ent.text)
                elif ent.label_ == "GPE":
                    entities["GPE"].append(ent.text)
            entities = {k: list(set(v)) for k, v in entities.items()}
        except Exception:
            pass

    # Call-to-action detection
    cta_patterns = ["book now", "contact us", "get quote", "request callback",
                    "free consultation", "enquire now", "get a quote", "call us"]
    found_cta = [cta for cta in cta_patterns if cta in content.lower()]

    # Trust signals
    trust_words = ["years of experience", "trusted", "award", "certified", "iso", "best travel agency"]
    trust_signals = [word for word in trust_words if word in content.lower()]

    return {
        "key_phrases": key_phrases,
        "cta": found_cta,
        "entities": entities,
        "trust_signals": trust_signals
    }

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

async def run_performance_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str, bnb_mode: bool = False):
    print(f"---> Background Task Started for Performance report {report_id} (BnB Mode: {bnb_mode})")
    supabase.table("report_status").update({"status": "fetching_data"}).eq("report_id", report_id).execute()

    try:
        # 1. Fetch site credentials for ads platforms
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["ga4", "google_ads", "meta_ads", "gbp", "google_business_profile"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data} if creds_resp and creds_resp.data else {}
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
                if user_creds and user_creds.data:
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
        if meta_task: all_tasks.append(meta_task)
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
            print(f"✅ [GADS] DATA FETCH SUCCESS.")
            print(f"DEBUG: GADS Spend: ₹{google_cur.get('cost')}, Leads: {google_cur.get('conversions')}")
            print(f"DEBUG: GADS Top Campaigns count: {len(google_ads_details['top_campaigns'])}")

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

                print(f"✅ [META] DATA FETCH SUCCESS.")
                print(f"DEBUG: META Spend: ₹{meta_current.get('spend')}, Leads: {meta_current.get('leads')}")
                print(f"DEBUG: META Campaigns count: {len(meta_campaigns)}")
            else:
                print(f"❌ [META] DATA FETCH CRITICAL ERROR: {m_res_raw}")
            idx += 1

        if ga4_tasks:
            ga_res = all_results[idx:idx+5]
            ga_results = [r if not isinstance(r, Exception) else {} for r in ga_res]
            ga4_totals, daily_ga4, sessions_by_channel, geo_users, top_landing = ga_results
            print(f"✅ [GA4] DATA FETCH SUCCESS.")
            idx += 5

        if gbp_task:
            gbp_res = all_results[idx]
            if not isinstance(gbp_res, Exception):
                gbp_details = gbp_res
                print(f"✅ [GMB] DATA FETCH SUCCESS.")
            else:
                print(f"❌ [GMB] DATA FETCH FAILED.")
            idx += 1

        # 5. Site Info & AI Analysis
        site_resp = supabase.table("sites").select("name, url, industry, city").eq("id", site_id).single().execute()
        site_info = site_resp.data if site_resp else {}

        # 6. Perform Advanced Performance Analytics
        print("---> Running Performance Analytics...")
        perf_kpi_analysis = analyse_performance_kpis(google_cur, meta_current, google_prev, meta_previous)
        print(f"DEBUG: Perf KPI Analysis: {perf_kpi_analysis}")
        campaign_eff_analysis = analyse_campaign_efficiency(google_ads_details.get('top_campaigns', []))
        self_radar = compute_performance_self_radar(google_cur, meta_current, ga4_totals)

        # 7. Competitor Discovery
        site_city = site_info.get("city")
        competitor_insights = []
        if site_city and settings.openserp_url:
            print(f"---> Discovering competitors in {site_city} via OpenSERP...")
            your_domain = site_info.get("url", "").replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
            top_kw = [k.get('keyword') for k in google_ads_details.get('top_keywords', [])[:3] if k.get('keyword')]
            competitor_domains = set()
            for kw in top_kw:
                try:
                    query = f"{kw} {site_city}"
                    resp = requests.get(f"{settings.openserp_url}/google/search", params={"text": query}, timeout=20)
                    if resp.ok:
                        results_list = resp.json().get("results", [])
                        for res in results_list[:3]:
                            link = res.get("url", "")
                            if link:
                                domain = link.split("/")[2].lower().replace("www.", "")
                                if domain and is_valid_competitor_domain(domain) and domain != your_domain and domain not in EXCLUDED_DOMAINS:
                                    competitor_domains.add(domain)
                except Exception: continue

            # Limit competitors to avoid overloading AI (Top 6)
            competitor_domains = list(competitor_domains)[:6]

            for domain in competitor_domains:
                url = f"https://{domain}"
                cached = supabase.table("competitor_insights").select("*").eq("site_id", site_id).eq("competitor_url", url).maybe_single().execute()
                if cached and cached.data and cached.data.get("extracted_at"):
                    last = datetime.fromisoformat(cached.data["extracted_at"].replace('Z', '+00:00'))
                    if last > datetime.now(timezone.utc) - timedelta(days=7):
                        print(f"Using cached insights for {domain}")
                        competitor_insights.append({
                            "competitor_name": clean_domain(domain), "url": url,
                            "full_text": cached.data.get("full_text") or cached.data.get("raw_text_preview", ""),
                            "key_phrases": cached.data.get("key_phrases", []),
                            "cta": cached.data.get("cta", []),
                            "entities": cached.data.get("entities", {}),
                            "trust_signals": cached.data.get("trust_signals", [])
                        })
                        continue

                content = await extract_with_webclaw(url)
                if content and len(content) > 100:
                    analysis = analyse_competitor_text(content)
                    full_text = content[:4000]
                    competitor_insights.append({
                        "competitor_name": clean_domain(domain), "url": url, "full_text": full_text,
                        "key_phrases": analysis["key_phrases"], "cta": analysis["cta"],
                        "entities": analysis["entities"], "trust_signals": analysis["trust_signals"]
                    })
                    supabase.table("competitor_insights").upsert({
                        "site_id": site_id, "competitor_url": url, "competitor_name": clean_domain(domain),
                        "full_text": full_text, "key_phrases": analysis["key_phrases"], "cta": analysis["cta"],
                        "entities": analysis["entities"], "trust_signals": analysis["trust_signals"],
                        "raw_text_preview": content[:500], "extracted_at": datetime.now(timezone.utc).isoformat()
                    }, on_conflict="site_id,competitor_url").execute()
            print(f"✅ Discovered {len(competitor_insights)} competitors: {[c['competitor_name'] for c in competitor_insights]}")

        competitor_names = [c["competitor_name"] for c in competitor_insights]
        radar_data = build_dynamic_radar(self_radar, competitor_names)

        # 8. Call Gemini (Only 3 combined calls)
        print("---> Generating AI Analysis (3 Combined Calls)...")
        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()

        # Build the 3 combined prompts
        exec_prompt = build_performance_exec_prompt(
            site_info, google_cur, google_prev, google_ads_details,
            meta_current, meta_previous, ga4_totals,
            perf_kpi_analysis, campaign_eff_analysis
        )
        deep_dive_prompt = build_performance_deep_dive_prompt(
            site_info, google_cur, google_prev, google_ads_details,
            meta_current, meta_campaigns, meta_adsets, meta_devices,
            ga4_totals, gbp_details
        )
        competitor_prompt = build_competitor_batch_prompt(site_info, competitor_insights) if competitor_insights else None

        # Execute the 3 calls in parallel
        tasks = [
            call_gemini(exec_prompt, normalize=True),  # 1
            call_gemini(deep_dive_prompt, normalize=True),  # 2
        ]
        if competitor_prompt:
            tasks.append(call_gemini(competitor_prompt, normalize=True))  # 3
        else:
            tasks.append(asyncio.sleep(0, result={}))

        results = await asyncio.gather(*tasks)
        exec_res, deep_dive_res, batch_res = results

        if exec_res: print("✅ [GEMINI] Success for Executive Strategy")
        if deep_dive_res: print("✅ [GEMINI] Success for Deep Dive Analysis")
        if batch_res: print("✅ [GEMINI] Success for Competitor Analysis")

        # 9. Process Result
        ai_result = {}
        if exec_res: ai_result.update(exec_res)
        if deep_dive_res: ai_result.update(deep_dive_res)

        ai_result["competitor_breakdown"] = batch_res.get("competitors", []) if batch_res else []
        ai_result["overall_threat_summary"] = batch_res.get("overall_threat_summary", "Market landscape remains competitive.") if batch_res else "Market landscape remains competitive."
        ai_result["radar_self"] = self_radar
        ai_result["radar_data"] = radar_data

        from app.services.gemini import normalize_ai_payload
        ai_result = normalize_ai_payload(ai_result)

        # Data-driven fallback for missing fields
        if ai_result.get("summary") == "Report generated successfully." or not ai_result.get("summary"):
             ai_result["summary"] = f"Performance: {perf_kpi_analysis.get('total_leads', 0)} leads from ₹{perf_kpi_analysis.get('total_spend', 0):.2f} spend (CPL: ₹{perf_kpi_analysis.get('combined_cpl')})."

        # Normalization of sub-objects
        competitor_breakdown = ai_result.get("competitor_breakdown", [])
        overall_threat_summary = ai_result.get("overall_threat_summary", "")
        self_gap_analysis = ai_result.get("self_gap_analysis", {})

        competitor_analysis = {
            "competitor_breakdown": competitor_breakdown,
            "overall_threat_summary": overall_threat_summary,
            "self_gap_analysis": self_gap_analysis,
            "inferred_actions": [], "actionable_steps": [], "confidence": "medium"
        }
        for c in competitor_breakdown:
            competitor_analysis["inferred_actions"].extend(c.get("inferred_actions", []))
            competitor_analysis["actionable_steps"].extend(c.get("weaknesses", []))

        if not competitor_analysis["inferred_actions"]: competitor_analysis["inferred_actions"] = ["No specific competitor actions inferred."]
        if not competitor_analysis["actionable_steps"]: competitor_analysis["actionable_steps"] = ["Monitor market shifts."]
        ai_result["competitor_analysis"] = competitor_analysis

        # Section Advice Normalization
        EXPECTED_ADVICE_KEYS = [
            "kpi_advice", "campaign_advice", "keyword_advice", "device_advice",
            "search_term_advice", "demographic_advice", "day_hour_advice",
            "network_advice", "asset_advice", "meta_kpi_advice", "meta_campaign_advice",
            "meta_adset_advice", "meta_device_advice"
        ]
        section_advice = ai_result.get("section_specific_advice", {})
        for k, v in list(section_advice.items()):
            section_advice[k] = [v] if isinstance(v, str) else ([str(i) for i in v] if isinstance(v, list) else [str(v)])
        for key in EXPECTED_ADVICE_KEYS:
            if not section_advice.get(key): section_advice[key] = ["No specific advice generated."]
        ai_result["section_specific_advice"] = section_advice

        print("✅ [PERFORMANCE] AI ANALYSIS SUCCESS")
        print(f"DEBUG: table_explanations = {ai_result.get('table_explanations', {})}")
        print(f"DEBUG: section_advice = {ai_result.get('section_specific_advice', {})}")

        # Recommendations
        recs = ai_result.get("recommendations", [])
        ai_result["recommendations"] = [str(r) for r in recs] if isinstance(recs, list) else [str(recs)]

        # Use recommendations_summarized from Gemini if available, otherwise fallback
        summarized_recs = ai_result.get("recommendations_summarized", [])
        if not summarized_recs or len(summarized_recs) != len(ai_result["recommendations"]):
             summarized_recs = [" ".join(str(r).split()[:10]) + "..." for r in ai_result["recommendations"]]


        # Sanitize strings
        for key in ["summary", "top_keywords_overview"]:
            if not isinstance(ai_result.get(key), str): ai_result[key] = "Detailed analysis in sections."

        # 9.5. Build Presentation Insights for the new slides
        presentation_insights = {
            "branding": {
                "siteName": site_info.get("name"),
                "validatedLabel": "Validated Intelligence Report"
            },
            "slides": {
                "overallPerformanceDesc": ai_result.get("summary", "Key performance indicators across all channels."),
                "kpis": perf_kpi_analysis.get("overall_kpis", []),
                "googleAdsKpis": perf_kpi_analysis.get("google_ads_kpis", []),
                "metaAdsKpis": perf_kpi_analysis.get("meta_ads_kpis", []),
                "googleCampaigns": format_campaign_data(google_ads_details.get("top_campaigns", []), platform="google"),
                "metaCampaigns": format_campaign_data(meta_campaigns, platform="meta"),
                "leadGenDesc": "Breakdown of leads by acquisition channel.",
                "competitorDesc": ai_result.get("overall_threat_summary", "Competitor intelligence summary."),
                "thankYouBody": "The digital marketing initiatives executed have contributed positively toward brand visibility, audience engagement, and business growth."
            },
            "original_insights": ai_result.get("insights", [])
        }

        # 10. Store to Database
        supabase.table("processed_reports").insert({
            "report_id": report_id, "user_id": user_id, "site_id": site_id, "module": "performance",
            "start_date": start_date, "end_date": end_date,
            "kpi_summary": {"google_ads": {"current": google_cur, "previous": google_prev}, "meta_ads": {"current": meta_current, "previous": meta_previous}},
            "top_landing_pages": top_landing, "users_by_country": geo_users, "sessions_by_channel": sessions_by_channel,
            "charts": {"overview": chart_data_overview, "devices": google_results[11], "demographics": google_results[12], "search_terms": google_results[13], "campaigns": google_results[14]},
            "google_ads_details": google_ads_details, "competitor_data": auction_insights, "radar_data": radar_data,
            "ga4_details": {"daily_users": [{"date": d["date"], "users": d["users"], "returningUsers": max(0, d["users"]-d["newUsers"])} for d in daily_ga4], "gbp_details": gbp_details},
            "chart_datasets": [{"label": d["date"], "valueA": d["users"], "valueB": max(0, d["users"]-d["newUsers"]), "valueC": 0} for d in daily_ga4],
            "ai_summary": ai_result.get("summary"), "ai_insights": presentation_insights, "ai_recommendations": ai_result.get("recommendations", []),
            "ai_recommendations_summarized": summarized_recs, "ai_competitor_analysis": ai_result.get("competitor_analysis"), "ai_top_keywords_overview": ai_result.get("top_keywords_overview"),
            "ai_table_explanations": ai_result.get("table_explanations", {}), "improvement_roadmap": ai_result.get("improvement_roadmap"), "competitor_intelligence": {"competitors": competitor_breakdown, "overall_threat_summary": overall_threat_summary},
            "section_advice": section_advice, "ai_slide_descriptions": ai_result.get("slide_descriptions", {}),
            "meta_ads_kpi": {"current": meta_current, "previous": meta_previous},
            "meta_ads_details": {"top_campaigns": meta_campaigns, "top_adsets": meta_adsets, "devices": meta_devices},
            "meta_ads_charts": {"daily": meta_daily}
        }).execute()

        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()
        print(f"---> DONE: Performance report {report_id}")

    except Exception as e:
        print(f"!!! Error in run_performance_report: {e}")
        traceback.print_exc()
        try:
            supabase.table("report_status").update({
                "status": "failed",
                "error_message": f"Worker Error: {str(e)}"
            }).eq("report_id", report_id).execute()
        except Exception as db_e:
            print(f"!!! CRITICAL: Failed to update report status in DB: {db_e}")
