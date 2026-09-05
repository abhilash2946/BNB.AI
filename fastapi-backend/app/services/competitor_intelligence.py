import asyncio
import time
import re
import random
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from app.services.search_service import search_manager

# Lazy load NLP models to speed up server startup
_kw_model = None
_nlp = None

def get_nlp_models():
    """Initialize models only when needed, consistent with workers."""
    global _kw_model, _nlp
    if _kw_model is None or _nlp is None:
        try:
            from keybert import KeyBERT
            import spacy
            if _kw_model is None:
                _kw_model = KeyBERT()
            if _nlp is None:
                try:
                    _nlp = spacy.load("en_core_web_sm")
                except OSError:
                    spacy.cli.download("en_core_web_sm")
                    _nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            print(f"!!! Error loading NLP models in CompetitorIntelligenceService: {e}")
    return _kw_model, _nlp

class IntentClassifier:
    """Categorizes keywords into Brand, Service, Industry, or Informational."""

    INFORMATIONAL_MARKERS = ["how", "what", "why", "when", "guide", "tips", "tutorial", "best way", "benefits", "meaning"]
    SERVICE_MARKERS = ["service", "agency", "provider", "company", "near me", "price", "cost", "hire", "consultant", "firm", "solutions"]

    @staticmethod
    def classify(keyword: str) -> str:
        kw_lower = keyword.lower()

        # 1. Informational
        if any(marker in kw_lower for marker in IntentClassifier.INFORMATIONAL_MARKERS) or kw_lower.startswith(("how ", "what ", "why ")):
            return "Informational"

        # 2. Service
        if any(marker in kw_lower for marker in IntentClassifier.SERVICE_MARKERS):
            return "Service"

        # 3. Industry vs Brand (using spaCy if available)
        _, nlp = get_nlp_models()
        if nlp:
            doc = nlp(keyword)
            for ent in doc.ents:
                if ent.label_ == "ORG":
                    return "Brand"

        # 4. Heuristic for Industry: Broad terms usually have fewer words or are common nouns
        words = kw_lower.split()
        if len(words) <= 2:
            return "Industry"

        return "Informational" # Default to informational for long tail

class QueryGenerator:
    """Creates location-aware service queries."""

    @staticmethod
    def generate(services: List[str], location: Optional[str] = None) -> List[str]:
        queries = []
        loc_suffix = f" in {location}" if location else ""

        for service in services:
            # Core Queries
            queries.append(f"{service}{loc_suffix}")
            queries.append(f"best {service}{loc_suffix}")
            queries.append(f"{service} agency{loc_suffix}")

            # Localized Queries
            if location:
                queries.append(f"top rated {service} {location}")
                queries.append(f"{service} companies near {location}")

        return list(set(queries))

class HardFilter:
    """Robust list of domains to exclude from competitor analysis."""

    EXCLUDED_DOMAINS = {
        # Social & Communities
        "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
        "youtube.com", "pinterest.com", "reddit.com", "quora.com", "medium.com",
        "tumblr.com", "tiktok.com",

        # Directories & Marketplaces
        "justdial.com", "sulekha.com", "indiamart.com", "yelp.com", "yellowpages.com",
        "tripadvisor.in", "tripadvisor.com", "glassdoor.com", "indeed.com", "crunchbase.com",
        "clutch.co", "g2.com", "trustpilot.com", "upwork.com", "fiverr.com",

        # News & Media
        "forbes.com", "entrepreneur.com", "businessinsider.com", "inc.com", "nytimes.com",
        "theguardian.com", "bbc.com", "ndtv.com", "timesofindia.indiatimes.com", "yourstory.com",

        # Platforms & Informational
        "wikipedia.org", "wiktionary.org", "amazon.com", "ebay.com", "flipkart.com",
        "github.com", "stackoverflow.com", "statista.com", "investopedia.com", "britannica.com",

        # Government
        "gov.in", "nic.in", "gov", "edu"
    }

    @staticmethod
    def is_valid(url: str) -> bool:
        try:
            domain = urlparse(url).netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]

            # Check direct match
            if domain in HardFilter.EXCLUDED_DOMAINS:
                return False

            # Check suffix/pattern match
            for excluded in HardFilter.EXCLUDED_DOMAINS:
                if domain.endswith("." + excluded):
                    return False

            # Basic sanity check
            if not domain or "." not in domain:
                return False

            return True
        except Exception:
            return False

class CompetitorScorer:
    """Scoring logic based on SERP overlap, semantic similarity, and business relevance."""

    @staticmethod
    def calculate_serp_score(position: int) -> float:
        """Inverse scoring based on position (1st = 100, 10th = 10)."""
        if position <= 0: return 0.0
        return max(0.0, 110.0 - (position * 10))

    @staticmethod
    def calculate_semantic_score(source_text: str, target_keywords: List[str]) -> float:
        """Similarity between competitor text and target business keywords."""
        kw_model, nlp = get_nlp_models()
        if not nlp or not source_text:
            return 0.5 # Neutral fallback

        try:
            source_doc = nlp(source_text[:2000].lower())
            scores = []
            for kw in target_keywords:
                kw_doc = nlp(kw.lower())
                if source_doc.vector_norm and kw_doc.vector_norm:
                    scores.append(source_doc.similarity(kw_doc))

            return sum(scores) / len(scores) if scores else 0.5
        except Exception:
            return 0.5

    @staticmethod
    def score_competitor(domain: str, occurrences: int, avg_pos: float, semantic_sim: float) -> float:
        """
        Final composite score.
        Weighting: Overlap/Frequency (40%), SERP Position (30%), Semantic Fit (30%)
        """
        freq_score = min(100.0, occurrences * 25) # Max score at 4 queries
        pos_score = CompetitorScorer.calculate_serp_score(int(avg_pos))
        sem_score = semantic_sim * 100

        return (freq_score * 0.4) + (pos_score * 0.3) + (sem_score * 0.3)

class SmartThrottler:
    """Helper to manage pacing for free search libraries to avoid IP bans."""

    def __init__(self, requests_per_minute: int = 10):
        self.delay = 60.0 / requests_per_minute
        self.last_request_time = 0
        self._lock = asyncio.Lock()

    async def throttle(self):
        async with self._lock:
            elapsed = time.time() - self.last_request_time
            if elapsed < self.delay:
                wait_time = self.delay - elapsed + random.uniform(0.1, 0.5)
                await asyncio.sleep(wait_time)
            self.last_request_time = time.time()

class CompetitorIntelligenceService:
    """Orchestrates competitor discovery and analysis."""

    def __init__(self):
        self.throttler = SmartThrottler(requests_per_minute=8)
        self.classifier = IntentClassifier()
        self.query_gen = QueryGenerator()
        self.filter = HardFilter()
        self.scorer = CompetitorScorer()

    async def discover_competitors(self, industry: str, city: str, services: List[str]) -> List[Dict[str, Any]]:
        """Main entry point for finding and scoring competitors."""
        queries = self.query_gen.generate(services, city)
        raw_results = {} # domain -> {urls: [], positions: []}

        # Batch search with throttling
        for query in queries[:8]: # Limit for performance
            await self.throttler.throttle()
            try:
                results = await search_manager.get_results(query)
                for idx, res in enumerate(results):
                    url = res.get("url")
                    if url and self.filter.is_valid(url):
                        domain = urlparse(url).netloc.lower()
                        if domain not in raw_results:
                            raw_results[domain] = {"urls": [], "positions": []}
                        raw_results[domain]["urls"].append(url)
                        raw_results[domain]["positions"].append(idx + 1)
            except Exception as e:
                print(f"!!! Search failed for query '{query}': {e}")

        # Score and Rank
        scored_competitors = []
        for domain, data in raw_results.items():
            avg_pos = sum(data["positions"]) / len(data["positions"])
            occurrences = len(data["positions"])

            # For semantic scoring, we'd ideally scrape the homepage,
            # but here we'll use a heuristic or placeholder if full scraping is elsewhere.
            # In a real scenario, we might call extract_with_webclaw(data["urls"][0])
            semantic_sim = 0.7 # Default high if they appear in SERP for these queries

            score = self.scorer.score_competitor(domain, occurrences, avg_pos, semantic_sim)

            scored_competitors.append({
                "domain": domain,
                "score": round(score, 2),
                "occurrences": occurrences,
                "avg_position": round(avg_pos, 1),
                "representative_url": data["urls"][0]
            })

        return sorted(scored_competitors, key=lambda x: x["score"], reverse=True)

# Export singleton
competitor_service = CompetitorIntelligenceService()
