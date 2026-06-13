import httpx
from typing import List, Dict, Any
import re

async def detect_new_posts(current_pages: List[str], previous_pages: List[str]) -> List[str]:
    """
    Identifies URLs that are present in the current period but not in the previous.
    Focuses on blog-like paths.
    """
    new_urls = set(current_pages) - set(previous_pages)
    # Filter for potential blog posts (e.g., URLs containing /blog/, /news/, /post/, or just long paths)
    blog_posts = [url for url in new_urls if any(x in url.lower() for x in ["/blog/", "/news/", "/article/", "/p/"])]

    # If no specific blog pattern, just take top 3 new pages that aren't common assets
    if not blog_posts:
        blog_posts = [url for url in new_urls if not any(x in url.lower() for x in [".jpg", ".png", ".css", ".js", "wp-json"])]
        blog_posts = blog_posts[:3]

    return blog_posts

async def detect_meta_tweaks(current_titles: List[Dict], previous_titles: List[Dict]) -> List[Dict]:
    """
    Compares page titles between periods for the same landing page.
    """
    prev_map = {item["title"]: item["views"] for item in previous_titles}
    tweaks = []

    # This is a bit tricky without exact URL-to-Title mapping in the default GA4 fetch.
    # We'll look for "similar" titles that changed significantly or just highlight top page optimizations.
    for item in current_titles:
        title = item["title"]
        if title not in prev_map:
            # New title appearing in top pages
            tweaks.append({"title": title, "type": "Optimization"})

    return tweaks[:4]

async def detect_internal_links(site_url: str, landing_pages: List[str]) -> int:
    """
    Performs a very basic crawl of the top 3 landing pages to count internal links.
    Returns an average or total count.
    """
    if not site_url: return 0

    # Fix site urls without protocol
    clean_site_url = site_url
    if "sc-domain:" in site_url:
        clean_site_url = site_url.replace("sc-domain:", "").strip("/")

    if not clean_site_url.startswith("http"):
        clean_site_url = "https://" + clean_site_url

    total_links = 0
    pages_to_check = [p for p in landing_pages if p and "(not set)" not in p][:3]

    async with httpx.AsyncClient() as client:
        for page in pages_to_check:
            # Construct full URL
            if page.startswith("http"):
                url = page
            elif "sc-domain:" in page:
                url = "https://" + page.replace("sc-domain:", "").strip("/")
            elif page == "/":
                url = clean_site_url
            else:
                base = clean_site_url.rstrip("/")
                path = page.lstrip("/")
                url = f"{base}/{path}"

            try:
                # Absolute safety protocol enforcement
                if not url.startswith("http"):
                    url = "https://" + url.lstrip("/")

                print(f"---> Crawling for links: {url}")
                resp = await client.get(url, timeout=10.0, follow_redirects=True)
                if resp.status_code == 200:
                    links = re.findall(r'<a\s+(?:[^>]*?\s+)?href="([^"]*)"', resp.text)
                    internal = [l for l in links if l.startswith("/") or clean_site_url.split("//")[-1] in l]
                    total_links += len(internal)
            except Exception as e:
                print(f"!!! Error crawling {url}: {e}")

    return total_links
