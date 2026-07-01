import pandas as pd
import numpy as np

from app.analytics.performance_analytics import format_number, calculate_pct_change

def get_seo_kpis(ga4_cur, ga4_prev=None):
    """
    Returns a list of KpiItem objects for SEO Performance slide.
    ga4_cur can be the full nested dict from fetch_ga4_totals.
    """
    print(f"DEBUG: get_seo_kpis called with ga4_cur keys: {list(ga4_cur.keys()) if ga4_cur else 'None'}")

    metrics = [
        ("Organic Users", "totalUsers", "Globe"),
        ("Organic Sessions", "sessions", "Zap"),
        ("New Users", "newUsers", "User"),
    ]

    # Robust detection of nested structure from fetch_ga4_totals
    def extract_val(data, key, subkey):
        if not data: return 0
        val = data.get(key)
        if isinstance(val, dict):
            res = float(val.get(subkey, 0))
            print(f"DEBUG: extract_val({key}, {subkey}) from dict returned {res}")
            return res
        res = float(val) if subkey == "current" else 0
        print(f"DEBUG: extract_val({key}, {subkey}) from flat returned {res}")
        return res

    results = []
    for label, key, icon in metrics:
        c_val = extract_val(ga4_cur, key, "current")
        # If ga4_prev is not provided, try to extract from ga4_cur (nested case)
        p_val = extract_val(ga4_cur, key, "previous") if ga4_prev is None else extract_val(ga4_prev, key, "current")

        results.append({
            "label": label,
            "value": format_number(c_val),
            "previous": format_number(p_val),
            "change": calculate_pct_change(c_val, p_val),
            "isPositive": calculate_pct_change(c_val, p_val) >= 0,
            "icon": icon
        })

    # Bounce Rate
    br_cur = extract_val(ga4_cur, 'bounceRate', "current")
    br_prev = extract_val(ga4_cur, 'bounceRate', "previous") if ga4_prev is None else extract_val(ga4_prev, 'bounceRate', "current")

    results.append({
        "label": "Bounce Rate",
        "value": f"{br_cur*100:.1f}%" if br_cur < 1 else f"{br_cur:.1f}%", # Handle decimal vs percentage
        "previous": f"{br_prev*100:.1f}%" if br_prev < 1 else f"{br_prev:.1f}%",
        "change": calculate_pct_change(br_cur, br_prev),
        "isPositive": calculate_pct_change(br_cur, br_prev) <= 0,
        "icon": "Activity"
    })

    print(f"DEBUG: get_seo_kpis returning {len(results)} KPIs. First KPI previous: {results[0]['previous']}")
    return results

def analyse_page_titles(top_page_titles):
    if not top_page_titles:
        return {"top_title": "N/A", "top_views": 0, "analysis": "No page title data available."}

    df = pd.DataFrame(top_page_titles)
    # Expecting keys: 'title', 'views'
    if 'title' not in df.columns or 'views' not in df.columns:
        return {"top_title": "N/A", "top_views": 0, "analysis": "Incomplete page title data."}

    top_row = df.loc[df['views'].idxmax()]
    total_views = df['views'].sum()

    return {
        "top_title": top_row['title'],
        "top_views": int(top_row['views']),
        "total_views": int(total_views),
        "analysis": f"The page '{top_row['title']}' is the top performer with {top_row['views']} views, accounting for {round((top_row['views']/total_views)*100, 1)}% of top page traffic."
    }

def analyse_top_keywords(top_keywords):
    if not top_keywords:
        return {"opportunities": "No keyword data available."}

    df = pd.DataFrame(top_keywords)
    # Expecting keys: 'keyword', 'clicks', 'impressions', 'ctr', 'position'
    if 'position' not in df.columns:
        return {"opportunities": "Incomplete keyword position data."}

    # Identify high-opportunity keywords (e.g., position 4-10 with decent impressions)
    opportunities = df[(df['position'] > 3) & (df['position'] <= 10)].sort_values('impressions', ascending=False)

    if opportunities.empty:
        return {"opportunities": "No immediate 'low-hanging fruit' keywords identified in positions 4-10."}

    op_list = opportunities['keyword'].head(3).tolist()
    return {"opportunities": f"High opportunity keywords to push to top 3: {', '.join(op_list)}"}

def analyse_events(events):
    if not events:
        return {"conversion_rate_pct": 0, "form_starts": 0, "form_submits": 0}

    # Standardize event names to lower case for comparison
    event_counts = {e.get('eventName', e.get('event', '')).lower(): int(e.get('count', 0)) for e in events}

    form_starts = event_counts.get('form_start', 0)
    form_submits = event_counts.get('form_submit', 0) or event_counts.get('generate_lead', 0)

    cv_rate = (form_submits / form_starts * 100) if form_starts > 0 else 0

    return {
        "conversion_rate_pct": round(cv_rate, 2),
        "form_starts": form_starts,
        "form_submits": form_submits
    }

def analyse_traffic_trend(daily_ga4):
    if not daily_ga4:
        return "No daily traffic data available."

    df = pd.DataFrame(daily_ga4)
    if 'users' not in df.columns:
        return "Incomplete traffic trend data."

    # Simple growth check
    recent = df['users'].tail(3).mean()
    previous = df['users'].head(3).mean()

    growth = ((recent - previous) / previous * 100) if previous > 0 else 0

    return f"Traffic has shown a {round(growth, 1)}% growth trend comparing the start and end of the period."

def analyse_geography(geo_users):
    if not geo_users:
        return "No geographical data available."

    top_country = geo_users[0].get('country', 'Unknown')
    return f"Primary market identified as {top_country}."

def analyse_channels(sessions_by_channel):
    if not sessions_by_channel:
        return "No channel data available."

    df = pd.DataFrame(sessions_by_channel)
    if 'sessions' not in df.columns:
        return "Incomplete channel session data."

    top_channel = df.loc[df['sessions'].idxmax()]
    return f"The leading acquisition channel is {top_channel.get('channel', 'Unknown')} with {top_channel['sessions']} sessions."
