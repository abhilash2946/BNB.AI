from app.utils.db_worker_helpers import (
    update_db_report_status,
    get_db_site_credentials,
    get_db_site_info,
    save_db_processed_report,
    get_db_competitor_insights,
    upsert_db_competitor_insight,
    get_db_user_credentials,
    get_db_competitor_insight
)
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
from app.services.competitor_intelligence import competitor_service
import requests
from app.services.gemini import call_gemini
from app.services.prompt_builders import build_performance_exec_prompt, build_competitor_batch_prompt, build_performance_advice_prompt, build_performance_explanations_prompt
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
        print("---> Initializing Performance NLP models (KeyBERT & spaCy)...")
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
    "clutch.co", "goodfirms.co", "sortlist.com", "g2.com", "capterra.com", "trustpilot.com"
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
    elif "commerce" in industry_lower or "retail" in industry_lower: check_list = industry_keywords["e-commerce"]
    elif "estate" in industry_lower or "property" in industry_lower: check_list = industry_keywords["real estate"]
    elif "marketing" in industry_lower: check_list = industry_keywords["marketing"]
    else:
        check_list = [w for w in re.split(r'\W+', industry_lower) if len(w) > 3]

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

async def run_performance_report(user_id: str, site_id: str, start_date: str, end_date: str, report_id: str, bnb_mode: bool = False):
    print(f"---> Background Task Started for Performance report {report_id} (BnB Mode: {bnb_mode})")
    update_db_report_status(report_id, "fetching_data")

    try:
        # 1. Fetch site credentials for ads platforms
        creds_data = get_db_site_credentials(site_id, ["ga4", "google_ads", "meta_ads", "gbp", "google_business_profile"])
        creds_map = {row["platform"]: row["credentials"] for row in creds_data}
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
        google_results = [None] * 20 # Ensure indexing works
        auction_insights = []
        chart_data_overview = []
        meta_current = meta_previous = {}
        meta_campaigns = meta_campaigns_prev = []
        meta_daily = []
        meta_adsets = meta_adsets_prev = []
        meta_devices = meta_devices_prev = []
        meta_details = {} # Added missing initialization
        gbp_details = {}
        ga4_totals = {}
        daily_ga4 = []
        sessions_by_channel = []
        geo_users = []
        top_landing = []

        # 2. Compute previous period
        prev_start, prev_end = compute_previous_period(start_date, end_date)
        print(f"DEBUG: Report Range: {start_date} to {end_date}")
        print(f"DEBUG: Comparison Period: {prev_start} to {prev_end}")

        # 3. Initialize tasks for all platforms
        google_tasks = []
        meta_task = None
        ga4_tasks = []
        gbp_task = None

        if google_creds:
            ga_customer_id = google_creds.get("customer_id")
            login_customer_id = google_creds.get("login_customer_id")
            if ga_customer_id:
                print(f"---> Queueing Google Ads tasks for {ga_customer_id} (Login CID: {login_customer_id})...")
                google_tasks = [
                    asyncio.create_task(fetch_google_ads_totals(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_totals(user_id, ga_customer_id, prev_start, prev_end, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_data(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_campaigns(user_id, ga_customer_id, start_date, end_date, 10, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_campaigns(user_id, ga_customer_id, prev_start, prev_end, 10, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_keywords(user_id, ga_customer_id, start_date, end_date, 20, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_keywords(user_id, ga_customer_id, prev_start, prev_end, 20, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_search_terms(user_id, ga_customer_id, start_date, end_date, 20, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_search_terms(user_id, ga_customer_id, prev_start, prev_end, 20, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_devices(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_devices(user_id, ga_customer_id, prev_start, prev_end, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_demographics(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_day_hour(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_networks(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_assets(user_id, ga_customer_id, start_date, end_date, 10, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_devices_daily(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_demographics_daily(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_search_terms_daily(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_google_ads_campaigns_daily(user_id, ga_customer_id, start_date, end_date, login_customer_id)),
                    asyncio.create_task(fetch_auction_insights(user_id, ga_customer_id, start_date, end_date, login_customer_id))
                ]

        if meta_creds:
            meta_ad_account_id = meta_creds.get("ad_account_id")
            meta_token = meta_creds.get("access_token")
            if not meta_token:
                try:
                    cred_resp = get_db_user_credentials(user_id, "meta_long_lived_token")
                    if cred_resp:
                        meta_token = cred_resp.get("credentials", {}).get("token")
                except Exception as e:
                    print(f"!!! Warning: Could not fetch Meta long lived token: {e}")

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
                    fetch_meta_ads_campaigns(meta_ad_account_id, meta_token, m_prev_start, m_prev_end),
                    fetch_meta_ads_daily(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_adsets(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_adsets(meta_ad_account_id, meta_token, m_prev_start, m_prev_end),
                    fetch_meta_ads_devices(meta_ad_account_id, meta_token, m_start, m_end),
                    fetch_meta_ads_devices(meta_ad_account_id, meta_token, m_prev_start, m_prev_end),
                    return_exceptions=True
                )

        if ga4_creds:
            ga4_property_id = ga4_creds.get("property_id")
            if ga4_property_id:
                print(f"---> Queueing GA4 tasks for {ga4_property_id}...")
                ga4_token = await get_ga4_token(user_id)

                ga4_sem = asyncio.Semaphore(2)
                async def sem_ga4(task):
                    async with ga4_sem:
                        return await task

                ga4_tasks = [
                    sem_ga4(fetch_ga4_totals(ga4_property_id, ga4_token, start_date, end_date, prev_start, prev_end)),
                    sem_ga4(fetch_ga4_daily_users(ga4_property_id, ga4_token, start_date, end_date)),
                    sem_ga4(fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, start_date, end_date)),
                    sem_ga4(fetch_ga4_sessions_by_channel(ga4_property_id, ga4_token, prev_start, prev_end)),
                    sem_ga4(fetch_ga4_geography(ga4_property_id, ga4_token, start_date, end_date)),
                    sem_ga4(fetch_ga4_geography(ga4_property_id, ga4_token, prev_start, prev_end)),
                    sem_ga4(fetch_ga4_landing_pages(ga4_property_id, ga4_token, start_date, end_date)),
                    sem_ga4(fetch_ga4_landing_pages(ga4_property_id, ga4_token, prev_start, prev_end))
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
            g_res = all_results[idx:idx+20]
            google_results = [r if not isinstance(r, Exception) else None for r in g_res]
            google_cur = google_results[0] or {}
            google_prev = google_results[1] or {}
            google_current_data = google_results[2] or []
            google_ads_details = {
                "top_campaigns": google_results[3] or [],
                "prev_top_campaigns": google_results[4] or [],
                "top_keywords": google_results[5] or [],
                "prev_top_keywords": google_results[6] or [],
                "search_terms": google_results[7] or [],
                "prev_search_terms": google_results[8] or [],
                "devices": google_results[9] or [],
                "prev_devices": google_results[10] or [],
                "demographics": google_results[11] or [],
                "day_hour": google_results[12] or [],
                "networks": google_results[13] or [],
                "top_assets": google_results[14] or [],
            }
            auction_insights = google_results[19] or []
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
            idx += 20

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
                meta_campaigns_prev = m_results[3] or []
                meta_daily = m_results[4] or []
                meta_adsets = m_results[5] or []
                meta_adsets_prev = m_results[6] or []
                meta_devices = m_results[7] or []
                meta_devices_prev = m_results[8] or []
                meta_details = {
                    "top_campaigns": meta_campaigns,
                    "prev_top_campaigns": meta_campaigns_prev,
                    "top_adsets": meta_adsets,
                    "prev_top_adsets": meta_adsets_prev,
                    "devices": meta_devices,
                    "prev_devices": meta_devices_prev
                }

                print(f"✅ [META] DATA FETCH SUCCESS.")
                print(f"DEBUG: META Spend: ₹{meta_current.get('spend')}, Leads: {meta_current.get('leads')}")
                print(f"DEBUG: META Campaigns count: {len(meta_campaigns)}")
            else:
                print(f"❌ [META] DATA FETCH CRITICAL ERROR: {m_res_raw}")
            idx += 1

        if ga4_tasks:
            ga_res = all_results[idx:idx+8]
            ga_results = [r if not isinstance(r, Exception) else {} for r in ga_res]
            ga4_totals, daily_ga4, sessions_by_channel, prev_sessions_by_channel, geo_users, prev_geo_users, top_landing, prev_top_landing = ga_results
            print(f"✅ [GA4] DATA FETCH SUCCESS.")
            idx += 8

        if gbp_task:
            gbp_res = all_results[idx]
            if not isinstance(gbp_res, Exception):
                gbp_details = gbp_res
                print(f"✅ [GMB] DATA FETCH SUCCESS.")
            else:
                print(f"❌ [GMB] DATA FETCH FAILED.")
            idx += 1

        # 5. Site Info & AI Analysis
        site_info = get_db_site_info(site_id)

        # 6. Perform Advanced Performance Analytics
        print("---> Running Performance Analytics...")
        print(f"DEBUG: Mapping Comparison - Gcur: {google_cur.get('cost')} Gprev: {google_prev.get('cost')} Mcur: {meta_current.get('spend')} Mprev: {meta_previous.get('spend')}")
        perf_kpi_analysis = analyse_performance_kpis(google_cur, meta_current, google_prev, meta_previous)
        print(f"DEBUG: Perf KPI Analysis Results: {perf_kpi_analysis.get('total_leads')} leads, {perf_kpi_analysis.get('total_spend')} spend")
        campaign_eff_analysis = analyse_campaign_efficiency(google_ads_details.get('top_campaigns', []))
        self_radar = compute_performance_self_radar(google_cur, meta_current, ga4_totals)

        # 7. Competitor Discovery
        site_info = get_db_site_info(site_id)
        site_city = site_info.get("city")
        competitor_insights = []

        if site_city:
            print(f"---> [COMPETITOR_ENGINE] Starting Robust Discovery for {site_info.get('name')} in {site_city}...")

            # Define core services
            services = [site_info.get("industry", "Business")]
            # Extract top 3 high-spend keywords from Google Ads
            all_kws = google_ads_details.get('top_keywords', [])
            if all_kws:
                services.extend([k.get("keyword") for k in all_kws[:3] if k.get("keyword")])

            # 1. Discover and Score Candidates
            candidates = await competitor_service.discover_candidates(
                services=list(set(services)), city=site_city
            )

            print(f"DEBUG: Discovered {len(candidates)} raw candidates via SERP Mining.")

            # 2. Integrate Auction Insights (Boost domains found in Auction Insights)
            auction_domains = {a.get("domain", "").lower().replace("www.", "") for a in auction_insights if a.get("domain")}
            for cand in candidates:
                if cand["domain"] in auction_domains:
                    cand["score"] += 15 # Boost score for domains confirmed in Ads Auction
                    print(f"DEBUG: Boosting {cand['domain']} due to Auction Insight match.")

            candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)

            # 3. Extract and Validate Top Candidates
            FRESHNESS_THRESHOLD_DAYS = 14
            for cand in candidates[:10]:
                if len(competitor_insights) >= 6: break
                domain = cand["domain"]
                url = cand["representative_url"]
                db_cached = get_db_competitor_insight(site_id, url, "performance")

                valid_content = None
                if db_cached and db_cached.get("extracted_at"):
                    last = safe_parse_iso(db_cached["extracted_at"])
                    if last and last > datetime.now(timezone.utc) - timedelta(days=FRESHNESS_THRESHOLD_DAYS):
                        valid_content = db_cached.get("full_text")

                if not valid_content:
                    print(f"DEBUG: Extracting content for {domain}...")
                    content = await extract_with_webclaw(url)
                    if content and len(content) > 300:
                        if competitor_service.scorer.validate_relevance(content, site_info.get("industry", ""), site_city, level=1):
                            valid_content = content
                            analysis = competitor_service.analyse_text(content)
                            upsert_db_competitor_insight({
                                "site_id": site_id, "competitor_url": url, "competitor_name": clean_domain(domain),
                                "full_text": content[:4000], "key_phrases": analysis["key_phrases"],
                                "cta": analysis["cta"], "entities": analysis["entities"],
                                "trust_signals": analysis["trust_signals"], "raw_text_preview": content[:500],
                                "extracted_at": datetime.now(timezone.utc), "discovery_query": "Performance Robust Discovery",
                                "source_module": "performance"
                            })

                if valid_content:
                    analysis = competitor_service.analyse_text(valid_content)
                    competitor_insights.append({
                        "competitor_name": clean_domain(domain), "url": url, "full_text": valid_content[:4000],
                        "key_phrases": analysis["key_phrases"], "cta": analysis["cta"],
                        "entities": analysis["entities"], "trust_signals": analysis["trust_signals"],
                        "discovery_query": "Direct Competitor"
                    })

            print(f"✅ [COMPETITOR_ENGINE] Final Validated Competitors: {len(competitor_insights)}")

        competitor_names = [c["competitor_name"] for c in competitor_insights]

        competitor_names = [c["competitor_name"] for c in competitor_insights]
        radar_data = build_dynamic_radar(self_radar, competitor_names)

        # 8. Call Gemini (3 Efficient Tasks)
        print("---> Generating AI Analysis (3 Efficient Tasks)...")
        update_db_report_status(report_id, "generating_ai")

        # Build the prompts (Split Competitors into 2 batches to avoid truncation)
        exec_prompt = build_performance_exec_prompt(
            site_info, google_cur, google_prev,
            meta_current, meta_previous, ga4_totals,
            perf_kpi_analysis, campaign_eff_analysis,
            google_ads_details=google_ads_details,
            meta_details=meta_details
        )
        advice_prompt = build_performance_advice_prompt(
            site_info, google_ads_details, meta_campaigns, meta_adsets, meta_devices
        )
        explanations_prompt = build_performance_explanations_prompt(
            site_info, google_ads_details, meta_campaigns, meta_adsets, meta_devices
        )

        # Split competitors into 2 batches
        site_data = {
            "google_spend": google_cur.get('cost', 0),
            "meta_spend": meta_current.get('spend', 0),
            "ga4_users": ga4_totals.get('totalUsers', {}).get('current', 0)
        }
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

        # 9. Process Result
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

        # Map re-indexed recommendations_summarized if needed
        if "recommendations_summarized" in ai_result:
            pass # Already correctly named

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
        ai_result["overall_threat_summary"] = batch_res1.get("overall_threat_summary", "Market landscape remains competitive.") if batch_res1 else "Market landscape remains competitive."
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

        if not self_gap_analysis and batch_res1 and isinstance(batch_res1, dict):
            self_gap_analysis = batch_res1.get("self_gap_analysis", {})

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

        # 9.5. Build Presentation Insights for the new slides
        kpis = perf_kpi_analysis.get("overall_kpis", [])
        print(f"DEBUG: Performance Worker Overall KPIs: {json.dumps(kpis, separators=(',', ':'))}")

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
        kpi_to_store = {
            "ga4": ga4_totals,
            "google_ads": {"current": google_cur, "previous": google_prev},
            "meta_ads": {"current": meta_current, "previous": meta_previous}
        }
        print(f"DEBUG: Storing KPI Summary: {json.dumps(kpi_to_store, separators=(',', ':'))}")

        # Preserve raw data before AI overwriting logic (if any)
        processed_google_details = {**google_ads_details}
        # Force top_keywords to be the raw array for the frontend
        top_keywords_array = google_ads_details.get("top_keywords", [])
        if not isinstance(top_keywords_array, list): top_keywords_array = []

        save_db_processed_report({
            "report_id": report_id, "user_id": user_id, "site_id": site_id, "module": "performance",
            "start_date": start_date, "end_date": end_date,
            "kpi_summary": kpi_to_store,
            "top_keywords": top_keywords_array, # Store raw array here!
            "top_landing_pages": top_landing, "users_by_country": geo_users, "sessions_by_channel": sessions_by_channel,
            "charts": {"overview": chart_data_overview, "devices": google_results[11], "demographics": google_results[12], "search_terms": google_results[13], "campaigns": google_results[14]},
            "google_ads_details": processed_google_details, "competitor_data": auction_insights, "radar_data": radar_data, "radar_self": self_radar,
            "ga4_details": {"daily_users": [{"date": d["date"], "users": d["users"], "returningUsers": max(0, d["users"]-d["newUsers"])} for d in daily_ga4], "gbp_details": gbp_details},
            "chart_datasets": [{"label": d["date"], "valueA": d["users"], "valueB": max(0, d["users"]-d["newUsers"]), "valueC": 0} for d in daily_ga4],
            "ai_summary": ai_result.get("summary"),
            "ai_insights": presentation_insights,
            "ai_recommendations": ai_result.get("neural_strategy_markers") or ai_result.get("recommendations", []),
            "ai_recommendations_summarized": summarized_recs, "ai_competitor_analysis": ai_result.get("competitor_analysis"), "ai_top_keywords_overview": ai_result.get("top_keywords_overview"),
            "ai_table_explanations": ai_result.get("table_explanations", {}), "improvement_roadmap": ai_result.get("improvement_roadmap"), "competitor_intelligence": {"competitors": competitor_breakdown, "overall_threat_summary": overall_threat_summary},
            "section_advice": section_advice, "ai_slide_descriptions": ai_result.get("slide_descriptions", {}),
            "meta_ads_kpi": {"current": meta_current, "previous": meta_previous},
            "meta_ads_details": {"top_campaigns": meta_campaigns, "prev_top_campaigns": meta_campaigns_prev, "top_adsets": meta_adsets, "prev_top_adsets": meta_adsets_prev, "devices": meta_devices, "prev_devices": meta_devices_prev},
            "meta_ads_charts": {"daily": meta_daily},
            "self_gap_analysis": self_gap_analysis
        })

        update_db_report_status(report_id, "completed")
        print(f"---> DONE: Performance report {report_id}")

    except Exception as e:
        print(f"!!! Error in run_performance_report: {e}")
        traceback.print_exc()
        try:
            update_db_report_status(report_id, "failed", error_message=f"Worker Error: {str(e)}")
        except Exception as db_e:
            print(f"!!! CRITICAL: Failed to update report status in DB: {db_e}")
