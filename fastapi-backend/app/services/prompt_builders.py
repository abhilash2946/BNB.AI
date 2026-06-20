import json

# --- GLOBAL TONE ---
ANALYST_TONE = """
You are a Senior Marketing Data Analyst writing an internal memo for C-level executives.
Your rules:
1. NO FLUFF: Every insight must contain a specific metric AND the reason it changed.
2. BALANCED DEPTH: Write exactly 2-3 concise, data-packed sentences per field (approx 40-60 words total).
3. STRUCTURE: Sentence 1 = The observation/diagnosis with numbers. Sentence 2 (and 3) = The recommended action and expected outcome.
4. ACTIONABLE: Recommendations must start with a verb and include a target metric.
"""

# --- PERFORMANCE PROMPTS ---

def build_performance_exec_prompt(
    site_info: dict,
    google_cur: dict,
    google_prev: dict,
    google_ads_details: dict,
    meta_current: dict,
    meta_previous: dict,
    ga4_totals: dict,
    perf_kpi_analysis: dict,
    campaign_eff_analysis: str,
) -> str:
    return f"""
{ANALYST_TONE}
Generate an Executive Strategy Report in JSON.

BUSINESS: {site_info.get('name')} ({site_info.get('url')})
INDUSTRY: {site_info.get('industry', 'General')}

DATA SUMMARY:
- Google Ads: ₹{google_cur.get('cost',0):.2f} spend, {google_cur.get('conversions',0)} leads.
- Meta Ads: ₹{meta_current.get('spend',0):.2f} spend, {meta_current.get('leads',0)} leads.
- GA4: {ga4_totals.get('totalUsers',{}).get('current',0)} users.
- Combined CPL: ₹{perf_kpi_analysis.get('combined_cpl')}
- Campaign Efficiency: {campaign_eff_analysis}

Return a JSON object with these EXACT keys:
1. "summary": "A single, hard-hitting sentence that captures the biggest performance story with a number."
2. "insights": ["List of 5-7 observations, each exactly 2 sentences (diagnosis + implication)."]
3. "recommendations": ["List of 8-12 action items, each exactly 2 sentences (action + expected metric outcome)."]
4. "recommendations_summarized": ["Shorter versions (under 10 words) for slide headlines."]
5. "top_keywords_overview": "A 2-sentence analysis. Sentence 1: State the top 1-2 keywords with their exact metrics (clicks/CTR). Sentence 2: Explain how to leverage them (e.g., 'Expand these into long-tail variants to capture additional 15% of search volume.')."
6. "slide_descriptions": {{
    "meta_titles": "Advice on meta titles based on ad performance.",
    "heading_structure": "Advice on landing page heading structure.",
    "internal_linking": "Strategy for internal linking.",
    "content_formatting": "How to improve content formatting for conversions.",
    "gmb_authority": "Strategy to increase GBP authority.",
    "gmb_support": "How to leverage GBP for better ads performance."
}}
7. "improvement_roadmap": {{
    "summary": "One-sentence strategic overview of growth plan.",
    "strengths": ["List of 3-5 short phrases of current strengths."],
    "weaknesses": ["List of 3-5 short phrases of areas needing improvement."],
    "opportunities": ["List of 3-5 short phrases of growth opportunities."],
    "actions": [{{ "title": "Verb + Object", "target": "Metric Goal", "effort": "Low|Medium|High" }}]
}}
8. "self_gap_analysis": {{
    "strengths": ["List of 3-5 strengths. Each must be a full sentence (1-2 sentences) that includes a specific metric and explains why it matters. Example: 'Organic traffic grew 12% to 23K users, indicating strong content resonance – continue publishing high-intent blogs to sustain this momentum.'"],
    "weaknesses": ["List of 3-5 weaknesses. Each must be a full sentence (1-2 sentences) naming the specific gap, its current metric, and its business impact. Example: 'GSC CTR dropped 0.5% to 2.1%, far below the 4% benchmark – rewrite meta descriptions for the top 10 landing pages to improve click-through.'"],
    "missed_opportunities": ["List of 3-5 missed opportunities. Each must be a full sentence (1-2 sentences) describing the untapped area and the potential gain. Example: 'Branded keywords like \"Hyderabad tour packages\" drive 400+ clicks – expand into 10 long-tail variants to capture an additional 15% of search volume.'"],
    "actionable_gaps": ["List of 3-5 actionable gaps. Each must be a full sentence (1-2 sentences) stating the specific action, target metric, and timeline. Example: 'Implement schema markup on 5 key service pages within 14 days to improve rich snippet visibility and boost CTR by 10%.'"]
}}

Return ONLY valid JSON.
"""

def build_performance_deep_dive_prompt(
    site_info: dict,
    google_cur: dict,
    google_prev: dict,
    google_ads_details: dict,
    meta_current: dict,
    meta_campaigns: list,
    meta_adsets: list,
    meta_devices: list,
    ga4_totals: dict,
    gbp_details: dict,
) -> str:
    return f"""
{ANALYST_TONE}
Generate Detailed Table Explanations and Section Advice in JSON.

BUSINESS: {site_info.get('name')}

DATA:
- Google Ads Granular: {json.dumps(google_ads_details, indent=2)}
- Meta Ads Granular: {json.dumps({"campaigns": meta_campaigns, "adsets": meta_adsets, "devices": meta_devices}, indent=2)}
- GBP: {json.dumps(gbp_details.get('aggregated', {}), indent=2)}

INSTRUCTIONS:
- Every "advice" field MUST be exactly 2-3 sentences (approx 40-60 words total).
  * Sentence 1: State the performance trend with a specific number and comparison (e.g., "Mobile CTR dropped 0.5% to 2.1% vs desktop 4.2%.").
  * Sentence 2: Prescribe a concrete action with a measurable goal (e.g., "Pause low-performing mobile placements and reallocate 15% budget to tablet campaigns to improve overall ROI.").
- Every "table_explanations" field MUST be exactly 2 sentences:
  * Sentence 1: State the most important metric from the table with its exact value (e.g., "India accounts for 17,378 users, making up 95% of total traffic.").
  * Sentence 2: Explain why that metric matters for strategy (e.g., "This concentration signals a need for hyper-local SEO in Hyderabad to further grow the dominant segment.").
- Do NOT use generic phrases like "improve" or "optimize" without a target.
- Always include the "Delta" (change %) to explain WHY the number matters.

Return a JSON object with these EXACT keys:
1. "section_specific_advice": {{
    "kpi_advice": "...", "campaign_advice": "...", "keyword_advice": "...", "device_advice": "...",
    "search_term_advice": "...", "demographic_advice": "...", "day_hour_advice": "...",
    "network_advice": "...", "asset_advice": "...", "meta_kpi_advice": "...",
    "meta_campaign_advice": "...", "meta_adset_advice": "...", "meta_device_advice": "..."
}}
2. "table_explanations": {{
    "kpi_overview": "...", "top_campaigns": "...", "top_keywords": "...", "devices": "...",
    "search_terms": "...", "demographics": "...", "day_hour": "...", "networks": "...",
    "top_assets": "...", "meta_kpi_overview": "...", "meta_campaigns": "...",
    "meta_adsets": "...", "meta_devices": "..."
}}

Return ONLY valid JSON.
"""

# --- SEO PROMPTS ---

def build_seo_exec_prompt(
    site_info: dict,
    ga4_totals: dict,
    gsc_agg: dict,
    seo_work_details: dict,
    cwv_data: dict,
    page_analysis: dict,
    keyword_analysis: dict,
    traffic_trend: str,
    event_analysis: dict
) -> str:
    return f"""
{ANALYST_TONE}
Generate an Executive SEO Strategy Report in JSON.

BUSINESS: {site_info.get('name')} ({site_info.get('url')})

DATA SUMMARY:
- GSC: {gsc_agg.get('clicks',0)} clicks, {gsc_agg.get('ctr',0):.2%} CTR, {gsc_agg.get('position',0):.1f} avg pos.
- GA4: {ga4_totals.get('totalUsers',{}).get('current',0)} users.
- SEO Work: {json.dumps(seo_work_details)}
- CWV: {json.dumps(cwv_data)}
- Conversion: {event_analysis.get('conversion_rate_pct')}%

Return a JSON object with these EXACT keys:
1. "summary": "A single, hard-hitting sentence that captures the biggest performance story with a number."
2. "insights": ["List of 5-7 observations, each exactly 2 sentences (diagnosis + implication)."]
3. "recommendations": ["List of 8-12 action items, each exactly 2 sentences (action + expected metric outcome)."]
4. "recommendations_summarized": ["Shorter versions (under 10 words) for slide headlines."]
5. "top_keywords_overview": "A 2-sentence analysis. Sentence 1: State the top 1-2 keywords with their exact metrics (clicks/CTR). Sentence 2: Explain how to leverage them (e.g., 'Expand these into long-tail variants to capture additional 15% of search volume.')."
6. "slide_descriptions": {{
    "meta_titles": "Advice on meta titles.",
    "heading_structure": "Advice on heading structure.",
    "internal_linking": "Strategy for internal linking.",
    "content_formatting": "How to improve content formatting.",
    "gmb_authority": "Strategy to increase GBP authority.",
    "gmb_support": "How to leverage GBP for SEO."
}}
7. "improvement_roadmap": {{
    "summary": "One-sentence strategic overview.",
    "strengths": ["Short phrases of current SEO strengths."],
    "weaknesses": ["Short phrases of technical or content gaps."],
    "opportunities": ["Short phrases of growth opportunities."],
    "actions": [{{ "title": "Verb + Action", "target": "SEO Goal", "effort": "Low|Medium|High" }}]
}}
8. "self_gap_analysis": {{
    "strengths": ["List of 3-5 strengths. Each must be a full sentence (1-2 sentences) that includes a specific metric and explains why it matters. Example: 'Organic traffic grew 12% to 23K users, indicating strong content resonance – continue publishing high-intent blogs to sustain this momentum.'"],
    "weaknesses": ["List of 3-5 weaknesses. Each must be a full sentence (1-2 sentences) naming the specific gap, its current metric, and its business impact. Example: 'GSC CTR dropped 0.5% to 2.1%, far below the 4% benchmark – rewrite meta descriptions for the top 10 landing pages to improve click-through.'"],
    "missed_opportunities": ["List of 3-5 missed opportunities. Each must be a full sentence (1-2 sentences) describing the untapped area and the potential gain. Example: 'Branded keywords like \"Hyderabad tour packages\" drive 400+ clicks – expand into 10 long-tail variants to capture an additional 15% of search volume.'"],
    "actionable_gaps": ["List of 3-5 actionable gaps. Each must be a full sentence (1-2 sentences) stating the specific action, target metric, and timeline. Example: 'Implement schema markup on 5 key service pages within 14 days to improve rich snippet visibility and boost CTR by 10%.'"]
}}

Return ONLY valid JSON.
"""

def build_seo_deep_dive_prompt(
    site_info: dict,
    ga4_totals: dict,
    geo_users: list,
    daily_ga4: list,
    sessions_by_channel: list,
    events_by_event_name: list,
    key_events_by_platform: list,
    gsc_agg: dict,
    top_keywords_full: list,
    top_page_titles: list,
    gbp_details: dict,
) -> str:
    return f"""
{ANALYST_TONE}
Generate Detailed SEO Table Explanations and Section Advice in JSON.

BUSINESS: {site_info.get('name')}

DATA:
- GSC Keywords: {json.dumps(top_keywords_full[:15], indent=2)}
- GSC Page Titles: {json.dumps(top_page_titles[:15], indent=2)}
- GA4 Channels: {json.dumps(sessions_by_channel[:10], indent=2)}
- GA4 Geo: {json.dumps(geo_users[:10], indent=2)}
- GA4 Events: {json.dumps(events_by_event_name[:10], indent=2)}
- GBP: {json.dumps(gbp_details.get('aggregated', {}), indent=2)}

INSTRUCTIONS:
- Every "advice" field MUST be exactly 2-3 sentences (approx 40-60 words total).
  * Sentence 1: Diagnose the issue with a specific number (e.g., "GSC clicks dropped 15% to 850, while impressions stayed flat, indicating a CTR problem.").
  * Sentence 2: Recommend a specific fix with a target (e.g., "Rewrite meta descriptions for the top 5 landing pages to boost CTR by 5% within 30 days.").
- Every "table_explanations" field MUST be exactly 2 sentences:
  * Sentence 1: State the most important metric from the table with its exact value (e.g., "India accounts for 17,378 users, making up 95% of total traffic.").
  * Sentence 2: Explain why that metric matters for strategy (e.g., "This concentration signals a need for hyper-local SEO in Hyderabad to further grow the dominant segment.").
- Use exact values from data (e.g., "12.5% CTR", "85 conversions").

Return a JSON object with these EXACT keys:
1. "section_specific_advice": {{
    "kpi_advice": "...", "country_advice": "...", "demographic_advice": "...",
    "activity_advice": "...", "timeline_advice": "...", "channel_advice": "...",
    "event_advice": "...", "platform_advice": "...", "page_title_advice": "...",
    "keyword_advice": "..."
}}
2. "table_explanations": {{
    "kpi_overview": "...", "active_users_by_country": "...", "user_activity_over_time": "...",
    "sessions_by_channel": "...", "event_count_by_event_name": "...", "key_events_by_platform": "...",
    "views_by_page_title": "...", "secondary_overview": "..."
}}

Return ONLY valid JSON.
"""

def build_competitor_batch_prompt(site_info: dict, competitor_insights: list) -> str:
    competitors_data = []
    for c in competitor_insights:
        competitors_data.append({
            "name": c["competitor_name"],
            "url": c.get("url", ""),
            "homepage_text": c.get("full_text", "")[:3000]
        })

    return f"""
{ANALYST_TONE}
GENERATE COMPETITOR INTELLIGENCE (JSON)
Business: {site_info.get('name')}

COMPETITORS:
{json.dumps(competitors_data, indent=2)}

Return a JSON object with:
1. "competitors": list of objects with "name", "url", "inferred_actions" (list of short phrases), "strengths" (list of short phrases), "weaknesses" (list of short phrases).
2. "overall_threat_summary": A 2-sentence paragraph naming the biggest threat. Sentence 1: State the competitor and their specific advantage (with a metric if available). Sentence 2: Explain the direct impact on your business and a countermeasure.

Return ONLY valid JSON.
"""
