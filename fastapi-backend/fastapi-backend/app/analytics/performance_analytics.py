import pandas as pd
import math

def format_currency(value):
    if value is None or math.isnan(value) if isinstance(value, float) else False: return "₹0"
    return f"₹{int(value):,}"

def format_number(value):
    if value is None or math.isnan(value) if isinstance(value, float) else False: return "0"
    if value >= 1000:
        return f"{value/1000:.1f}K"
    return str(int(value))

def calculate_pct_change(cur, prev):
    if not prev: return 0
    return round(((cur - prev) / prev) * 100, 1)

def get_ads_kpis(cur, prev, platform="google"):
    """
    Returns a list of KPI objects for Google or Meta Ads slides.
    Each object matches the 'GoogleAdsKpi' or 'MetaAdsKpi' interface in types.ts.
    """
    print(f"DEBUG [{platform.upper()}] cur: {cur}")
    print(f"DEBUG [{platform.upper()}] prev: {prev}")

    if platform == "google":
        metrics = [
            ("Impressions", "impressions", "number"),
            ("Clicks", "clicks", "number"),
            ("Spend", "cost", "currency"),
            ("Leads", "conversions", "number"),
            ("CTR", "ctr", "percent"),
            ("CPL", "cost_per_lead", "currency"),
            ("ROAS", "roas", "multiplier")
        ]
    else: # meta
        metrics = [
            ("Impressions", "impressions", "number"),
            ("Clicks", "clicks", "number"),
            ("Spend", "spend", "currency"),
            ("Leads", "leads", "number"),
            ("CTR", "ctr", "percent"),
            ("CPL", "cost_per_lead", "currency"),
            ("ROAS", "roas", "multiplier")
        ]
        # For Meta, CPL is often not in the aggregate, so we compute it
        if "cost_per_lead" not in cur and cur.get("leads", 0) > 0:
            cur["cost_per_lead"] = float(cur["spend"] or 0) / float(cur["leads"])
        if "cost_per_lead" not in prev and prev.get("leads", 0) > 0:
            prev["cost_per_lead"] = float(prev["spend"] or 0) / float(prev["leads"])

    results = []
    for label, key, unit in metrics:
        c_val = float(cur.get(key, 0) or 0)
        p_val = float(prev.get(key, 0) or 0)
        pct = calculate_pct_change(c_val, p_val)

        is_good = pct >= 0
        if label in ["CPL", "Spend"] and pct > 0:
            is_good = False
        if label in ["CPL", "Spend"] and pct < 0:
            is_good = True

        display_cur = format_number(c_val)
        display_prev = format_number(p_val)

        if unit == "currency":
            display_cur = format_currency(c_val)
            display_prev = format_currency(p_val)
        elif unit == "percent":
            display_cur = f"{c_val:.2f}%"
            display_prev = f"{p_val:.2f}%"
        elif unit == "multiplier":
            display_cur = f"{c_val:.2f}X"
            display_prev = f"{p_val:.2f}X"

        results.append({
            "metric": label,
            "current": display_cur,
            "previous": display_prev,
            "pctChange": pct,
            "isGood": is_good,
            "currentValue": c_val,
            "previousValue": p_val
        })
    return results

def get_overall_performance_kpis(google_cur, google_prev, meta_cur, meta_prev):
    """
    Returns a list of KpiItem objects for the Overall Performance table.
    """
    print(f"DEBUG [OVERALL] g_cur keys: {list(google_cur.keys())}")
    print(f"DEBUG [OVERALL] g_prev keys: {list(google_prev.keys())}")
    print(f"DEBUG [OVERALL] m_cur keys: {list(meta_cur.keys())}")
    print(f"DEBUG [OVERALL] m_prev keys: {list(meta_prev.keys())}")

    g_leads = float(google_cur.get('conversions', 0) or 0)
    m_leads = float(meta_cur.get('leads', 0) or meta_cur.get('conversions', 0) or 0)
    total_leads = g_leads + m_leads

    pg_leads = float(google_prev.get('conversions', 0) or 0)
    pm_leads = float(meta_prev.get('leads', 0) or meta_prev.get('conversions', 0) or 0)
    ptotal_leads = pg_leads + pm_leads
    print(f"DEBUG [OVERALL] Leads - Cur: {total_leads} (G:{g_leads}, M:{m_leads}) Prev: {ptotal_leads} (G:{pg_leads}, M:{pm_leads})")

    g_spend = float(google_cur.get('cost', 0) or 0)
    m_spend = float(meta_cur.get('spend', 0) or 0)
    total_spend = g_spend + m_spend

    pg_spend = float(google_prev.get('cost', 0) or 0)
    pm_spend = float(meta_prev.get('spend', 0) or 0)
    ptotal_spend = pg_spend + pm_spend
    print(f"DEBUG [OVERALL] Spend - Cur: {total_spend} Prev: {ptotal_spend}")

    cpl = (total_spend / total_leads) if total_leads > 0 else 0
    pcpl = (ptotal_spend / ptotal_leads) if ptotal_leads > 0 else 0

    combined_ctr = (float(google_cur.get('ctr', 0) or 0) + float(meta_cur.get('ctr', 0) or 0)) / 2
    pcombined_ctr = (float(google_prev.get('ctr', 0) or 0) + float(meta_prev.get('ctr', 0) or 0)) / 2

    kpis = [
        {
            "label": "Total Leads",
            "value": format_number(total_leads),
            "previous": format_number(ptotal_leads),
            "change": calculate_pct_change(total_leads, ptotal_leads),
            "isPositive": calculate_pct_change(total_leads, ptotal_leads) >= 0,
            "icon": "Target"
        },
        {
            "label": "Total Spend",
            "value": format_currency(total_spend),
            "previous": format_currency(ptotal_spend),
            "change": calculate_pct_change(total_spend, ptotal_spend),
            "isPositive": calculate_pct_change(total_spend, ptotal_spend) <= 0,
            "icon": "Zap"
        },
        {
            "label": "Avg. CPL",
            "value": format_currency(cpl),
            "previous": format_currency(pcpl),
            "change": calculate_pct_change(cpl, pcpl),
            "isPositive": calculate_pct_change(cpl, pcpl) <= 0,
            "icon": "MousePointer2"
        },
        {
            "label": "Combined CTR",
            "value": f"{combined_ctr:.2f}%",
            "previous": f"{pcombined_ctr:.2f}%",
            "change": calculate_pct_change(combined_ctr, pcombined_ctr),
            "isPositive": calculate_pct_change(combined_ctr, pcombined_ctr) >= 0,
            "icon": "TrendingUp"
        }
    ]
    return kpis

def format_campaign_data(campaigns, platform="google"):
    """
    Formats campaign list for the frontend tables.
    """
    formatted = []
    for c in campaigns:
        if platform == "google":
            leads = c.get("conversions", 0)
            cost = c.get("cost", 0)
            cpl = cost / leads if leads > 0 else 0
            formatted.append({
                "campaign": c.get("campaign", "Unknown"),
                "status": c.get("status", "N/A"),
                "cost": format_currency(cost),
                "leads": int(leads),
                "costPerLead": format_currency(cpl),
                "clicks": c.get("clicks", 0),
                "impressions": c.get("impressions", 0)
            })
        else: # meta
            leads = c.get("leads", 0)
            cost = c.get("spend", 0)
            cpl = cost / leads if leads > 0 else 0
            formatted.append({
                "campaign": c.get("campaign", "Unknown"),
                "status": c.get("status", "N/A"),
                "cost": format_currency(cost),
                "leads": int(leads),
                "costPerLead": format_currency(cpl),
                "clicks": c.get("clicks", 0),
                "impressions": c.get("impressions", 0)
            })
    return formatted

def analyse_performance_kpis(google_ads_cur, meta_ads_cur, google_ads_prev=None, meta_ads_prev=None):
    if google_ads_prev is None: google_ads_prev = {}
    if meta_ads_prev is None: meta_ads_prev = {}

    g_leads = float(google_ads_cur.get('conversions', 0) or 0)
    m_leads = float(meta_ads_cur.get('leads', 0) or meta_ads_cur.get('conversions', 0) or 0)
    total_leads = g_leads + m_leads

    g_spend = float(google_ads_cur.get('cost', 0) or 0)
    m_spend = float(meta_ads_cur.get('spend', 0) or 0)
    total_spend = g_spend + m_spend

    cpl = (total_spend / total_leads) if total_leads > 0 else 0

    analysis = {
        "total_leads": total_leads,
        "total_spend": round(total_spend, 2),
        "combined_cpl": round(cpl, 2),
        "google_share": round((g_leads / total_leads * 100), 1) if total_leads > 0 else 0
    }

    # Add new formatted KPIs for the presentation
    analysis["overall_kpis"] = get_overall_performance_kpis(google_ads_cur, google_ads_prev, meta_ads_cur, meta_ads_prev)
    analysis["google_ads_kpis"] = get_ads_kpis(google_ads_cur, google_ads_prev, platform="google")
    analysis["meta_ads_kpis"] = get_ads_kpis(meta_ads_cur, meta_ads_prev, platform="meta")

    return analysis

def analyse_campaign_efficiency(top_campaigns):
    if not top_campaigns:
        return "No campaign data available."

    df = pd.DataFrame(top_campaigns)
    # Expecting: 'campaign', 'cost', 'conversions' (for Google) or 'spend', 'leads' (for Meta)
    # The worker might pass different keys. Let's handle both.

    if 'conversions' in df.columns: # Google
        df['leads'] = df['conversions']
        df['costValue'] = df['cost']
    elif 'spend' in df.columns: # Meta
        df['costValue'] = df['spend']
        # 'leads' is already there usually

    if 'leads' not in df.columns or 'costValue' not in df.columns:
        return "Incomplete campaign efficiency data."

    df['cpl'] = df.apply(lambda x: x['costValue'] / x['leads'] if x['leads'] > 0 else x['costValue'], axis=1)
    best_cpl_row = df[df['leads'] > 0].sort_values('cpl').head(1)

    if best_cpl_row.empty:
        return "No campaigns with leads identified."

    return f"Campaign '{best_cpl_row.iloc[0]['campaign']}' is most efficient with a CPL of ₹{round(best_cpl_row.iloc[0]['cpl'], 2)}."

def compute_performance_self_radar(google_ads_cur, meta_ads_cur, ga4_totals):
    """
    Computes performance scores (0-100) using GAds, Meta Ads, and GA4 data.
    """
    scores = {}

    # 1. Combined Spend Efficiency (Normalized CPL)
    g_spend = google_ads_cur.get('cost', 0)
    m_spend = meta_ads_cur.get('spend', 0)
    total_spend = g_spend + m_spend

    g_leads = google_ads_cur.get('conversions', 0)
    m_leads = meta_ads_cur.get('leads', 0)
    total_leads = g_leads + m_leads

    cpl = (total_spend / total_leads) if total_leads > 0 else 2000
    scores["Spend Efficiency"] = min(100, max(0, int(100 - (cpl / 25))))

    # 2. Combined Ad CTR (Average of GAds and Meta)
    # Target: 5% combined CTR = 100 score
    g_ctr = float(google_ads_cur.get('ctr', 0))
    m_ctr = float(meta_ads_cur.get('ctr', 0))

    if g_ctr > 0 and m_ctr > 0:
        avg_ctr = (g_ctr + m_ctr) / 2
    else:
        avg_ctr = max(g_ctr, m_ctr)

    scores["Ad CTR"] = min(100, int(avg_ctr * 20)) # Fixed scale: 5% * 20 = 100

    # 3. Lead Quality (Based on GA4 Bounce Rate)
    # Lower bounce rate = higher quality sessions
    bounce_rate = 0.5 # Default
    if isinstance(ga4_totals, dict) and 'bounceRate' in ga4_totals:
        br_data = ga4_totals['bounceRate']
        if isinstance(br_data, dict):
            bounce_rate = br_data.get('current', 0.5)
        else:
            bounce_rate = float(br_data)

    scores["Lead Quality"] = min(100, max(0, int((1 - bounce_rate) * 100)))

    # 4. Conversion Volume (Relative to 150 total leads = 100 score)
    scores["Conversion Scale"] = min(100, int((total_leads / 150) * 100))

    # 5. Mobile Optimization (Placeholder or GA4 device data if available)
    scores["Mobile Dominance"] = 85

    return scores
