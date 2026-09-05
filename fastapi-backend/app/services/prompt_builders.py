import json

# --- GLOBAL TONE ---
ANALYST_TONE = """
You are a Senior Marketing Data Analyst writing a technical briefing for C-level executives.
RULES:
1. MANDATORY RIGOR: Every single field MUST contain specific numbers, deltas, and real-world metrics.
2. ANALYST TONE: Informal but data-heavy (analyst-to-analyst). No corporate fluff.
3. DETAILED 3-SENTENCE STRUCTURE: Every briefing/node MUST be exactly 3 sentences.
   - Sentence 1: Direct diagnosis with numbers.
   - Sentence 2: Comparative cross-platform context.
   - Sentence 3: Technical move with target metric.
   - STRICT: Keep sentences concise, punchy, and data-dense. Each sentence MUST be between 15 and 18 words. No more, no less.
4. VALID JSON: Strictly avoid unescaped double quotes inside values; use single quotes instead.
5. NO NOISE: Return ONLY the JSON object. Do not include any commentary, word counts, or markdown outside the JSON.
"""

# --- PERFORMANCE PROMPTS ---

def build_performance_exec_prompt(
    site_info: dict, google_cur: dict, google_prev: dict,
    meta_current: dict, meta_previous: dict, ga4_totals: dict,
    perf_kpi_analysis: dict, campaign_eff_analysis: str,
    google_ads_details: dict = None, meta_details: dict = None
) -> str:
    # Add detailed matrix deltas to context
    matrix_context = ""
    if google_ads_details:
        g_cur_c = google_ads_details.get('top_campaigns', [])[:3]
        g_cur_k = google_ads_details.get('top_keywords', [])[:3]
        matrix_context += f" | G-Matrix: Campaigns: {json.dumps(g_cur_c, separators=(',', ':'))} | Keywords: {json.dumps(g_cur_k, separators=(',', ':'))}"

    if meta_details:
        m_cur_c = meta_details.get('top_campaigns', [])[:3]
        matrix_context += f" | M-Matrix: Campaigns: {json.dumps(m_cur_c, separators=(',', ':'))}"

    return f"""
{ANALYST_TONE}
Generate a detailed Core Strategy Report in JSON.
BUSINESS: {site_info.get('name')}
DATA: G-Spend ₹{google_cur.get('cost',0):.0f}. M-Spend ₹{meta_current.get('spend',0):.0f}.{matrix_context}

Return JSON with EXACT keys:
1. "summary": "3 sentences. S1: G-Ads conversion delta. S2: Meta ads comparison. S3: Scaling protocol. Each sentence 15-18 words."
2. "insights": ["5 observations. Each 1 sentence with metrics. Each sentence 15-18 words."]
3. "neural_strategy_markers": [
    {{
      "title": "Headline",
      "description": "Exactly 2 detailed sentences with numbers. Each sentence 15-18 words.",
      "target": "Specific goal",
      "priority": "High|Medium|Low", "impact": "High Impact", "effort": "Low Effort"
    }}
] (Exactly 6 Markers)
4. "ai_comparison": "Exactly 3 statistical sentences. Each sentence 15-18 words."
5. "recommendations_summarized": ["6 headlines."]
6. "slide_descriptions": {{ "meta_titles": "...", "heading_structure": "...", "internal_linking": "...", "content_formatting": "...", "gmb_authority": "...", "gmb_support": "..." }}
7. "improvement_roadmap": {{ "summary": "Data-dense. 15-18 words.", "strengths": ["3 items. 15-18 words each."], "weaknesses": ["3 items. 15-18 words each."], "opportunities": ["3 items. 15-18 words each."], "actions": [{{ "title": "Headline", "target": "Specific metric", "effort": "High|Medium|Low" }}] (Exactly 3 Tactical Actions) }}
"""

def build_performance_roadmap_prompt(
    site_info: dict, google_cur: dict, meta_current: dict
) -> str:
    # [DEPRECATED] Merged into exec prompt.
    return ""

def build_performance_advice_prompt(
    site_info: dict, google_ads_details: dict,
    meta_campaigns: list, meta_adsets: list, meta_devices: list
) -> str:
    g_trimmed = {k: v[:3] for k, v in google_ads_details.items() if isinstance(v, list)}
    return f"""
{ANALYST_TONE}
Generate detailed SECTION ADVICE in JSON.
DATA: G-Ads: {json.dumps(g_trimmed, separators=(',', ':'))} | Meta: {json.dumps(meta_campaigns[:3], separators=(',', ':'))}

Return JSON with EXACT key:
"section_specific_advice": {{
    "kpi_advice": "Exactly 3 statistical sentences as defined in RULES.",
    "campaign_advice": "Exactly 3 statistical sentences.",
    "keyword_advice": "Exactly 3 statistical sentences.",
    "device_advice": "Exactly 3 statistical sentences.",
    "search_term_advice": "Exactly 3 statistical sentences.",
    "demographic_advice": "Exactly 3 statistical sentences.",
    "day_hour_advice": "Exactly 3 statistical sentences.",
    "network_advice": "Exactly 3 statistical sentences.",
    "asset_advice": "Exactly 3 statistical sentences.",
    "meta_kpi_advice": "Exactly 3 statistical sentences.",
    "meta_campaign_advice": "Exactly 3 statistical sentences.",
    "meta_adset_advice": "Exactly 3 statistical sentences.",
    "meta_device_advice": "Exactly 3 statistical sentences."
}}
"""

def build_performance_explanations_prompt(
    site_info: dict, google_ads_details: dict,
    meta_campaigns: list, meta_adsets: list, meta_devices: list
) -> str:
    g_trimmed = {k: v[:3] for k, v in google_ads_details.items() if isinstance(v, list)}
    return f"""
{ANALYST_TONE}
Generate detailed TABLE EXPLANATIONS in JSON.
DATA: G-Ads: {json.dumps(g_trimmed, separators=(',', ':'))} | Meta: {json.dumps(meta_campaigns[:3], separators=(',', ':'))}

Return JSON with EXACT key:
"table_explanations": {{
    "kpi_overview": "Exactly 3 statistical sentences as defined in RULES.",
    "top_campaigns": "Exactly 3 statistical sentences.",
    "top_keywords": "Exactly 3 statistical sentences.",
    "devices": "Exactly 3 statistical sentences.",
    "search_terms": "Exactly 3 statistical sentences.",
    "demographics": "Exactly 3 statistical sentences.",
    "day_hour": "Exactly 3 statistical sentences.",
    "networks": "Exactly 3 statistical sentences.",
    "top_assets": "Exactly 3 statistical sentences.",
    "meta_kpi_overview": "Exactly 3 statistical sentences.",
    "meta_campaigns": "Exactly 3 statistical sentences.",
    "meta_adsets": "Exactly 3 statistical sentences.",
    "meta_devices": "Exactly 3 statistical sentences."
}}
"""

# --- SEO PROMPTS ---

def build_seo_exec_prompt(
    site_info: dict, ga4_totals: dict, gsc_agg: dict, seo_work_details: dict,
    gsc_agg_prev: dict = None,
    top_landing: list = None, prev_top_landing: list = None,
    sessions_by_channel: list = None, prev_sessions_by_channel: list = None,
    geo_users: list = None, prev_geo_users: list = None,
    events_by_event_name: list = None, prev_events_by_event_name: list = None
) -> str:
    matrix_context = ""
    if top_landing: matrix_context += f" | Pages: {json.dumps(top_landing[:3], separators=(',', ':'))}"
    if sessions_by_channel: matrix_context += f" | Channels: {json.dumps(sessions_by_channel[:3], separators=(',', ':'))}"

    return f"""
{ANALYST_TONE}
Generate a detailed Executive SEO Strategy in JSON.
BUSINESS: {site_info.get('name')}
DATA: GSC: {gsc_agg.get('clicks',0)} clicks. GA4: {ga4_totals.get('totalUsers',{}).get('current',0)} users.{matrix_context}

Return JSON with EXACT keys:
1. "summary": "3 sentences. S1: GSC click delta. S2: GA4 user comparison. S3: SEO growth protocol. Each sentence 15-18 words."
2. "insights": ["5 data-packed sentences. Each sentence 15-18 words."]
3. "neural_strategy_markers": [{{ "title": "...", "description": "Exactly 2 sentences. Each sentence 15-18 words.", "target": "SEO Goal", "priority": "...", "impact": "...", "effort": "..." }}] (Exactly 6 items)
4. "ai_comparison": "Exactly 3 statistical sentences. Each sentence 15-18 words."
5. "recommendations_summarized": ["6 headlines."]
6. "slide_descriptions": {{ "meta_titles": "...", "heading_structure": "...", "internal_linking": "...", "content_formatting": "...", "gmb_authority": "...", "gmb_support": "..." }}
7. "improvement_roadmap": {{ "summary": "Data-dense. 15-18 words.", "strengths": ["3 items. 15-18 words each."], "weaknesses": ["3 items. 15-18 words each."], "opportunities": ["3 items. 15-18 words each."], "actions": [{{ "title": "Headline", "target": "Specific metric", "effort": "High|Medium|Low" }}] (Exactly 3 Tactical Actions) }}
"""

def build_seo_roadmap_prompt(
    site_info: dict, ga4_totals: dict, gsc_agg: dict
) -> str:
    # [DEPRECATED] Merged into exec prompt.
    return ""

def build_seo_advice_prompt(
    site_info: dict, top_keywords_full: list, top_page_titles: list,
    sessions_by_channel: list, geo_users: list, events_by_event_name: list
) -> str:
    return f"""
{ANALYST_TONE}
Generate detailed SEO SECTION ADVICE in JSON.
DATA: Keywords: {json.dumps(top_keywords_full[:5], separators=(',', ':'))} | Channels: {json.dumps(sessions_by_channel[:5], separators=(',', ':'))}

Return JSON with EXACT key:
"section_specific_advice": {{
    "kpi_advice": "Exactly 3 statistical sentences as defined in RULES.",
    "country_advice": "Exactly 3 statistical sentences.",
    "demographic_advice": "Exactly 3 statistical sentences.",
    "activity_advice": "Exactly 3 statistical sentences.",
    "timeline_advice": "Exactly 3 statistical sentences.",
    "channel_advice": "Exactly 3 statistical sentences.",
    "event_advice": "Exactly 3 statistical sentences.",
    "platform_advice": "Exactly 3 statistical sentences.",
    "page_title_advice": "Exactly 3 statistical sentences.",
    "keyword_advice": "Exactly 3 statistical sentences."
}}
"""

def build_seo_explanations_prompt(
    site_info: dict, top_keywords_full: list, top_page_titles: list,
    sessions_by_channel: list, geo_users: list
) -> str:
    return f"""
{ANALYST_TONE}
Generate detailed SEO TABLE EXPLANATIONS in JSON.
DATA: Keywords: {json.dumps(top_keywords_full[:5], separators=(',', ':'))} | Channels: {json.dumps(sessions_by_channel[:5], separators=(',', ':'))}

Return JSON with EXACT key:
"table_explanations": {{
    "kpi_overview": "Exactly 3 statistical sentences as defined in RULES.",
    "active_users_by_country": "Exactly 3 statistical sentences.",
    "user_activity_over_time": "Exactly 3 statistical sentences.",
    "sessions_by_channel": "Exactly 3 statistical sentences.",
    "event_count_by_event_name": "Exactly 3 statistical sentences.",
    "key_events_by_platform": "Exactly 3 statistical sentences.",
    "views_by_page_title": "Exactly 3 statistical sentences.",
    "secondary_overview": "Exactly 3 statistical sentences."
}}
"""

def build_competitor_batch_prompt(site_info: dict, competitor_insights: list, site_data: dict = None) -> str:
    c_data = [{"n": c["competitor_name"], "u": c.get("url", ""), "t": c.get("full_text", "")[:1200], "dq": c.get("discovery_query", "Local Search")} for c in competitor_insights]

    site_context = ""
    if site_data:
        site_context = f"OUR SITE DATA: {json.dumps(site_data, separators=(',', ':'))}\n"

    competitor_instruction = "COMPETITORS: " + json.dumps(c_data, separators=(',', ':'))
    if not competitor_insights:
        competitor_instruction = "COMPETITORS: [No specific competitors identified in this scan. Perform a general industry landscape analysis for the region based on the business name and industry.]"

    gap_analysis_instruction = ""
    if site_data:
        gap_analysis_instruction = """
3. "self_gap_analysis": {
    "strengths": ["List 3 internal strengths. 1 sentence each, 15-18 words."],
    "weaknesses": ["List 3 technical gaps. 1 sentence each, 15-18 words."],
    "missed_opportunities": ["List 2 high-value industry niches. 1 sentence each, 15-18 words."],
    "actionable_gaps": ["List 2 immediate tactical moves. 1 sentence each, 15-18 words."]
}
"""

    return f"""
{ANALYST_TONE}
GENERATE COMPETITOR INTELLIGENCE (JSON)
{site_context}{competitor_instruction}

STRICT RULES:
1. For this section, be extremely concise to avoid truncation.
2. Each observation (inferred_actions, strengths, weaknesses) MUST be exactly 2 technical sentences (not 3).
3. If the provided competitor data indicates a '404 Error' or 'Site Down' state, EXCLUDE it from the analysis entirely and do not mention it.
4. Ensure you process ALL valid competitors provided.
5. If NO competitors are provided, focus solely on the 'self_gap_analysis' using general industry benchmarks for {site_info.get('industry', 'the sector')}.

Return JSON with:
1. "competitors": [
    {{
      "name": "...",
      "url": "...",
      "discovery_query": "...",
      "inferred_actions": ["List 2 detailed strategy observations. Each 15-18 words."],
      "strengths": ["List 2 technical strengths. Each 15-18 words."],
      "weaknesses": ["List 2 specific gaps. Each 15-18 words."]
    }}
] (Empty list if no competitors provided)
2. "overall_threat_summary": "Exactly 2 technical sentences naming the biggest industry threat. Each sentence 15-18 words."
{gap_analysis_instruction}

Return ONLY valid JSON.
"""
