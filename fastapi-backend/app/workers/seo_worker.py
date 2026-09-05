from app.utils.db_worker_helpers import (
    update_db_report_status,
    get_db_site_credentials,
    get_db_site_info,
    save_db_processed_report,
    get_db_competitor_insights,
    upsert_db_competitor_insight,
    get_db_competitor_insight
)
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
from app.services.competitor_intelligence import competitor_service
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
    "threebestrated.in", "datagemba.com", "yappe.in", "cybo.com",
    "wikipedia.org", "statista.com", "trade.gov", "ibef.org", "investopedia.com",
    "forbes.com", "entrepreneur.com", "hbr.org", "businessinsider.com", "inc.com",
    "medium.com", "amazon.com", "ebay.com", "flipkart.com", "glassdoor.com",
    "naukri.com", "indeed.com", "crunchbase.com", "zoominfo.com",
    "99acres.com", "magicbricks.com", "housing.com", "nobroker.in", "commonfloor.com",
    "proptiger.com", "makaaniq.com", "squareyards.com", "ecommerceguide.com",
    "clutch.co", "goodfirms.co", "sortlist.com", "g2.com", "capterra.com", "trustpilot.com",
    "moneycontrol.com", "indiatimes.com", "ndtv.com", "thehindu.com", "timesofindia.com"
}

def is_valid_competitor_domain(domain: str) -> bool:
    """Filter out social media, informational platforms and invalid TLDs."""
    d = domain.lower().replace("www.", "")
    if d in EXCLUDED_DOMAINS:
        return False
    if any(d.endswith("." + ex) for ex in EXCLUDED_DOMAINS):
        return False

    invalid_keywords = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'whatsapp', 'pinterest', 'google', 'apple', 'microsoft']
    if any(kw in d for kw in invalid_keywords):
        return False

    parts = d.split('.')
    if len(parts) < 2:
        return False
    tld = parts[-1]
    return tld in ['com', 'in', 'co.in', 'org', 'net', 'co', 'io', 'travel', 'ai', 'agency', 'digital']

def validate_competitor_relevance(content: str, industry: str, city: str, level: int = 1) -> bool:
    """
    Validate if the site is a business service provider.
    Level 1: Strict (Industry + City)
    Level 2: Moderate (Industry only)
    Level 3: Relaxed (Any Business service)
    """
    if not content or len(content) < 300:
        return False

    content_lower = content.lower()
    industry_lower = industry.lower()

    # 1. Social Profile/News Markers (Always block)
    block_markers = ["join for free", "karma", "reddit", "tweet", "following count", "followers count", "breaking news", "headlines"]
    if any(marker in content_lower for marker in block_markers):
        return False

    # 2. Industry Keywords (Expanded and Flexible)
    industry_keywords = {
        "travel": ["tour", "holiday", "package", "travel", "yatra", "itinerary", "booking", "hotel", "resort", "vacation", "agency", "trip", "destination"],
        "construction": ["builder", "architect", "civil", "renovation", "interior", "structural", "engineering", "housing", "project", "construction", "developer"],
        "e-commerce": ["shop", "store", "buy", "product", "cart", "online", "retail", "commerce", "fashion", "brand", "delivery", "checkout", "shipping"],
        "real estate": ["property", "flat", "apartment", "villa", "plot", "realestate", "realty", "residential", "commercial", "project", "builders"],
        "marketing": ["agency", "ads", "digital", "branding", "marketing", "media", "strategy", "creative", "campaign", "social", "content"],
    }

    check_list = []
    if "travel" in industry_lower: check_list = industry_keywords["travel"]
    elif "construction" in industry_lower or "build" in industry_lower: check_list = industry_keywords["construction"]
    elif "commerce" in industry_lower or "retail" in industry_lower or "shop" in industry_lower: check_list = industry_keywords["e-commerce"]
    elif "estate" in industry_lower or "property" in industry_lower: check_list = industry_keywords["real estate"]
    elif "marketing" in industry_lower or "media" in industry_lower or "agency" in industry_lower: check_list = industry_keywords["marketing"]
    else:
        check_list = [w for w in re.split(r'\W+', industry_lower) if len(w) > 3]

    if not check_list: check_list = ["business"]

    found_kws = [kw for kw in check_list if kw in content_lower]

    # Logic based on strictness level
    if level == 1:
        # Must have Industry AND City (or 3+ industry kws)
        if not found_kws: return False
        if city and city.lower() in content_lower: return True
        return len(found_kws) >= 3

    if level == 2:
        # Industry only
        return len(found_kws) >= 1

    if level == 3:
        # Relaxed: Common business markers
        common_business = ["contact", "about", "services", "copyright", "rights reserved", "solutions", "partners"]
        business_matches = [w for w in common_business if w in content_lower]
        return len(business_matches) >= 2 or len(found_kws) >= 1

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
    update_db_report_status(report_id, "fetching_data")

    try:
        # 1. Fetch Credentials
        creds_list = get_db_site_credentials(site_id, ["ga4", "google_search_console", "gbp", "google_business_profile"])
        creds_map = {row["platform"]: row["credentials"] for row in creds_list}
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

        ga4_results_raw = await asyncio.gather(
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
            sem_ga4(fetch_ga4_key_events_by_platform(ga4_property_id, ga4_token, prev_start, prev_end)),
            return_exceptions=True
        )

        ga4_results = [r if not isinstance(r, Exception) else {} for r in ga4_results_raw]
        ga4_totals, top_landing, prev_top_landing, top_page_titles, prev_top_page_titles, geo_users, prev_geo_users, daily_ga4, sessions_by_channel, prev_sessions_by_channel, events_by_event_name, prev_events_by_event_name, key_events_by_platform, prev_key_events_by_platform = ga4_results
        print(f"DEBUG: GA4 Totals: {ga4_totals}")
        print(f"DEBUG: GA4 Prev Sessions by Channel: {prev_sessions_by_channel}")
        print(f"DEBUG: Top Landing Pages count: {len(top_landing)}")
        print(f"DEBUG: Sessions by Channel count: {len(sessions_by_channel)}")

        # 3. Fetch GSC Data
        print("---> Fetching GSC Data...")
        gsc_token = await get_gsc_token(user_id)
        gsc_site_url = gsc_creds.get("site_url")

        gsc_results_raw = await asyncio.gather(
            fetch_gsc_aggregates(gsc_site_url, gsc_token, start_date, end_date),
            fetch_gsc_aggregates(gsc_site_url, gsc_token, prev_start, prev_end),
            fetch_gsc_daily(gsc_site_url, gsc_token, start_date, end_date),
            fetch_gsc_keywords(gsc_site_url, gsc_token, start_date, end_date, limit=100),
            fetch_gsc_keywords(gsc_site_url, gsc_token, prev_start, prev_end, limit=500),
            fetch_gsc_pages(gsc_site_url, gsc_token, start_date, end_date),
            fetch_gsc_pages(gsc_site_url, gsc_token, prev_start, prev_end),
            return_exceptions=True
        )

        gsc_results = [r if not isinstance(r, Exception) else ({} if i < 2 else []) for i, r in enumerate(gsc_results_raw)]
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
        print(f"✅ Finished GSC Data mapping for {len(top_keywords_full)} keywords.")

        # 4. GBP & CWV
        gbp_details = {}
        if gbp_creds:
            try:
                print("---> Fetching GBP Data...")
                gbp_token = await get_gbp_token(user_id)
                gbp_details = await fetch_gbp_metrics(gbp_creds.get("location_id"), gbp_token, start_date, end_date)
            except Exception as e:
                print(f"!!! GBP Fetch Error: {e}")

        cwv_data = {}
        try:
            print("---> Fetching Core Web Vitals...")
            cwv_data = await fetch_core_web_vitals(gsc_site_url)
        except Exception as e:
            print(f"!!! CWV Fetch Error: {e}")

        # 5. SEO Work Detection
        print("---> Detecting SEO Work...")
        seo_work_results = await asyncio.gather(
            detect_new_posts(current_gsc_pages, prev_gsc_pages),
            detect_meta_tweaks(top_page_titles, prev_top_page_titles),
            detect_internal_links(gsc_site_url, [p["page"] for p in top_landing]),
            return_exceptions=True
        )

        seo_work_details = {
            "new_posts": seo_work_results[0] if not isinstance(seo_work_results[0], Exception) else [],
            "meta_tweaks": seo_work_results[1] if not isinstance(seo_work_results[1], Exception) else [],
            "internal_links_count": seo_work_results[2] if not isinstance(seo_work_results[2], Exception) else 0
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
        site_info = get_db_site_info(site_id)
        site_city = site_info.get("city")
        competitor_insights = []

        if site_city:
            # --- NEW DYNAMIC PROFILING ---
            await competitor_service.profile_user_business(site_info.get("url", ""))

            print(f"---> [COMPETITOR_ENGINE] Starting Robust Discovery for {site_info.get('name')} in {site_city}...")

            # Define core services
            industry = site_info.get("industry", "Business").lower()
            services = [industry]

            # Extract generic commercial keywords
            commercial_kws = [k["keyword"] for k in top_keywords_full[:20]
                             if competitor_service.classifier.classify(k["keyword"]) == "Service"]
            services.extend(commercial_kws[:3])

            # 1. Discover Candidates Loop (with Broadening Fallback)
            search_level = 1 # 1: Neighborhood, 2: City, 3: Region/National
            locations = [site_city, "Hyderabad", "India"] # Example fallback list

            while len(competitor_insights) < 2 and search_level <= 3:
                current_loc = locations[search_level-1]
                print(f"DEBUG: [COMPETITOR_LOOP] Level {search_level} - Searching in {current_loc}...")

                candidates = await competitor_service.discover_candidates(
                    services=list(set(services)), city=current_loc
                )

                for cand in candidates[:15]: # Scan more candidates in the loop
                    if len(competitor_insights) >= 6: break

                    domain = cand["domain"]
                    url = cand["representative_url"]
                    db_cached = get_db_competitor_insight(site_id, url, "seo")

                    valid_content = None
                    if db_cached and db_cached.get("extracted_at"):
                        last = safe_parse_iso(db_cached["extracted_at"])
                        if last and last > datetime.now(timezone.utc) - timedelta(days=FRESHNESS_THRESHOLD_DAYS):
                            valid_content = db_cached.get("full_text")

                    if not valid_content:
                        content = await extract_with_webclaw(url)
                        if content and len(content) > 300:
                            if competitor_service.scorer.validate_relevance(
                                content, site_info.get("industry", ""), site_city,
                                level=1, profile=competitor_service.business_profile
                            ):
                                valid_content = content
                                analysis = competitor_service.analyse_text(content)
                                upsert_db_competitor_insight({
                                    "site_id": site_id, "competitor_url": url, "competitor_name": clean_domain(domain),
                                    "full_text": content[:4000], "key_phrases": analysis["key_phrases"],
                                    "cta": analysis["cta"], "entities": analysis["entities"],
                                    "trust_signals": analysis["trust_signals"], "raw_text_preview": content[:500],
                                    "extracted_at": datetime.now(timezone.utc), "discovery_query": "SERP Robust Discovery",
                                    "source_module": "seo"
                                })

                    if valid_content:
                        analysis = competitor_service.analyse_text(valid_content)
                        # Check if already added
                        if not any(c["url"] == url for c in competitor_insights):
                            competitor_insights.append({
                                "competitor_name": clean_domain(domain), "url": url, "full_text": valid_content[:4000],
                                "key_phrases": analysis["key_phrases"], "cta": analysis["cta"],
                                "entities": analysis["entities"], "trust_signals": analysis["trust_signals"],
                                "discovery_query": f"Direct Competitor ({current_loc})"
                            })

                search_level += 1 # Broaden for next iteration if < 2 found

            print(f"✅ [COMPETITOR_ENGINE] Final Validated Competitors: {len(competitor_insights)}")
      competitor_names = [c["competitor_name"] for c in competitor_insights]
        radar_data = build_dynamic_radar(self_radar, competitor_names)

        # 8. Call Gemini (3 Efficient Tasks)
        print("---> Generating AI Analysis (3 Efficient Tasks)...")
        update_db_report_status(report_id, "generating_ai")

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

        # ALWAYS generate comp_prompt1 to ensure self_gap_analysis is returned even with 0 competitors
        comp_prompt1 = build_competitor_batch_prompt(site_info, comp_batch1, site_data=site_data)
        comp_prompt2 = build_competitor_batch_prompt(site_info, comp_batch2) if comp_batch2 else None

        # Execute the 5 calls in parallel (sequenced by semaphore)
        tasks = [
            call_gemini(exec_prompt, normalize=True),        # 0
            call_gemini(advice_prompt, normalize=True),      # 1
            call_gemini(explanations_prompt, normalize=True), # 2
            call_gemini(comp_prompt1, normalize=True),       # 3
        ]

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

        save_db_processed_report({
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
            "chart_datasets": chart_data, "radar_data": radar_data, "radar_self": self_radar,
            "ai_summary": ai_result.get("summary"),
            "ai_insights": presentation_insights,
            "ai_recommendations": ai_result.get("neural_strategy_markers") or ai_result.get("recommendations", []),
            "ai_recommendations_summarized": summarized_recs, "ai_top_keywords_overview": ai_result.get("top_keywords_overview"),
            "ai_competitor_analysis": ai_result.get("competitor_analysis"), "ai_table_explanations": ai_result.get("table_explanations", {}),
            "improvement_roadmap": ai_result.get("improvement_roadmap"), "competitor_intelligence": {"competitors": competitor_breakdown, "overall_threat_summary": overall_threat_summary},
            "section_advice": section_advice, "ai_slide_descriptions": ai_result.get("slide_descriptions", {}),
            "seo_work_details": seo_work_details, "gbp_details": gbp_details,
            "self_gap_analysis": self_gap_analysis
        })

        update_db_report_status(report_id, "completed")
        print(f"---> DONE: SEO report {report_id}")

    except Exception as e:
        print(f"!!! Error in run_seo_report: {e}")
        traceback.print_exc()
        try:
            update_db_report_status(report_id, "failed", error_message=f"Worker Error: {str(e)}")
        except Exception as db_e:
            print(f"!!! CRITICAL: Failed to update report status in DB: {db_e}")
