def compute_self_radar_scores(ga4_totals, gsc_agg, events, channels):
    """
    Computes a 0-100 score for 5 SEO/Business dimensions.
    """
    scores = {}

    # 1. Traffic Strength (GA4 Users relative to some baseline - e.g. 5000 users = 100)
    users = ga4_totals.get('totalUsers', {}).get('current', 0)
    scores["Traffic Volume"] = min(100, int((users / 5000) * 100))

    # 2. Search Visibility (GSC Impressions relative to 50k = 100)
    impr = gsc_agg.get('impressions', 0)
    scores["Search Visibility"] = min(100, int((impr / 50000) * 100))

    # 3. Conversion Efficiency (Based on Event conversion rate)
    # Mapping 0-10% CR to 0-100 score
    event_counts = {e.get('eventName', e.get('event', '')).lower(): int(e.get('count', 0)) for e in events}
    form_starts = event_counts.get('form_start', 0)
    form_submits = event_counts.get('form_submit', 0) or event_counts.get('generate_lead', 0)
    cr = (form_submits / form_starts * 10) if form_starts > 0 else 0 # Normalized
    scores["Conversion Rate"] = min(100, int(cr * 10))

    # 4. Organic Authority (Share of Organic Search sessions)
    total_sessions = sum(int(c.get('sessions', 0)) for c in channels)
    organic_sessions = sum(int(c.get('sessions', 0)) for c in channels if 'organic' in c.get('channel', '').lower())
    org_share = (organic_sessions / total_sessions * 100) if total_sessions > 0 else 0
    scores["Organic Authority"] = int(org_share)

    # 5. Engagement (Average Session Duration normalized to 4 mins = 100)
    # Assuming duration in seconds
    avg_duration = ga4_totals.get('averageSessionDuration', {}).get('current', 0)
    scores["Engagement Depth"] = min(100, int((avg_duration / 240) * 100))

    return scores
