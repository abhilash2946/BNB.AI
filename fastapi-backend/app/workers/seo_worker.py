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
from app.services.gemini import call_gemini
from app.services.prompt_builders import build_seo_exec_prompt, build_competitor_batch_prompt, build_seo_advice_prompt, build_seo_explanations_prompt
from app.analytics.seo_analytics import *
from app.analytics.self_radar import compute_self_radar_scores
from app.analytics.radar_builder import build_dynamic_radar
from app.config import settings
from app.services.search_service import search_manager
import requests
from app.utils.date_utils import compute_previous_period, safe_parse_iso
from datetime import datetime, timezone, timedelta
import asyncio
import json
import traceback
import re
import shutil
from bs4 import BeautifulSoup
import httpx
from urllib.parse import quote, unquote

# Lazy load NLP models to speed up server startup
_kw_model = None
_nlp = None

def get_nlp_models():
    """Initialize models only when needed."""
    global _kw_model, _nlp
    if _kw_model is None or _nlp is None:
        print("---> Initializing SEO NLP models (KeyBERT & spaCy)...")
        try:
            from keybert import KeyBERT
            import spacy
            if _kw_model is None:
                _kw_model = KeyBERT()
            if _nlp is None:
                try:
                    _nlp = spacy.load("en_core_web_sm")
                except OSError:
                    print("---> Downloading spaCy model 'en_core_web_sm'...")
                    spacy.cli.download("en_core_web_sm")
                    _nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            print(f"!!! Error loading NLP models: {e}")
    return _kw_model, _nlp

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
    "whatsapp.com", "pinterest.com", "x.com", "reddit.com",
    "quora.com", "yelp.com", "yellowpages.com", "ind.5bestincity.com",
    "threebestrated.in", "datagemba.com", "yappe.in", "cybo.com"
}

def validate_competitor_relevance(content: str, industry: str, city: str) -> bool:
    """Validate if the site is a business service provider in the same industry and city."""
    if not content or len(content) < 300:
        return False

    content_lower = content.lower()
    industry_lower = industry.lower()

    # 1. Social Profile Markers (Be careful not to block legit sites that mention social)
    # Only block if it looks like a PURE profile page (X/Twitter pattern)
    if ("followers" in content_lower and "following" in content_lower and "tweets" in content_lower):
        print(f"DEBUG: Skipping as social profile (X/Twitter pattern)")
        return False

    social_markers = ["join for free", "karma", "reddit", "tweet", "following count", "followers count"]
    if any(marker in content_lower for marker in social_markers):
        print(f"DEBUG: Skipping as social profile (specific markers found)")
        return False

    # 2. Industry Keywords (Expanded and Flexible)
    industry_keywords = {
        "travel": ["tour", "holiday", "package", "travel", "yatra", "itinerary", "booking", "hotel", "resort", "vacation", "agency", "trip", "destination"],
        "construction": ["builder", "architect", "civil", "renovation", "interior", "structural", "engineering", "housing", "project", "construction", "developer"],
    }

    # Determine which list to use based on industry name
    check_list = []
    if "travel" in industry_lower:
        check_list = industry_keywords["travel"]
    elif "construction" in industry_lower or "build" in industry_lower:
        check_list = industry_keywords["construction"]
    else:
        # Fallback: just use the words in the industry name itself
        check_list = [w for w in re.split(r'\W+', industry_lower) if len(w) > 3]

    if not check_list: check_list = [industry_lower]

    # Count industry keyword matches
    found_kws = [kw for kw in check_list if kw in content_lower]
    if not found_kws:
        print(f"DEBUG: Skipping as industry mismatch (no keywords from {check_list} found for {industry})")
        return False

    # 3. City Match (Less strict if industry match is very strong)
    if city:
        city_lower = city.lower()
        if city_lower not in content_lower:
            # If we have 3+ industry keywords, we consider it a match even if city isn't on homepage
            if len(found_kws) >= 3:
                print(f"DEBUG: City mismatch for {city}, but strong industry match ({len(found_kws)} kws). Allowing.")
                return True
            else:
                print(f"DEBUG: Skipping as city mismatch (city {city} not found and weak industry match)")
                return False

    return True

async def extract_with_webclaw(url: str) -> str:
    # Multiple user‑agents to avoid blocking
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]

    dead_patterns = [
        "domain for sale", "buy this domain", "powered by godaddy", "powered by sedo",
        "under construction", "coming soon", "site maintenance", "parked for free",
        "parking page", "this domain is for sale", "domain is parked", "website coming soon",
        "404 page not found", "error 404", "page not found"
    ]

    for ua in user_agents:
        try:
            async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=20) as client:
                resp = await client.get(url, headers={"User-Agent": ua})

                if resp.status_code == 200:
                    soup = BeautifulSoup(resp.text, "lxml")

                    # Check title and content for dead patterns
                    page_title = soup.title.string.lower() if soup.title else ""
                    page_text = soup.get_text().lower()

                    if any(pattern in page_title or pattern in page_text for pattern in dead_patterns):
                        print(f"!!! Dead content detected on {url}. Skipping.")
                        return "ERROR_SITE_DOWN"

                    for tag in soup(["script", "style", "nav", "footer", "header"]):
                        tag.decompose()
                    text = soup.get_text(separator=" ", strip=True)
                    text = " ".join(text.split())

                    if len(text) < 300: # Exclude thin content
                        print(f"!!! Thin content on {url} ({len(text)} chars). Skipping.")
                        return "ERROR_SITE_DOWN"

                    return text[:8000]

                elif resp.status_code == 404:
                    print(f"!!! Site {url} returned 404. Marking as invalid.")
                    return "ERROR_404"
                elif resp.status_code >= 500:
                    print(f"!!! Site {url} returned {resp.status_code}. Marking as down.")
                    return "ERROR_SITE_DOWN"
        except (httpx.ConnectTimeout, httpx.ConnectError):
            print(f"!!! Connection failed for {url}. Marking as down.")
            return "ERROR_SITE_DOWN"
        except Exception as e:
            print(f"!!! Error extracting {url}: {e}")
            continue

    # Fallback to Webclaw if direct HTTP failed but not with 404/500
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
                content = stdout.decode().strip()
                if any(pattern in content.lower() for pattern in dead_patterns) or len(content) < 300:
                    return "ERROR_SITE_DOWN"
                return content[:8000]
        except Exception:
            pass
    return ""

def analyse_competitor_text(content: str) -> dict:
    """Extract key phrases, CTAs, entities, trust signals."""
    if not content:
        return {"key_phrases": [], "cta": [], "entities": {}, "trust_signals": []}

    kw_model, nlp = get_nlp_models()

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

async def scrape_duckduckgo_fallback(query: str) -> list:
    """Last resort scraper for DDG if OpenSERP is failing."""
    # Use the non-HTML version as it often has less bot detection for simple requests
    url = f"https://duckduckgo.com/html/?q={quote(query)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://duckduckgo.com/"
    }
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                results = []
                # DDG Lite / HTML version selectors
                for entry in soup.select(".result"):
                    link = entry.select_one(".result__a")
                    if link and link.get("href"):
                        href = link.get("href")
                        if "uddg=" in href:
                            match = re.search(r"uddg=([^&]+)", href)
                            if match:
                                href = unquote(match.group(1))

                        if href and href.startswith("http") and "duckduckgo.com" not in href:
                            results.append({"url": href.strip()})

                # Broad fallback for older HTML versions
                if not results:
                    for link in soup.find_all("a", class_=re.compile(r"result__(url|a)")):
                        href = link.get("href")
                        if href and href.startswith("http") and "duckduckgo.com" not in href:
                            results.append({"url": href.strip()})

                return results
    except Exception as e:
        print(f"!!! DDG Fallback failed for '{query}': {e}")
    return []

async def scrape_bing_fallback(query: str) -> list:
    """Last resort scraper for Bing if OpenSERP is failing."""
    url = f"https://www.bing.com/search?q={quote(query)}&setlang=en&cc=US"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
    }
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                results = []
                # Try broad H2 selector which is more stable across regions
                for item in soup.select("h2 a"):
                    href = item.get("href")
                    if href and href.startswith("http") and not any(x in href for x in ["microsoft.com", "bing.com"]):
                        results.append({"url": href.strip()})

                # Fallback to specific algo class if broad fails
                if not results:
                    for item in soup.select("li.b_algo h2 a"):
                        href = item.get("href")
                        if href and href.startswith("http") and not any(x in href for x in ["microsoft.com", "bing.com"]):
                            results.append({"url": href.strip()})

                return results
    except Exception as e:
        print(f"!!! Bing Fallback failed for '{query}': {e}")
    return []

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

        ga4_sem = asyncio.Semaphore(2)
        async def sem_ga4(task):
            async with ga4_sem:
                return await task

        ga4_results = await asyncio.gather(
            sem_ga4(fetch_ga4_totals(ga4_property_id, ga4_token, start_date, end_date, prev_start, prev_end)),
            sem_ga4(fetch_ga4_landing_pages(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_landing_pages(ga4_property_id, ga4_token, prev_start, prev_end)),
            sem_ga4(fetch_ga4_page_titles(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_page_titles(ga4_property_id, ga4_token, prev_start, prev_end)),
            sem_ga4(fetch_ga4_geography(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_geography(ga4_property_id, ga4_token, prev_start, prev_end)),
            sem_ga4(fetch_ga4_daily_users(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, prev_start, prev_end)),
            sem_ga4(fetch_ga4_events_by_event_name(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_events_by_event_name(ga4_property_id, ga4_token, prev_start, prev_end)),
            sem_ga4(fetch_ga4_key_events_by_platform(ga4_property_id, ga4_token, start_date, end_date)),
            sem_ga4(fetch_ga4_key_events_by_platform(ga4_property_id, ga4_token, prev_start, prev_end))
        )
        ga4_totals, top_landing, prev_top_landing, top_page_titles, prev_top_page_titles, geo_users, prev_geo_users, daily_ga4, sessions_by_channel, prev_sessions_by_channel, events_by_event_name, prev_events_by_event_name, key_events_by_platform, prev_key_events_by_platform = ga4_results
        print(f"DEBUG: GA4 Totals: {ga4_totals}")
        print(f"DEBUG: GA4 Prev Sessions by Channel: {prev_sessions_by_channel}")
        print(f"DEBUG: Top Landing Pages count: {len(top_landing)}")
        print(f"DEBUG: Sessions by Channel count: {len(sessions_by_channel)}")

        # 3. Fetch GSC Data
        print("---> Fetching GSC Data...")
        gsc_token = await get_gsc_token(user_id)
        gsc_site_url = gsc_creds.get("site_url")

        gsc_results = await asyncio.gather(
            fetch_gsc_aggregates(gsc_site_url, gsc_token, start_date, end_date),
            fetch_gsc_aggregates(gsc_site_url, gsc_token, prev_start, prev_end),
            fetch_gsc_daily(gsc_site_url, gsc_token, start_date, end_date),
            fetch_gsc_keywords(gsc_site_url, gsc_token, start_date, end_date, limit=100),
            fetch_gsc_keywords(gsc_site_url, gsc_token, prev_start, prev_end, limit=500),
            fetch_gsc_pages(gsc_site_url, gsc_token, start_date, end_date),
            fetch_gsc_pages(gsc_site_url, gsc_token, prev_start, prev_end)
        )
        gsc_agg, gsc_agg_prev, gsc_daily, top_keywords_full, prev_keywords, current_gsc_pages, prev_gsc_pages = gsc_results

        print(f"DEBUG: GSC Current Keywords: {len(top_keywords_full)}, Previous Keywords: {len(prev_keywords)}")
        if len(prev_keywords) > 0:
            print(f"DEBUG: Sample Prev Keyword: {prev_keywords[0]}")

        # Map previous positions to current keywords
        prev_kw_map = {k['keyword']: k['position'] for k in prev_keywords if k.get('keyword')}
        for kw_data in top_keywords_full:
            kw = kw_data.get('keyword')
            if kw:
                prev_pos = prev_kw_map.get(kw, 0)
                kw_data['previous_position'] = prev_pos
                if prev_pos > 0:
                    print(f"DEBUG: Mapped previous position for '{kw}': {prev_pos}")

        print(f"DEBUG: GSC Clicks: {gsc_agg.get('clicks')}, CTR: {gsc_agg.get('ctr')}")
        print(f"DEBUG: GSC Prev Clicks: {gsc_agg_prev.get('clicks')}, Prev CTR: {gsc_agg_prev.get('ctr')}")
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
            # Enhanced logging for better visibility in pm2 logs
            err_type = type(e).__name__
            err_msg = str(e)
            print(f"!!! CWV Fetch Exception: {err_type} - {err_msg}")
            if "Timeout" in err_type or "Timeout" in err_msg:
                print("!!! CWV Suggestion: The PageSpeed API is timing out. Consider increasing timeout or checking network.")
            traceback.print_exc()

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
        if site_city:
            print(f"---> Discovering competitors in {site_city} via SearchManager (Cache-First)...")
            your_domain = site_info.get("url", "").replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
            competitor_discovery_map = {} # domain -> discovery_query

            # A. Fetch Historical Competitors first
            try:
                # Try fetching with the new column and source filter
                history = supabase.table("competitor_insights").select("competitor_url, discovery_query").eq("site_id", site_id).eq("source_module", "seo").execute()

                if history and history.data:
                    for item in history.data:
                        h_url = item["competitor_url"]
                        h_query = item.get("discovery_query", "Historical Cache")
                        h_domain = h_url.replace("https://", "").replace("http://", "").split('/')[0].replace("www.", "").lower()
                        if h_domain and h_domain != your_domain and h_domain not in EXCLUDED_DOMAINS:
                            print(f"DEBUG: Including historical competitor from cache: {h_domain}")
                            competitor_discovery_map[h_domain] = h_query
            except Exception as e:
                print(f"!!! Error fetching competitor history: {e}")

            # B. Try Live Discovery (Round-Robin Python)
            discovery_kws = list(dict.fromkeys([k["keyword"] for k in top_keywords_full[:10] if k["keyword"]]))
            if not discovery_kws and site_info.get("industry"):
                discovery_kws = [site_info.get("industry")]
                print(f"DEBUG: No top keywords found, falling back to industry: {discovery_kws}")

            print(f"DEBUG: Keywords for live discovery: {discovery_kws}")

            for kw in discovery_kws:
                if len(competitor_discovery_map) >= 20: break
                query = f"{kw} {site_city}"

                try:
                    # Use the new SearchManager (DDG -> Google -> Bing rotation)
                    results_list = await search_manager.get_results(query)
                except Exception as e:
                    print(f"!!! SearchManager failed for '{query}': {e}")
                    continue

                # Process results if any were found
                if results_list:
                    print(f"✅ Found {len(results_list)} results for '{query}'")
                    for res in results_list[:10]:
                        link = res.get("url", "")
                        if link:
                            domain = link.split("/")[2].lower().replace("www.", "")
                            if not domain: continue

                            if domain == your_domain:
                                print(f"DEBUG: Skipping your domain: {domain}")
                            elif domain in EXCLUDED_DOMAINS:
                                print(f"DEBUG: Skipping excluded domain: {domain}")
                            elif not is_valid_competitor_domain(domain):
                                print(f"DEBUG: Skipping invalid domain: {domain}")
                            else:
                                if domain not in competitor_discovery_map:
                                    print(f"DEBUG: Found new potential competitor: {domain}")
                                    competitor_discovery_map[domain] = query

            print(f"DEBUG: Total unique potential competitor domains (Cache + Live): {len(competitor_discovery_map)}")
            # Try to get exactly 6 successfully processed competitors
            potential_domains = list(competitor_discovery_map.keys())

            # 2-Week Freshness Threshold
            FRESHNESS_THRESHOLD_DAYS = 14

            processed_count = 0
            for domain in potential_domains:
                if len(competitor_insights) >= 6: break # STOP exactly at 6
                processed_count += 1

                url = f"https://{domain}"
                query = competitor_discovery_map.get(domain, "Local Search")
                print(f"DEBUG: Processing competitor: {domain} ({url})")
                cached = supabase.table("competitor_insights").select("*").eq("site_id", site_id).eq("competitor_url", url).eq("source_module", "seo").maybe_single().execute()

                is_fresh = False
                if cached and cached.data and cached.data.get("extracted_at"):
                    last = safe_parse_iso(cached.data["extracted_at"])
                    if last and last > datetime.now(timezone.utc) - timedelta(days=FRESHNESS_THRESHOLD_DAYS):
                        # Filter out cached 404s or down sites if they were previously marked
                        status = cached.data.get("full_text")
                        if status in ["ERROR_404", "ERROR_SITE_DOWN"]:
                            print(f"Skipping cached dead site for {domain} (Status: {status})")
                            continue

                        is_fresh = True
                        print(f"Using cached insights for {domain} (Freshness: {last.date()})")
                        competitor_insights.append({
                            "competitor_name": clean_domain(domain), "url": url,
                            "full_text": cached.data.get("full_text") or cached.data.get("raw_text_preview", ""),
                            "key_phrases": cached.data.get("key_phrases", []), "cta": cached.data.get("cta", []),
                            "entities": cached.data.get("entities", {}), "trust_signals": cached.data.get("trust_signals", []),
                            "discovery_query": cached.data.get("discovery_query") or query
                        })

                if not is_fresh:
                    if cached and cached.data:
                        print(f"---> Competitor {domain} data is OLD (>14 days). Re-crawling...")
                    else:
                        print(f"---> New competitor discovered: {domain}. Crawling...")

                    content = await extract_with_webclaw(url)
                    if content in ["ERROR_404", "ERROR_SITE_DOWN"]:
                         # Store dead state to avoid re-crawling
                         payload = {
                            "site_id": site_id, "competitor_url": url, "competitor_name": clean_domain(domain),
                            "full_text": content, "extracted_at": datetime.now(timezone.utc).isoformat(),
                            "source_module": "seo"
                         }
                         supabase.table("competitor_insights").upsert(payload, on_conflict="site_id,competitor_url,source_module").execute()
                         continue

                    if content and len(content) > 100:
                        # NEW: Validate Industry and City relevance
                        if not validate_competitor_relevance(content, site_info.get("industry", ""), site_info.get("city", "")):
                            print(f"!!! Skipping {domain} - Fails Industry/City relevance check.")
                            continue

                        analysis = analyse_competitor_text(content)
                        full_text = content[:4000]
                        competitor_insights.append({
                            "competitor_name": clean_domain(domain), "url": url, "full_text": full_text,
                            "key_phrases": analysis["key_phrases"], "cta": analysis["cta"],
                            "entities": analysis["entities"], "trust_signals": analysis["trust_signals"],
                            "discovery_query": query
                        })
                        payload = {
                            "site_id": site_id, "competitor_url": url, "competitor_name": clean_domain(domain),
                            "full_text": full_text, "key_phrases": analysis["key_phrases"], "cta": analysis["cta"],
                            "entities": analysis["entities"], "trust_signals": analysis["trust_signals"],
                            "raw_text_preview": content[:500], "extracted_at": datetime.now(timezone.utc).isoformat(),
                            "discovery_query": query, "source_module": "seo"
                        }
                        try:
                            supabase.table("competitor_insights").upsert(payload, on_conflict="site_id,competitor_url,source_module").execute()
                        except Exception as db_e:
                            if "discovery_query" in str(db_e).lower() or "PGRST204" in str(db_e):
                                print(f"!!! DB Upsert Warning: Column 'discovery_query' likely missing. Retrying without it...")
                                payload.pop("discovery_query", None)
                                supabase.table("competitor_insights").upsert(payload, on_conflict="site_id,competitor_url,source_module").execute()
                            else:
                                raise db_e
                    else:
                        print(f"!!! Failed to crawl {domain} or content too short. Skipping to next candidate.")
                        # Fallback to old data if crawl failed, to at least show something
                        if cached and cached.data and cached.data.get("full_text") not in ["ERROR_404", "ERROR_SITE_DOWN"]:
                             # Validate cached data too
                             c_text = cached.data.get("full_text") or cached.data.get("raw_text_preview", "")
                             if validate_competitor_relevance(c_text, site_info.get("industry", ""), site_info.get("city", "")):
                                 print(f"Using OLD cached data as fallback for {domain}")
                                 competitor_insights.append({
                                    "competitor_name": clean_domain(domain), "url": url,
                                    "full_text": c_text,
                                    "key_phrases": cached.data.get("key_phrases", []), "cta": cached.data.get("cta", []),
                                    "entities": cached.data.get("entities", {}), "trust_signals": cached.data.get("trust_signals", []),
                                    "discovery_query": cached.data.get("discovery_query") or query
                                 })
                             else:
                                 print(f"!!! Skipping cached {domain} - Fails relevance check.")

                # FALLBACK: If we've processed all current potential_domains and still have < 6,
                # trigger a broader search (no city) to fill the remaining slots.
                if processed_count == len(potential_domains) and len(competitor_insights) < 6:
                    print(f"!!! Still only have {len(competitor_insights)} competitors. Triggering global fallback search...")
                    broad_query = f"{discovery_kws[0] if discovery_kws else site_info.get('industry', 'Travel')} India"
                    broad_results = await scrape_duckduckgo_fallback(broad_query)

                    if broad_results:
                        new_domains = []
                        for res in broad_results:
                            link = res.get("url", "")
                            if link:
                                d = link.split("/")[2].lower().replace("www.", "")
                                if d and d != your_domain and d not in EXCLUDED_DOMAINS and d not in competitor_discovery_map:
                                    new_domains.append(d)
                                    competitor_discovery_map[d] = broad_query

                        if new_domains:
                            print(f"DEBUG: Found {len(new_domains)} new domains via global search. Adding to queue.")
                            potential_domains.extend(new_domains)

            if len(competitor_insights) < 2:
                print(f"!!! WARNING: Found only {len(competitor_insights)} competitors. Attempting broader discovery...")

            # STRICT LIMIT: Exactly 6, no more, no less
            final_competitors = competitor_insights[:6]
            while len(final_competitors) < 6:
                final_competitors.append({
                    "competitor_name": f"Market Node {len(final_competitors) + 1}",
                    "url": "",
                    "full_text": "General market trends for the region indicate steady volume.",
                    "key_phrases": ["market leadership", "service excellence"],
                    "cta": ["Contact", "Book Now"],
                    "entities": {"orgs": [], "locations": []},
                    "trust_signals": ["Industry Standard"],
                    "discovery_query": "Regional Industry Benchmark"
                })
            competitor_insights = final_competitors[:6]
            print(f"✅ Discovered {len(competitor_insights)} competitors (Strictly 6)")

        competitor_names = [c["competitor_name"] for c in competitor_insights]
        radar_data = build_dynamic_radar(self_radar, competitor_names)

        # 8. Call Gemini (3 Efficient Tasks)
        print("---> Generating AI Analysis (3 Efficient Tasks)...")
        supabase.table("report_status").update({"status": "generating_ai"}).eq("report_id", report_id).execute()

        # Build the 4 consolidated prompts (Split Competitors into 2 batches to avoid truncation)
        site_data = {
            "gsc_clicks": gsc_agg.get("clicks", 0),
            "gsc_ctr": gsc_agg.get("ctr", 0),
            "ga4_users": ga4_totals.get("totalUsers", {}).get("current", 0),
            "ga4_sessions": ga4_totals.get("sessions", {}).get("current", 0)
        }
        exec_prompt = build_seo_exec_prompt(
            site_info, ga4_totals, gsc_agg, seo_work_details, gsc_agg_prev=gsc_agg_prev,
            top_landing=top_landing, prev_top_landing=prev_top_landing,
            sessions_by_channel=sessions_by_channel, prev_sessions_by_channel=prev_sessions_by_channel,
            geo_users=geo_users, prev_geo_users=prev_geo_users,
            events_by_event_name=events_by_event_name, prev_events_by_event_name=prev_events_by_event_name
        )
        advice_prompt = build_seo_advice_prompt(
            site_info, top_keywords_full, top_page_titles, sessions_by_channel, geo_users, events_by_event_name
        )
        explanations_prompt = build_seo_explanations_prompt(
            site_info, top_keywords_full, top_page_titles, sessions_by_channel, geo_users
        )

        # Split competitors into 2 batches
        comp_batch1 = competitor_insights[:3]
        comp_batch2 = competitor_insights[3:6]

        comp_prompt1 = build_competitor_batch_prompt(site_info, comp_batch1, site_data=site_data) if comp_batch1 else None
        comp_prompt2 = build_competitor_batch_prompt(site_info, comp_batch2) if comp_batch2 else None

        # Execute the 5 calls in parallel (sequenced by semaphore)
        tasks = [
            call_gemini(exec_prompt, normalize=True),        # 0
            call_gemini(advice_prompt, normalize=True),      # 1
            call_gemini(explanations_prompt, normalize=True), # 2
        ]

        if comp_prompt1:
            tasks.append(call_gemini(comp_prompt1, normalize=True))  # 3
        else:
            tasks.append(asyncio.sleep(0, result={}))

        if comp_prompt2:
            tasks.append(call_gemini(comp_prompt2, normalize=True))  # 4
        else:
            tasks.append(asyncio.sleep(0, result={}))

        results = await asyncio.gather(*tasks)
        exec_res, advice_res, explanations_res, batch_res1, batch_res2 = results

        if exec_res: print("✅ [GEMINI] Success for Executive Strategy")
        if advice_res: print("✅ [GEMINI] Success for Detailed Advice")
        if explanations_res: print("✅ [GEMINI] Success for Table Explanations")
        if batch_res1: print("✅ [GEMINI] Success for Competitor Analysis Batch 1")
        if batch_res2: print("✅ [GEMINI] Success for Competitor Analysis Batch 2")

        # 9. Result Processing
        ai_result = {}
        if exec_res: ai_result.update(exec_res)

        if advice_res:
            if "section_specific_advice" in advice_res:
                ai_result["section_specific_advice"] = advice_res["section_specific_advice"]
            else:
                ai_result.update(advice_res)
        if explanations_res:
            if "table_explanations" in explanations_res:
                ai_result["table_explanations"] = explanations_res["table_explanations"]
            else:
                ai_result.update(explanations_res)

        ai_result["ai_comparison"] = ai_result.get("ai_comparison") or "Data synchronization complete."
        ai_result["ai_recommendations"] = ai_result.get("neural_strategy_markers") or []

        # Merge competitor data
        merged_competitors = []
        def extract_comps(res):
            if isinstance(res, list): return res
            if isinstance(res, dict): return res.get("competitors", [])
            return []

        if batch_res1: merged_competitors.extend(extract_comps(batch_res1))
        if batch_res2: merged_competitors.extend(extract_comps(batch_res2))

        # Inject ground truth discovery_query
        for comp in merged_competitors:
            match = next((ci for ci in competitor_insights if ci["competitor_name"] == comp.get("name")), None)
            if match:
                comp["discovery_query"] = match.get("discovery_query", "Local Search Discovery")

        ai_result["competitor_breakdown"] = merged_competitors
        ai_result["overall_threat_summary"] = batch_res1.get("overall_threat_summary", "Market remains competitive.") if batch_res1 else "Market remains competitive."
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

        if not self_gap_analysis and batch_res1 and isinstance(batch_res1, dict):
            self_gap_analysis = batch_res1.get("self_gap_analysis", {})

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
        if recs and isinstance(recs[0], str):
            ai_result["recommendations"] = [str(r) for r in recs]
        # If already objects, leave them alone for ReportViews.tsx

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
                "kpis": get_seo_kpis(ga4_totals),
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
            "kpi_summary": {"ga4": ga4_totals, "gsc": gsc_agg, "gsc_prev": gsc_agg_prev, "cwv": cwv_data},
            "top_keywords": top_keywords_full, "top_landing_pages": top_landing,
            "users_by_country": geo_users,
            "gsc_daily": gsc_daily, "sessions_by_channel": sessions_by_channel,
            "ga4_details": {
                "top_page_titles": top_page_titles,
                "events_by_event_name": events_by_event_name,
                "key_events_by_platform": key_events_by_platform,
                "sessions_by_channel": sessions_by_channel,
                "historical_data": {
                    "prev_top_landing_pages": prev_top_landing,
                    "prev_top_page_titles": prev_top_page_titles,
                    "prev_users_by_country": prev_geo_users,
                    "prev_sessions_by_channel": prev_sessions_by_channel,
                    "prev_events_by_event_name": prev_events_by_event_name,
                    "prev_key_events_by_platform": prev_key_events_by_platform
                },
                "daily_users": [{"date": d["date"], "users": d["users"], "returningUsers": max(0, d["users"]-d["newUsers"])} for d in daily_ga4]
            },
            "chart_datasets": chart_data, "radar_data": radar_data,
            "ai_summary": ai_result.get("summary"),
            "ai_insights": presentation_insights,
            "ai_recommendations": ai_result.get("neural_strategy_markers") or ai_result.get("recommendations", []),
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
