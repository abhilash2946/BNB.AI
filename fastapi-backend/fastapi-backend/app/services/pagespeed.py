import httpx
from app.config import settings

async def fetch_core_web_vitals(url: str) -> dict:
    # PageSpeed Insights requires a full URL with scheme.
    # Search Console often provides "sc-domain:example.com".
    target_url = url
    if target_url.startswith("sc-domain:"):
        domain = target_url.replace("sc-domain:", "")
        target_url = f"https://{domain}"
    elif not target_url.startswith("http"):
        target_url = f"https://{target_url}"

    api_key = settings.pagespeed_api_key
    if not api_key:
        print("!!! PageSpeed API key is not configured; skipping Core Web Vitals fetch.")
        return {}

    psi_url = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

    async with httpx.AsyncClient() as client:
        try:
            # Try mobile strategy first (default)
            resp = await client.get(
                psi_url,
                params={"url": target_url, "key": api_key, "category": "PERFORMANCE"},
                timeout=90.0,
            )

            # If we get a 500 error (common for Lighthouse "puppeteer" errors), try desktop strategy
            if resp.status_code == 500:
                print(f"!!! PageSpeed Mobile Error 500: {resp.text}")
                print("---> Retrying with DESKTOP strategy...")
                resp = await client.get(
                    psi_url,
                    params={"url": target_url, "key": api_key, "category": "PERFORMANCE", "strategy": "DESKTOP"},
                    timeout=90.0,
                )

            if resp.status_code != 200:
                print(f"!!! PageSpeed Error {resp.status_code}: {resp.text}")
                return {}

            resp.raise_for_status()
        except httpx.ReadTimeout:
            print(f"!!! PageSpeed API Timeout for {target_url} after 90s.")
            return {}
        except Exception as e:
            print(f"!!! PageSpeed API Exception for {target_url}: {str(e)}")
            return {}
        data = resp.json()
        lighthouse = data.get("lighthouseResult", {})
        audits = lighthouse.get("audits", {})

        # Helper to get numeric value or 0
        def get_val(audit_name):
            return audits.get(audit_name, {}).get("numericValue", 0)

        return {
            "lcp": get_val("largest-contentful-paint"),
            "tbt": get_val("total-blocking-time"),
            "cls": get_val("cumulative-layout-shift"),
            "performance_score": lighthouse.get("categories", {}).get("performance", {}).get("score", 0) * 100
        }
