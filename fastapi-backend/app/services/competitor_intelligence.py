import asyncio
import time
import re
import random
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from app.services.search_service import search_manager
from bs4 import BeautifulSoup
import httpx
import shutil
from datetime import datetime, timezone

# Lazy load NLP models
_kw_model = None
_nlp = None

def get_nlp_models():
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
            print(f"!!! Error loading NLP models: {e}")
    return _kw_model, _nlp

class IntentClassifier:
    INFORMATIONAL_MARKERS = ["how", "what", "why", "when", "guide", "tips", "tutorial", "best way", "benefits", "meaning"]
    SERVICE_MARKERS = ["service", "agency", "provider", "company", "near me", "price", "cost", "hire", "consultant", "firm", "solutions", "packages"]

    @staticmethod
    def classify(keyword: str) -> str:
        kw_lower = keyword.lower()
        if any(marker in kw_lower for marker in IntentClassifier.INFORMATIONAL_MARKERS) or kw_lower.startswith(("how ", "what ", "why ")):
            return "Informational"
        if any(marker in kw_lower for marker in IntentClassifier.SERVICE_MARKERS):
            return "Service"
        _, nlp = get_nlp_models()
        if nlp:
            doc = nlp(keyword)
            for ent in doc.ents:
                if ent.label_ == "ORG": return "Brand"
        return "Industry" if len(kw_lower.split()) <= 2 else "Informational"

class QueryGenerator:
    @staticmethod
    def generate(services: List[str], location: Optional[str] = None) -> List[str]:
        queries = []
        loc_lower = location.lower() if location else ""

        for service in services:
            s = service.strip()
            s_lower = s.lower()

            # De-duplicate: only add suffix if location not in service name
            loc_suffix = f" in {location}" if location and loc_lower not in s_lower else ""

            queries.append(f"{s}{loc_suffix}")
            queries.append(f"best {s}{loc_suffix}")

            # Smart Agency Suffix
            if not any(word in s_lower for word in ["agency", "company", "firm", "service", "provider"]):
                if len(s.split()) <= 3:
                    queries.append(f"{s} agency{loc_suffix}")

            if location:
                # Localized queries
                if loc_lower not in s_lower:
                    queries.append(f"top rated {s} {location}")
                    if len(s.split()) <= 3:
                        queries.append(f"{s} companies near {location}")
                else:
                    queries.append(f"top rated {s}")

        return list(set(queries))

class HardFilter:
    EXCLUDED_DOMAINS = {
        "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
        "youtube.com", "pinterest.com", "reddit.com", "quora.com", "medium.com",
        "justdial.com", "sulekha.com", "indiamart.com", "yelp.com", "yellowpages.com",
        "tripadvisor.in", "tripadvisor.com", "glassdoor.com", "indeed.com", "crunchbase.com",
        "wikipedia.org", "amazon.com", "ebay.com", "flipkart.com", "statista.com", "gov.in", "nic.in"
    }

    @staticmethod
    def is_valid(url: str) -> bool:
        try:
            domain = urlparse(url).netloc.lower().replace("www.", "")
            if domain in HardFilter.EXCLUDED_DOMAINS or any(domain.endswith("." + ex) for ex in HardFilter.EXCLUDED_DOMAINS):
                return False
            return "." in domain
        except Exception: return False

class CompetitorScorer:
    @staticmethod
    def validate_relevance(content: str, industry: str, city: str, level: int = 1) -> bool:
        if not content or len(content) < 300: return False
        content_lower = content.lower()
        industry_lower = industry.lower()

        # Broaden industry keywords
        industry_keywords = {
            "travel": ["tour", "holiday", "package", "travel", "yatra", "itinerary", "booking", "hotel", "resort", "tourism"],
            "construction": ["builder", "architect", "civil", "renovation", "interior", "structural", "real estate", "housing", "developers"],
            "e-commerce": ["shop", "store", "buy", "product", "cart", "online", "retail", "marketplace", "shipping", "orders"],
            "real estate": ["property", "flat", "apartment", "villa", "plot", "realestate", "realty", "residential", "commercial", "builders"],
            "marketing": ["agency", "ads", "digital", "branding", "marketing", "media", "strategy", "seo", "ppc", "advertising", "social media", "creative"],
        }

        check_list = []
        # Match industry based on substring or membership
        for key, kws in industry_keywords.items():
            if key in industry_lower or any(kw in industry_lower for kw in kws):
                check_list.extend(kws)

        if not check_list: check_list = [w for w in re.split(r'\W+', industry_lower) if len(w) > 3]
        if not check_list: check_list = ["business", "services", "company"]

        found_kws = [kw for kw in check_list if kw in content_lower]

        # Smart City Normalization
        city_lower = city.lower() if city else ""
        city_aliases = {
            "madhapur": ["hyderabad", "telangana", "hitech city"],
            "gachibowli": ["hyderabad", "telangana"],
            "kondapur": ["hyderabad", "telangana"],
            "jubilee hills": ["hyderabad", "telangana"],
            "whitefield": ["bangalore", "bengaluru", "karnataka"]
        }

        valid_locations = [city_lower]
        if city_lower in city_aliases:
            valid_locations.extend(city_aliases[city_lower])

        has_loc_match = any(loc in content_lower for loc in valid_locations)

        if level == 1:
            # Strict: Industry AND Location match OR high industry density
            if not found_kws: return False
            if has_loc_match: return len(found_kws) >= 1
            return len(found_kws) >= 3 # Allow if extremely industry relevant even if location is ambiguous

        # Level 2 (Relaxed): Just industry match
        return len(found_kws) >= 1

    @staticmethod
    def score_competitor(domain: str, occurrences: int, avg_pos: float, semantic_sim: float) -> float:
        freq_score = min(100.0, occurrences * 25)
        pos_score = max(0.0, 110.0 - (avg_pos * 10))
        return (freq_score * 0.4) + (pos_score * 0.3) + (semantic_sim * 30)

class CompetitorIntelligenceService:
    def __init__(self):
        self.classifier = IntentClassifier()
        self.query_gen = QueryGenerator()
        self.filter = HardFilter()
        self.scorer = CompetitorScorer()

    async def discover_candidates(self, services: List[str], city: str) -> List[Dict[str, Any]]:
        queries = self.query_gen.generate(services, city)
        raw_results = {}
        for query in queries[:10]:
            try:
                results = await search_manager.get_results(query)
                for idx, res in enumerate(results):
                    url = res.get("url")
                    if url and self.filter.is_valid(url):
                        domain = urlparse(url).netloc.lower().replace("www.", "")
                        if domain not in raw_results: raw_results[domain] = {"urls": [], "positions": []}
                        raw_results[domain]["urls"].append(url)
                        raw_results[domain]["positions"].append(idx + 1)
            except Exception: pass

        scored = []
        for domain, data in raw_results.items():
            avg_pos = sum(data["positions"]) / len(data["positions"])
            scored.append({
                "domain": domain, "avg_position": avg_pos, "occurrences": len(data["positions"]),
                "representative_url": data["urls"][0], "score": self.scorer.score_competitor(domain, len(data["positions"]), avg_pos, 70)
            })
        return sorted(scored, key=lambda x: x["score"], reverse=True)

    def analyse_text(self, content: str) -> dict:
        if not content: return {"key_phrases": [], "cta": [], "entities": {}, "trust_signals": []}
        kw_model, nlp = get_nlp_models()
        key_phrases = []
        if kw_model:
            try:
                keywords = kw_model.extract_keywords(content, keyphrase_ngram_range=(1,3), top_n=5)
                key_phrases = [kw[0] for kw in keywords]
            except Exception: pass
        entities = {"ORGS": [], "GPE": []}
        if nlp:
            try:
                doc = nlp(content[:5000])
                for ent in doc.ents:
                    if ent.label_ == "ORG": entities["ORGS"].append(ent.text)
                    elif ent.label_ == "GPE": entities["GPE"].append(ent.text)
                entities = {k: list(set(v)) for k, v in entities.items()}
            except Exception: pass
        cta_patterns = ["book now", "contact us", "get quote", "enquire now", "call us"]
        found_cta = [cta for cta in cta_patterns if cta in content.lower()]
        trust_words = ["years of experience", "trusted", "award", "certified", "iso"]
        trust_signals = [word for word in trust_words if word in content.lower()]
        return {"key_phrases": key_phrases, "cta": found_cta, "entities": entities, "trust_signals": trust_signals}

competitor_service = CompetitorIntelligenceService()
