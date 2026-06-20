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
from app.services.gemini import call_gemini, call_ollama_seo_simple
from app.services.prompt_builders import build_seo_exec_prompt, build_seo_deep_dive_prompt, build_competitor_batch_prompt
from app.analytics.seo_analytics import *
from app.analytics.self_radar import compute_self_radar_scores
from app.analytics.radar_builder import build_dynamic_radar
from app.config import settings
import requests
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

async def run_seo_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str, bnb_mode: bool = False):
    print(f"---> Background Task Started for SEO report {report_id} (BnB Mode: {bnb_mode})")
    supabase.table("report_status").update({"status": "fetching_data"}).eq("report_id", report_id).execute()

    try:
        # 1. Fetch Credentials
        creds_resp = supabase.table("site_credentials").select("platform, credentials").eq("site_id", site_id).in_("platform", ["ga4", "google_search_console", "gbp", "google_business_profile"]).execute()
        creds_map = {row["platform"]: row["credentials"] for row in creds_resp.data} if creds_resp and creds_resp.data else {}
        print(f"---> Available Platforms for Site: {list(creds_map.keys())}")

        ga4_creds = creds_map.get("ga4")
        gsc_creds = creds_map.get("google_search_console")
        gbp_creds = creds_map.get("google_business_profile") or creds_map.get("gbp")

        if not ga4_creds or not gsc_creds:
            raise Exception("Missing GA4 or GSC configuration for site")

        prev_start, prev_end = compute_previous_period(start_date, end_date)

        # 2. Fetch GA4 Data
        print("---> Fetching GA4 Data...")
        ga4_token = await get_ga4_token(user_id)
        ga4_property_id = ga4_creds.get("property_id")

        ga4_results = await asyncio.gather(
            fetch_ga4_totals(ga4_property_id, ga4_token, start_date, end_date, prev_start, prev_end),
            fetch_ga4_landing_pages(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_page_titles(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_page_titles(ga4_property_id, ga4_token, prev_start, prev_end),
            fetch_ga4_geography(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_daily_users(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_events_by_event_name(ga4_property_id, ga4_token, start_date, end_date),
            fetch_ga4_key_events_by_platform(ga4_property_id, ga4_token, start_date, end_date)
        )
        ga4_totals, top_landing, top_page_titles, prev_top_page_titles, geo_users, daily_ga4, sessions_by_channel, events_by_event_name, key_events_by_platform = ga4_results
        print(f"DEBUG: GA4 Totals: {ga4_totals}")
        print(f"DEBUG: Top Landing Pages count: {len(top_landing)}")
        print(f"DEBUG: Sessions by Channel count: {len(sessions_by_channel)}")

        # 3. Fetch GSC Data
        print("---> Fetching GSC Data...")
        gsc_token = await get_gsc_token(user_id)
        gsc_site_url = gsc_creds.get("site_url")
        gsc_agg = await fetch_gsc_aggregates(gsc_site_url, gsc_token, start_date, end_date)
        gsc_daily = await fetch_gsc_daily(gsc_site_url, gsc_token, start_date, end_date)
        top_keywords_full = await fetch_gsc_keywords(gsc_site_url, gsc_token, start_date, end_date)
        current_gsc_pages = await fetch_gsc_pages(gsc_site_url, gsc_token, start_date, end_date)
        prev_gsc_pages = await fetch_gsc_pages(gsc_site_url, gsc_token, prev_start, prev_end)
        print(f"DEBUG: GSC Clicks: {gsc_agg.get('clicks')}, CTR: {gsc_agg.get('ctr')}")
        print(f"DEBUG: Top Keywords count: {len(top_keywords_full)}")

        # 4. GBP & CWV
        gbp_details = {}
        if gbp_creds:
            try:
                gbp_token = await get_gbp_token(user_id)
                gbp_details = await fetch_gbp_metrics(gbp_creds.get("location_id"), gbp_token, start_date, end_date)
            except Exception: pass

        cwv_data = {}
        try:
            print("---> Fetching Core Web Vitals...")
            cwv_data = await fetch_core_web_vitals(gsc_site_url)
        except Exception as e:
            print(f"!!! CWV Fetch Exception: {e}")

        # 5. SEO Work Detection
        print("---> Detecting SEO Work...")
        seo_work_details = {
            "new_posts": await detect_new_posts(current_gsc_pages, prev_gsc_pages),
            "meta_tweaks": await detect_meta_tweaks(top_page_titles, prev_top_page_titles),
            "internal_links_count": await detect_internal_links(gsc_site_url, [p["page"] for p in top_landing])
        }

        # 6. Analytics
        print("---> Running SEO Analytics...")
        page_analysis = analyse_page_titles(top_page_titles)
        keyword_analysis = analyse_top_keywords(top_keywords_full)
        event_analysis = analyse_events(events_by_event_name)
        traffic_trend = analyse_traffic_trend(daily_ga4)
        geo_analysis = analyse_geography(geo_users)
        channel_analysis = analyse_channels(sessions_by_channel)
        self_radar = compute_self_radar_scores(ga4_totals, gsc_agg, events_by_event_name, sessions_by_channel)

        # 7. Competitors
        site_resp = supabase.table("sites").select("name, url, industry, city").eq("id", site_id).single().execute()
        site_info = site_resp.data if site_resp else {}
        site_city = site_info.get("city")
        competitor_insights = []
        if site_city and settings.openserp_url:
            print(f"---> Discovering competitors in {site_city} via OpenSERP...")
            your_domain = site_info.get("url", "").replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
            competitor_domains = set()
            for kw in [k["keyword"] for k in top_keywords_full[:5] if k["keyword"]]:
                try:
                    resp = requests.get(f"{settings.openserp_url}/google/search", params={"text": f"{kw} {site_city}"}, timeout=20)
                    if resp.ok:
                        for res in resp.json().get("results", [])[:3]:
                            link = res.get("url", "")
                            if link:
                                domain = link.split("/")[2].lower().replace("www.", "")
                                if domain and is_valid_competitor_domain(domain) and domain != your_domain and domain not in EXCLUDED_DOMAINS:
                                    competitor_domains.add(domain)
                except Exception: continue

            # Merge with History
            try:
                history = supabase.table("competitor_insights").select("competitor_url").eq("site_id", site_id).execute()
                if history and history.data:
                    for item in history.data:
                        h_url = item["competitor_url"]
                        h_domain = h_url.replace("https://", "").replace("http://", "").split('/')[0].replace("www.", "").lower()
                        if h_domain and h_domain != your_domain and h_domain not in EXCLUDED_DOMAINS:
                            print(f"Including historical competitor: {h_domain}")
                            competitor_domains.add(h_domain)
            except Exception: pass

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
                            "key_phrases": cached.data.get("key_phrases", []), "cta": cached.data.get("cta", []),
                            "entities": cached.data.get("entities", {}), "trust_signals": cached.data.get("trust_signals", [])
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
        exec_prompt = build_seo_exec_prompt(
            site_info, ga4_totals, gsc_agg, seo_work_details, cwv_data,
            page_analysis, keyword_analysis, traffic_trend, event_analysis
        )
        deep_dive_prompt = build_seo_deep_dive_prompt(
            site_info, ga4_totals, geo_users, daily_ga4, sessions_by_channel,
            events_by_event_name, key_events_by_platform, gsc_agg,
            top_keywords_full, top_page_titles, gbp_details
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

        # 9. Result Processing
        ai_result = {}
        if exec_res: ai_result.update(exec_res)
        if deep_dive_res: ai_result.update(deep_dive_res)

        ai_result["competitor_breakdown"] = batch_res.get("competitors", []) if batch_res else []
        ai_result["overall_threat_summary"] = batch_res.get("overall_threat_summary", "Market remains competitive.") if batch_res else "Market remains competitive."
        ai_result["radar_self"] = self_radar
        ai_result["radar_data"] = radar_data

        from app.services.gemini import normalize_ai_payload
        ai_result = normalize_ai_payload(ai_result)

        # Data-driven fallback for missing fields
        if ai_result.get("summary") == "Report generated successfully." or not ai_result.get("summary"):
             ai_result["summary"] = f"SEO Performance: {gsc_agg.get('clicks', 0)} clicks and {ga4_totals.get('totalUsers', {}).get('current', 0)} users recorded (CTR: {gsc_agg.get('ctr', 0):.2%})."

        # Competitor Normalization
        competitor_breakdown = ai_result.get("competitor_breakdown", [])
        overall_threat_summary = ai_result.get("overall_threat_summary", "")
        self_gap_analysis = ai_result.get("self_gap_analysis", {})

        comp_analysis = {
            "competitor_breakdown": competitor_breakdown,
            "overall_threat_summary": overall_threat_summary,
            "self_gap_analysis": self_gap_analysis,
            "inferred_actions": [], "actionable_steps": [], "confidence": "medium"
        }
        for c in competitor_breakdown:
            comp_analysis["inferred_actions"].extend(c.get("inferred_actions", []))
            comp_analysis["actionable_steps"].extend(c.get("weaknesses", []))
        if not comp_analysis["inferred_actions"]: comp_analysis["inferred_actions"] = ["No specific shifts detected."]
        ai_result["competitor_analysis"] = comp_analysis

        # Section Advice Normalization
        EXPECTED_ADVICE_KEYS = ["kpi_advice", "demographic_advice", "country_advice", "timeline_advice", "activity_advice", "page_title_advice", "channel_advice", "event_advice", "platform_advice", "keyword_advice"]
        section_advice = ai_result.get("section_specific_advice", {})
        for k, v in list(section_advice.items()):
            section_advice[k] = [v] if isinstance(v, str) else ([str(i) for i in v] if isinstance(v, list) else [str(v)])
        for key in EXPECTED_ADVICE_KEYS:
            if not section_advice.get(key): section_advice[key] = ["No specific advice generated."]
        ai_result["section_specific_advice"] = section_advice

        print("✅ [SEO] AI ANALYSIS SUCCESS")
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

        # 9.5. Build Presentation Insights
        presentation_insights = {
            "branding": {
                "siteName": site_info.get("name"),
                "validatedLabel": "Validated Intelligence Report"
            },
            "slides": {
                "seoPerformanceDesc": ai_result.get("summary", "Search engine performance summary."),
                "kpis": get_seo_kpis(ga4_totals, {}), # Previous GA4 totals not always available here easily
                "trafficEngagementDesc": "Daily user activity and engagement.",
                "activitiesDesc": "SEO and marketing activities performed.",
                "thankYouBody": "The digital marketing initiatives executed have contributed positively toward brand visibility, audience engagement, and business growth."
            },
            "original_insights": ai_result.get("insights", [])
        }

        # 10. Store to Database
        chart_data = [{"label": d["date"], "valueA": d["users"], "valueB": max(0, d["users"]-d["newUsers"]), "valueC": 0} for d in daily_ga4]

        supabase.table("processed_reports").insert({
            "report_id": report_id, "user_id": user_id, "site_id": site_id, "module": "seo",
            "start_date": start_date, "end_date": end_date,
            "kpi_summary": {"ga4": ga4_totals, "gsc": gsc_agg, "cwv": cwv_data},
            "top_keywords": top_keywords_full, "top_landing_pages": top_landing, "top_page_titles": top_page_titles,
            "users_by_country": geo_users, "gsc_daily": gsc_daily, "sessions_by_channel": sessions_by_channel,
            "events_by_event_name": events_by_event_name, "key_events_by_platform": key_events_by_platform,
            "ga4_details": {"sessions_by_channel": sessions_by_channel, "events_by_event_name": events_by_event_name, "key_events_by_platform": key_events_by_platform, "daily_users": [{"date": d["date"], "users": d["users"], "returningUsers": max(0, d["users"]-d["newUsers"])} for d in daily_ga4]},
            "chart_datasets": chart_data, "radar_data": radar_data,
            "ai_summary": ai_result.get("summary"), "ai_insights": presentation_insights, "ai_recommendations": ai_result.get("recommendations", []),
            "ai_recommendations_summarized": summarized_recs, "ai_top_keywords_overview": ai_result.get("top_keywords_overview"),
            "ai_competitor_analysis": ai_result.get("competitor_analysis"), "ai_table_explanations": ai_result.get("table_explanations", {}),
            "improvement_roadmap": ai_result.get("improvement_roadmap"), "competitor_intelligence": {"competitors": competitor_breakdown, "overall_threat_summary": overall_threat_summary},
            "section_advice": section_advice, "ai_slide_descriptions": ai_result.get("slide_descriptions", {}),
            "seo_work_details": seo_work_details, "gbp_details": gbp_details
        }).execute()

        supabase.table("report_status").update({"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}).eq("report_id", report_id).execute()
        print(f"---> DONE: SEO report {report_id}")

    except Exception as e:
        print(f"!!! Error in run_seo_report: {e}")
        traceback.print_exc()
        try:
            supabase.table("report_status").update({
                "status": "failed",
                "error_message": f"Worker Error: {str(e)}"
            }).eq("report_id", report_id).execute()
        except Exception as db_e:
            print(f"!!! CRITICAL: Failed to update report status in DB: {db_e}")
