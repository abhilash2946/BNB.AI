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
        "wikipedia.org", "amazon.com", "amazon.in", "ebay.com", "flipkart.com", "statista.com",
        "gov.in", "nic.in", "myntra.com", "ajio.com", "nykaa.com", "nykaafashion.com",
        "meesho.com", "zara.com", "hm.com", "bewakoof.com", "limeroad.com"
    }

    @staticmethod
    def is_valid(url: str) -> bool:
        try:
            domain = urlparse(url).netloc.lower().replace("www.", "")

            # Check for generic marketplace/retailer patterns
            retail_patterns = ["amazon.", "ebay.", "flipkart.", "myntra.", "ajio.", "nykaa.", "meesho.", "zara.", "aliexpress."]
            if any(pattern in domain for pattern in retail_patterns):
                return False

            if domain in HardFilter.EXCLUDED_DOMAINS or any(domain.endswith("." + ex) for ex in HardFilter.EXCLUDED_DOMAINS):
                return False

            return "." in domain
        except Exception: return False

class CompetitorScorer:
    @staticmethod
    def validate_relevance(content: str, industry: str, city: str, level: int = 1, profile: dict = None) -> bool:
        if not content or len(content) < 300: return False
        content_lower = content.lower()
        industry_lower = industry.lower()

        # 0. Dynamic Anti-Marker Check (Strict)
        if profile and profile.get("anti_markers"):
            # Use a higher threshold for complex multi-type profiling
            anti_hits = sum(1 for m in profile["anti_markers"] if m in content_lower)
            # If we are an Agency, we are VERY strict about not being a Retail store
            if profile.get("is_agency") and anti_hits >= 2:
                print(f"DEBUG: Rejecting candidate due to anti-retail markers ({anti_hits})")
                return False
            # Generic threshold
            if anti_hits >= 5:
                return False

        # 0.1. Type Scoring (The Core Logic)
        from app.services.competitor_intelligence import competitor_service
        all_markers = competitor_service.get_type_markers()

        candidate_scores = {}
        for b_type, markers in all_markers.items():
            candidate_scores[b_type] = sum(1 for m in markers if m in content_lower)

        candidate_type = max(candidate_scores, key=candidate_scores.get)

        # Validation Rule: Candidate type must match user type OR be extremely high in a related industry
        if profile and profile.get("type") != "GENERIC":
            user_type = profile["type"]
            # Strict Match for Agency/Retail/Real Estate
            if user_type in ["AGENCY", "RETAIL", "ECOMMERCE", "REAL_ESTATE", "EDUCATION", "HEALTHCARE"]:
                if candidate_type != user_type and candidate_scores.get(user_type, 0) < 2:
                    print(f"DEBUG: Rejecting candidate {candidate_type} (Mismatch with user type {user_type})")
                    return False

        # 1. Location Normalization
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
        self.business_profile = {}

    def get_type_markers(self) -> Dict[str, List[str]]:
        return {
            "AGENCY": ["our services", "case studies", "our clients", "digital marketing", "agency", "branding", "seo", "advertising", "performance marketing", "martech", "adtech", "client success", "media house", "marketing strategy"],
            "RETAIL": ["add to cart", "checkout", "buy now", "return policy", "shop", "shipping", "product", "warranty", "inventory"],
            "ECOMMERCE": ["d2c", "online store", "shopping cart", "payment gateway", "order tracking", "customer reviews", "sku"],
            "SAAS_TECH": ["software as a service", "saas platform", "cloud software", "tech infrastructure", "automation software"],
            "REAL_ESTATE": ["property", "flat", "apartment", "villa", "plot", "realestate", "realty", "builders", "developers", "residential", "commercial", "rera"],
            "EDUCATION": ["school", "college", "university", "course", "training", "edtech", "student", "admissions", "curriculum", "scholarship", "learning"],
            "HEALTHCARE": ["hospital", "clinic", "doctor", "medical", "patient", "treatment", "healthcare", "diagnostics", "appointment", "specialist"],
            "FINANCE": ["bank", "fintech", "insurance", "loan", "investment", "financial", "credit", "mortgage", "banking", "wealth"],
            "HOSPITALITY": ["hotel", "resort", "restaurant", "travel", "booking", "stay", "vacation", "holiday", "itinerary", "hospitality"],
            "MANUFACTURING": ["factory", "production", "industrial", "manufacturing", "supply chain", "logistics", "machinery", "manufacturing unit", "oem"],
            "PROFESSIONAL_SERVICES": ["legal", "consulting", "accounting", "hr", "tax", "audit", "lawyer", "recruitment", "professional services"],
            "MEDIA_PUBLISHER": ["news", "magazine", "article", "blog", "publication", "editorial", "journalism", "latest news", "breaking news"],
            "MARKETPLACE": ["seller", "buyer", "marketplace", "platform", "vendor", "classifieds", "listings", "multi-vendor"],
            "DIRECTORY": ["justdial", "sulekha", "yelp", "directory", "listings", "reviews", "top 10", "best in", "yellow pages"],
            "GOVT_NONPROFIT": ["gov", "nic", "ministry", "ngo", "nonprofit", "charity", "donation", "foundation", "public welfare"]
        }

    def get_type_search_suffix(self, b_type: str) -> str:
        mapping = {
            "AGENCY": "Agency", "RETAIL": "Store", "ECOMMERCE": "Online Shop",
            "SAAS_TECH": "Software Platform", "REAL_ESTATE": "Company",
            "EDUCATION": "Institution", "HEALTHCARE": "Services", "FINANCE": "Services",
            "HOSPITALITY": "Hospitality", "MANUFACTURING": "Manufacturer",
            "PROFESSIONAL_SERVICES": "Consultancy", "MEDIA_PUBLISHER": "Publisher",
            "MARKETPLACE": "Marketplace", "DIRECTORY": "Directory"
        }
        return mapping.get(b_type, "")

    async def profile_user_business(self, site_url: str):
        from app.workers.seo_worker import extract_with_webclaw
        print(f"---> [PROFILER] Deep Profiling user business at {site_url}...")

        content = await extract_with_webclaw(site_url)
        if not content or len(content) < 300:
            self.business_profile = {"type": "GENERIC", "scores": {}, "anti_markers": [], "is_agency": False}
            return

        content_lower = content.lower()
        all_markers = self.get_type_markers()

        scores = {}
        for b_type, markers in all_markers.items():
            scores[b_type] = sum(1 for m in markers if m in content_lower)

        primary_type = max(scores, key=scores.get)
        if scores[primary_type] == 0: primary_type = "GENERIC"

        self.business_profile = {
            "type": primary_type,
            "scores": scores,
            "is_agency": primary_type == "AGENCY",
            "anti_markers": []
        }

        if primary_type == "AGENCY":
            self.business_profile["anti_markers"] = all_markers["RETAIL"] + all_markers["ECOMMERCE"] + all_markers["DIRECTORY"]
        elif primary_type in ["RETAIL", "ECOMMERCE"]:
            self.business_profile["anti_markers"] = all_markers["AGENCY"] + all_markers["DIRECTORY"]

        print(f"✅ [PROFILER] Identified as {primary_type}")

    async def discover_candidates(self, services: List[str], city: str, force_type: str = None) -> List[Dict[str, Any]]:
        target_type = force_type or self.business_profile.get("type", "GENERIC")
        type_suffix = self.get_type_search_suffix(target_type)

        refined_services = []
        for s in services:
            s_clean = s.strip()
            # If we have a target type like AGENCY, ensure it's in the query
            if type_suffix and type_suffix.lower() not in s_clean.lower():
                refined_services.append(f"{s_clean} {type_suffix}")
            else:
                refined_services.append(s_clean)

        queries = self.query_gen.generate(refined_services, city)
        raw_results = {}

        # Search Loop
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
