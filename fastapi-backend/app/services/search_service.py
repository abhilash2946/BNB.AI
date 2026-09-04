import asyncio
import time
import random
import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from googlesearch import search as google_search

class SearchManager:
    def __init__(self):
        self.engines = ["ddg", "google", "bing"]
        self.current_engine_index = 0
        self.cycle_start_time = 0
        self.MIN_CYCLE_DURATION = 6.0  # Optimized for speed: 2s per engine avg
        self._lock = asyncio.Lock() # Ensure one search at a time to prevent IP flagging

    async def get_results(self, query: str):
        async with self._lock:
            # 1. Start cycle timer at engine 0
            if self.current_engine_index == 0:
                self.cycle_start_time = time.time()
                print(f"---> [SEARCH] Starting new Round-Robin cycle for: {query}")

            engine = self.engines[self.current_engine_index]
            results = []

            print(f"DEBUG: Using engine {engine.upper()} for query '{query}'")

            try:
                if engine == "ddg":
                    results = await self._search_ddg(query)
                elif engine == "google":
                    results = await self._search_google(query)
                elif engine == "bing":
                    results = await self._search_bing(query)
            except Exception as e:
                print(f"!!! {engine.upper()} search failed: {e}. Falling back immediately...")
                # If an engine fails, we don't wait - move to next
                self.current_engine_index = (self.current_engine_index + 1) % len(self.engines)
                return await self.get_results(query) # Recursive fallback

            # 2. Increment for next call
            self.current_engine_index = (self.current_engine_index + 1) % len(self.engines)

            # 3. Cycle Completion Throttling
            if self.current_engine_index == 0:
                elapsed = time.time() - self.cycle_start_time
                if elapsed < self.MIN_CYCLE_DURATION:
                    wait_time = self.MIN_CYCLE_DURATION - elapsed
                    print(f"DEBUG: Cycle completed fast ({elapsed:.1f}s). Throttling for {wait_time:.1f}s...")
                    await asyncio.sleep(wait_time)
            else:
                # Optimized "human" delay
                delay = random.uniform(0.5, 1.2)
                await asyncio.sleep(delay)

            return results

    async def _search_ddg(self, query):
        try:
            with DDGS() as ddgs:
                # Limit to 10 results for speed
                raw_results = list(ddgs.text(query, max_results=10))
                return [{"url": r["href"]} for r in raw_results if "href" in r]
        except Exception as e:
            raise Exception(f"DDG Error: {str(e)}")

    async def _search_google(self, query):
        try:
            # googlesearch-python is synchronous, run in executor
            loop = asyncio.get_event_loop()
            # We use a user agent that looks like a modern desktop
            urls = await loop.run_in_executor(None, lambda: list(google_search(query, num_results=10, sleep_interval=2)))
            return [{"url": u} for u in urls]
        except Exception as e:
            raise Exception(f"Google Error: {str(e)}")

    async def _search_bing(self, query):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": "https://www.bing.com/"
        }
        try:
            async with httpx.AsyncClient(headers=headers, timeout=15, follow_redirects=True) as client:
                resp = await client.get(f"https://www.bing.com/search?q={query}")
                if resp.status_code != 200:
                    raise Exception(f"Bing HTTP {resp.status_code}")

                soup = BeautifulSoup(resp.text, "lxml")
                results = []
                # Select main algo links
                for item in soup.select("li.b_algo h2 a"):
                    href = item.get("href")
                    if href and href.startswith("http") and not any(x in href for x in ["microsoft.com", "bing.com"]):
                        results.append({"url": href})

                if not results:
                    # Fallback selector
                    for item in soup.select("h2 a"):
                        href = item.get("href")
                        if href and href.startswith("http") and not any(x in href for x in ["microsoft.com", "bing.com"]):
                            results.append({"url": href})

                return results[:10]
        except Exception as e:
            raise Exception(f"Bing Error: {str(e)}")

# Create single instance to maintain rotation and timing state
search_manager = SearchManager()
